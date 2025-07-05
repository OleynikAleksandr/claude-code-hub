/**
 * Менеджер Shell Integration для работы с терминалом VS Code
 * ClaudeCodeBridge - Модульная архитектура
 */

import * as vscode from 'vscode';
import { 
    IShellIntegrationManager, 
    ICommandExecution,
    TerminalState 
} from '../interfaces/ITerminalIntegration';

/**
 * Реализация выполнения команды через Shell Integration
 */
export class CommandExecution implements ICommandExecution {
    public readonly execution: vscode.TerminalShellExecution;
    private _outputStream?: AsyncIterable<string>;
    private _completionPromise?: Promise<number>;

    constructor(execution: vscode.TerminalShellExecution) {
        this.execution = execution;
    }

    readOutput(): AsyncIterable<string> {
        if (!this._outputStream) {
            this._outputStream = this.execution.read();
        }
        return this._outputStream;
    }

    waitForCompletion(): Promise<number> {
        if (!this._completionPromise) {
            this._completionPromise = new Promise((resolve) => {
                const disposable = vscode.window.onDidEndTerminalShellExecution(event => {
                    if (event.execution === this.execution) {
                        disposable.dispose();
                        resolve(event.exitCode ?? -1);
                    }
                });
            });
        }
        return this._completionPromise;
    }

    cancel(): void {
        // VS Code не предоставляет прямого способа отмены выполнения
        // Можно попытаться отправить Ctrl+C в терминал
        console.warn('Command cancellation not implemented');
    }
}

/**
 * Менеджер Shell Integration
 */
export class ShellIntegrationManager implements IShellIntegrationManager {
    private static readonly DEFAULT_TIMEOUT = 10000; // 10 секунд

    /**
     * Ожидание активации Shell Integration для терминала
     */
    async waitForShellIntegration(
        terminal: vscode.Terminal, 
        timeout: number = ShellIntegrationManager.DEFAULT_TIMEOUT
    ): Promise<vscode.TerminalShellIntegration> {
        
        // Проверяем, доступен ли уже Shell Integration
        if (terminal.shellIntegration) {
            return terminal.shellIntegration;
        }

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                listener.dispose();
                reject(new Error(`Shell Integration timeout after ${timeout}ms. Make sure shell integration is enabled in VS Code.`));
            }, timeout);

            const listener = vscode.window.onDidChangeTerminalShellIntegration((event) => {
                if (event.terminal === terminal && event.shellIntegration) {
                    clearTimeout(timer);
                    listener.dispose();
                    resolve(event.shellIntegration);
                }
            });

            // Показываем терминал, чтобы активировать Shell Integration
            terminal.show();
        });
    }

    /**
     * Выполнение команды через Shell Integration
     */
    async executeCommand(
        shellIntegration: vscode.TerminalShellIntegration, 
        command: string
    ): Promise<ICommandExecution> {
        
        try {
            // Shell Integration API VS Code автоматически обрабатывает отправку команды
            const execution = shellIntegration.executeCommand(command);
            return new CommandExecution(execution);
        } catch (error) {
            throw new Error(`Failed to execute command "${command}": ${error}`);
        }
    }

    /**
     * Проверка доступности Shell Integration
     */
    isShellIntegrationAvailable(terminal: vscode.Terminal): boolean {
        return terminal.shellIntegration !== undefined;
    }

    /**
     * Получение статистики Shell Integration
     */
    getShellIntegrationInfo(terminal: vscode.Terminal): {
        isAvailable: boolean;
        capabilities?: string[];
        shellType?: string;
    } {
        const shellIntegration = terminal.shellIntegration;
        
        if (!shellIntegration) {
            return { isAvailable: false };
        }

        return {
            isAvailable: true,
            // Добавим дополнительную информацию при необходимости
            capabilities: ['executeCommand', 'read'],
            shellType: 'unknown' // VS Code не предоставляет эту информацию напрямую
        };
    }

    /**
     * Создание терминала с оптимальными настройками для Shell Integration
     */
    createOptimizedTerminal(name: string, cwd?: string): vscode.Terminal {
        const options: vscode.TerminalOptions = {
            name,
            cwd: cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            // Добавляем переменные окружения для лучшей совместимости
            env: {
                ...process.env,
                // Указываем, что мы работаем из VS Code
                TERM_PROGRAM: 'vscode',
                // Добавляем переменную для идентификации нашего расширения
                CLAUDE_CODE_BRIDGE: 'true'
            }
        };

        return vscode.window.createTerminal(options);
    }

    /**
     * Диагностика проблем с Shell Integration
     */
    async diagnoseShellIntegration(terminal: vscode.Terminal): Promise<{
        status: 'ok' | 'warning' | 'error';
        message: string;
        suggestions: string[];
    }> {
        const suggestions: string[] = [];
        
        if (!terminal.shellIntegration) {
            suggestions.push('Enable shell integration in VS Code settings');
            suggestions.push('Make sure you are using a supported shell (bash, zsh, PowerShell)');
            suggestions.push('Try creating a new terminal');
            
            return {
                status: 'error',
                message: 'Shell Integration is not available',
                suggestions
            };
        }

        // Можно добавить дополнительные проверки
        return {
            status: 'ok',
            message: 'Shell Integration is working correctly',
            suggestions: []
        };
    }
}