/**
 * Основной модуль терминальной интеграции с Claude Code
 * ClaudeCodeBridge - Кластерная модульная архитектура
 */

import * as vscode from 'vscode';
import { 
    ITerminalIntegration, 
    ITerminalStrategy, 
    ITerminalConfig,
    TerminalState, 
    TerminalStateData 
} from '../interfaces/ITerminalIntegration';
import { ShellIntegrationStrategy } from './strategies/ShellIntegrationStrategy';
import { SendTextStrategy } from './strategies/SendTextStrategy';

/**
 * Модуль терминальной интеграции
 */
export class TerminalIntegrationModule implements ITerminalIntegration {
    private terminal?: vscode.Terminal;
    private currentStrategy?: ITerminalStrategy;
    private strategies: ITerminalStrategy[] = [];
    private config: ITerminalConfig;
    private state: TerminalState = TerminalState.INACTIVE;
    private outputCallbacks: ((data: string) => void)[] = [];
    private rawOutputCallbacks: ((data: string) => void)[] = [];
    private stateCallbacks: ((state: TerminalState) => void)[] = [];
    private disposables: vscode.Disposable[] = [];

    constructor(config: Partial<ITerminalConfig> = {}) {
        this.config = {
            terminalName: 'Claude Code Bridge',
            shellIntegrationTimeout: 10000,
            claudeCommand: 'claude',
            autoStartClaude: true,
            useFallback: true,
            ...config
        };

        this.initializeStrategies();
    }

