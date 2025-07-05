/**
 * Интерфейсы для модульной архитектуры терминальной интеграции
 * ClaudeCodeBridge - Кластерный модульный принцип
 */

import * as vscode from 'vscode';

/**
 * Основной интерфейс для интеграции с терминалом
 */
export interface ITerminalIntegration {
    /**
     * Инициализация терминальной интеграции
     */
    initialize(): Promise<void>;
    
    /**
     * Запуск Claude Code в терминале
     */
    startClaude(): Promise<void>;
    
    /**
     * Отправка сообщения в Claude
     */
    sendMessage(message: string): Promise<void>;
    
    /**
     * Подписка на вывод от Claude
     */
    onOutput(callback: (data: string) => void): void;
    
    /**
     * Подписка на изменение состояния
     */
    onStateChange(callback: (state: TerminalState) => void): void;
    
    /**
     * Завершение работы
     */
    dispose(): void;
}

/**
 * Состояния терминала
 */
export enum TerminalState {
    INACTIVE = 'inactive',
    INITIALIZING = 'initializing',
    WAITING_FOR_SHELL_INTEGRATION = 'waiting_shell_integration',
    STARTING_CLAUDE = 'starting_claude',
    CLAUDE_READY = 'claude_ready',
    CLAUDE_PROCESSING = 'claude_processing',
    ERROR = 'error'
}

/**
 * Данные о состоянии терминала
 */
export interface TerminalStateData {
    state: TerminalState;
    message?: string;
    error?: Error;
    terminal?: vscode.Terminal;
}

/**
 * Интерфейс для менеджера Shell Integration
 */
export interface IShellIntegrationManager {
    /**
     * Ожидание активации Shell Integration
     */
    waitForShellIntegration(terminal: vscode.Terminal, timeout?: number): Promise<vscode.TerminalShellIntegration>;
    
    /**
     * Выполнение команды через Shell Integration
     */
    executeCommand(shellIntegration: vscode.TerminalShellIntegration, command: string): Promise<ICommandExecution>;
    
    /**
     * Проверка доступности Shell Integration
     */
    isShellIntegrationAvailable(terminal: vscode.Terminal): boolean;
}

/**
 * Интерфейс для выполнения команды
 */
export interface ICommandExecution {
    /**
     * Объект выполнения VS Code
     */
    execution: vscode.TerminalShellExecution;
    
    /**
     * Чтение потока вывода
     */
    readOutput(): AsyncIterable<string>;
    
    /**
     * Ожидание завершения команды
     */
    waitForCompletion(): Promise<number>; // exit code
    
    /**
     * Отмена выполнения
     */
    cancel(): void;
}

/**
 * Интерфейс для событий терминала
 */
export interface ITerminalEventHandler {
    /**
     * Обработка начала выполнения команды
     */
    onCommandStart(event: vscode.TerminalShellExecutionStartEvent): void;
    
    /**
     * Обработка завершения выполнения команды
     */
    onCommandEnd(event: vscode.TerminalShellExecutionEndEvent): void;
    
    /**
     * Обработка изменения Shell Integration
     */
    onShellIntegrationChange(event: vscode.TerminalShellIntegrationChangeEvent): void;
}

/**
 * Конфигурация терминальной интеграции
 */
export interface ITerminalConfig {
    /**
     * Имя терминала
     */
    terminalName: string;
    
    /**
     * Рабочая директория
     */
    cwd?: string;
    
    /**
     * Таймаут ожидания Shell Integration (мс)
     */
    shellIntegrationTimeout: number;
    
    /**
     * Команда для запуска Claude
     */
    claudeCommand: string;
    
    /**
     * Автоматический запуск Claude при создании терминала
     */
    autoStartClaude: boolean;
    
    /**
     * Fallback на sendText если Shell Integration недоступен
     */
    useFallback: boolean;
}

/**
 * Интерфейс для стратегии взаимодействия с терминалом
 */
export interface ITerminalStrategy {
    /**
     * Название стратегии
     */
    readonly name: string;
    
    /**
     * Проверка доступности стратегии
     */
    isAvailable(terminal: vscode.Terminal): Promise<boolean>;
    
    /**
     * Отправка команды
     */
    sendCommand(terminal: vscode.Terminal, command: string): Promise<void>;
    
    /**
     * Подписка на вывод
     */
    subscribeToOutput(terminal: vscode.Terminal, callback: (data: string) => void): vscode.Disposable;
    
    /**
     * Приоритет стратегии (выше = предпочтительнее)
     */
    readonly priority: number;
}