    /**
     * Инициализация доступных стратегий
     */
    private initializeStrategies(): void {
        this.strategies = [
            new ShellIntegrationStrategy(),
            new SendTextStrategy()
        ];

        // Сортируем по приоритету (выше = лучше)
        this.strategies.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Инициализация модуля
     */
    async initialize(): Promise<void> {
        try {
            this.setState(TerminalState.INITIALIZING);

            // Создаем терминал
            await this.createTerminal();

            // Выбираем стратегию
            await this.selectBestStrategy();

        } catch (error) {
            this.setState(TerminalState.ERROR, `Initialization failed: ${error}`);
            throw error;
        }
    }

    /**
     * Создание терминала
     */
    private async createTerminal(): Promise<void> {
        this.terminal = vscode.window.createTerminal({
            name: this.config.terminalName,
            cwd: this.config.cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            env: {
                ...process.env,
                // Добавляем метаданные для идентификации
                CLAUDE_CODE_BRIDGE: 'true',
                CLAUDE_CODE_BRIDGE_VERSION: '1.0.0'
            }
        });

        if (!this.terminal) {
            throw new Error('Failed to create terminal');
        }

    }

    /**
     * Выбор лучшей доступной стратегии
     */
    private async selectBestStrategy(): Promise<void> {
        if (!this.terminal) {
            throw new Error('Terminal not created');
        }


        for (const strategy of this.strategies) {
            try {
                
                const isAvailable = await strategy.isAvailable(this.terminal);
                
                if (isAvailable) {
                    this.currentStrategy = strategy;
                    
                    // Настраиваем подписку на вывод
                    const disposable = strategy.subscribeToOutput(
                        this.terminal, 
                        (data) => this.handleOutput(data)
                    );
                    this.disposables.push(disposable);
                    
                    return;
                }
                
            } catch (error) {
                continue;
            }
        }

        throw new Error('No suitable terminal strategy found');
    }

    /**
     * Запуск Claude Code
     */
    async startClaude(): Promise<void> {
        if (!this.terminal || !this.currentStrategy) {
            throw new Error('Terminal integration not initialized');
        }

        try {
            this.setState(TerminalState.STARTING_CLAUDE);

            // Показываем терминал
            this.terminal.show();

            // Отправляем команду запуска Claude
            await this.currentStrategy.sendCommand(this.terminal, this.config.claudeCommand);
            
            // Даем время на запуск Claude
            await this.waitForClaudeReady();

            this.setState(TerminalState.CLAUDE_READY);

        } catch (error) {
            this.setState(TerminalState.ERROR, `Failed to start Claude: ${error}`);
            throw error;
        }
    }

    /**
     * Ожидание готовности Claude
     */
    private async waitForClaudeReady(timeout: number = 15000): Promise<void> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Claude startup timeout'));
            }, timeout);

            // Ищем признаки готовности Claude в выводе
            const checkReady = (data: string) => {
                // Ищем типичные промпты Claude Code
                if (data.includes('claude') || 
                    data.includes('Welcome') || 
                    data.includes('How can I help') ||
                    data.includes('> ')) {
                    clearTimeout(timer);
                    resolve();
                }
            };

            // Временно подписываемся на RAW вывод для проверки готовности (до фильтрации)
            this.rawOutputCallbacks.push(checkReady);

            // Очищаем обработчик через таймаут
            setTimeout(() => {
                const index = this.rawOutputCallbacks.indexOf(checkReady);
                if (index > -1) {
                    this.rawOutputCallbacks.splice(index, 1);
                }
            }, timeout);
        });
    }

    /**
     * Отправка сообщения в Claude
     */
    async sendMessage(message: string): Promise<void> {
        if (!this.terminal || !this.currentStrategy) {
            throw new Error('Terminal integration not ready');
        }

        if (this.state !== TerminalState.CLAUDE_READY) {
            throw new Error(`Claude not ready. Current state: ${this.state}`);
        }

        try {
            this.setState(TerminalState.CLAUDE_PROCESSING);

            await this.currentStrategy.sendCommand(this.terminal, message);

            // Возвращаемся в состояние готовности после небольшой задержки
            setTimeout(() => {
                if (this.state === TerminalState.CLAUDE_PROCESSING) {
                    this.setState(TerminalState.CLAUDE_READY);
                }
            }, 1000);

        } catch (error) {
            this.setState(TerminalState.ERROR, `Failed to send message: ${error}`);
            throw error;
        }
    }

    /**
     * Подписка на вывод
     */
    onOutput(callback: (data: string) => void): void {
        this.outputCallbacks.push(callback);
    }

    /**
     * Подписка на изменение состояния
     */
    onStateChange(callback: (state: TerminalState) => void): void {
        this.stateCallbacks.push(callback);
    }

    /**
     * Очистка ANSI escape sequences из вывода
     */
    private cleanAnsiSequences(text: string): string {
        // Удаляем ANSI escape sequences и все служебные элементы
        return text
            .replace(/\x1b\[[0-9;]*[mGKHJf]/g, '') // Основные ANSI коды
            .replace(/\x1b\[[\d;]*[A-Za-z]/g, '')  // Курсор и позиционирование
            .replace(/\x1b\[[?]\d+[hl]/g, '')      // Режимы
            .replace(/\x1b\[\d+[ABCD]/g, '')       // Движение курсора
            .replace(/\x1b\[\d*K/g, '')            // Очистка строки
            .replace(/\x1b\[\d*J/g, '')            // Очистка экрана
            .replace(/\x1b\[[0-9;]*[GKf]/g, '')    // Позиционирование
            .replace(/\[\d+[mK]/g, '')             // Простые последовательности
            .replace(/\[2K/g, '')                  // Очистка строки
            .replace(/\[\d+;\d+;\d+m/g, '')        // RGB цвета
            .replace(/\x1b\([B0]/g, '')            // Наборы символов
            .replace(/]633;[A-Z]/g, '')            // Shell integration codes
            .replace(/[╭╮╯╰│─┌┐└┘├┤┬┴┼]/g, '')     // Box drawing characters
            .replace(/[◯●○◉◎]/g, '')               // Circle indicators
            .replace(/\s*\?\s*for shortcuts\s*/g, '') // Shortcuts hints
            .replace(/※.*$/gm, '')                 // Tip markers
            .replace(/IDE\s+(dis)?connected/g, '') // Connection status
            .replace(/Welcome to Claude Code!/g, '') // Welcome messages
            .replace(/\/help for help.*$/gm, '')   // Help hints
            .replace(/cwd:\s*[^\n]+/g, '')         // Current directory
            .replace(/Try "edit.*to\.\.\."/g, '')  // Edit suggestions
            .replace(/Try "fix lint errors"/g, '') // Lint suggestions
            .replace(/>\s*Try ".*"/g, '')          // All Try suggestions
            .replace(/Claude \w+ \d+ limit reached.*$/gm, '') // Model limit messages
            .replace(/Cmd\+Escape to launch.*$/gm, '') // Launch hints
            .replace(/❌.*Failed to start Claude.*$/gm, '') // Error messages
            .replace(/\[Bridge\] State:.*$/gm, '')  // Bridge state messages
            .replace(/Error: Claude startup timeout/g, '') // Timeout errors
            .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Управляющие символы
            .replace(/^\s*$/gm, '')                // Пустые строки
            .trim();
    }

    /**
     * Обработка вывода терминала
     */
    private handleOutput(data: string): void {
        // СНАЧАЛА передаем RAW данные специальным подписчикам (для проверки готовности)
        this.rawOutputCallbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in raw output callback:', error);
            }
        });

        // Очищаем ANSI последовательности для чистого вывода
        const cleanData = this.cleanAnsiSequences(data);
        
        // Пропускаем пустые строки после очистки
        if (!cleanData) {
            return;
        }

        // Передаем очищенные данные обычным подписчикам
        this.outputCallbacks.forEach(callback => {
            try {
                callback(cleanData);
            } catch (error) {
                console.error('Error in output callback:', error);
            }
        });
    }

    /**
     * Логирование в вывод
     */
    private logOutput(message: string): void {
        this.handleOutput(`[Bridge] ${message}`);
    }

    /**
     * Установка состояния
     */
    private setState(newState: TerminalState, message?: string): void {
        this.state = newState;
        
        // Уведомляем подписчиков
        this.stateCallbacks.forEach(callback => {
            try {
                callback(newState);
            } catch (error) {
                console.error('Error in state callback:', error);
            }
        });

        // Убираем логирование состояний - информация не нужна пользователю
        // if (message) {
        //     this.logOutput(`State: ${newState} - ${message}\n`);
        // }
    }

    /**
     * Получение текущего состояния
     */
    getState(): TerminalState {
        return this.state;
    }

    /**
     * Получение информации о текущей стратегии
     */
    getCurrentStrategyInfo(): { name: string; priority: number } | null {
        return this.currentStrategy ? {
            name: this.currentStrategy.name,
            priority: this.currentStrategy.priority
        } : null;
    }

    /**
     * Диагностика состояния модуля
     */
    async diagnose(): Promise<{
        state: TerminalState;
        strategy: string | null;
        terminalActive: boolean;
        issues: string[];
    }> {
        const issues: string[] = [];

        // Проверяем терминал
        const terminalActive = this.terminal ? 
            vscode.window.terminals.includes(this.terminal) : false;
        
        if (!terminalActive) {
            issues.push('Terminal is not active');
        }

        // Проверяем стратегию
        if (!this.currentStrategy) {
            issues.push('No strategy selected');
        }

        return {
            state: this.state,
            strategy: this.currentStrategy?.name || null,
            terminalActive,
            issues
        };
    }

    /**
     * Завершение работы модуля
     */
    dispose(): void {

        // Очищаем все подписки
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];

        // Очищаем коллбэки
        this.outputCallbacks = [];
        this.stateCallbacks = [];

        // Закрываем терминал (опционально)
        // this.terminal?.dispose();

        this.setState(TerminalState.INACTIVE);
    }
}