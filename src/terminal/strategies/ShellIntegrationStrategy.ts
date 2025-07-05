/**
 * Стратегия взаимодействия через Shell Integration API
 * ClaudeCodeBridge - Модульная архитектура
 */

import * as vscode from 'vscode';
import { ITerminalStrategy } from '../../interfaces/ITerminalIntegration';
import { ShellIntegrationManager } from '../ShellIntegrationManager';

export class ShellIntegrationStrategy implements ITerminalStrategy {
    public readonly name = 'ShellIntegration';
    public readonly priority = 100; // Высший приоритет

    private shellManager: ShellIntegrationManager;
    private activeExecutions = new Map<vscode.Terminal, vscode.TerminalShellExecution>();

    constructor() {
        this.shellManager = new ShellIntegrationManager();
    }

    async isAvailable(terminal: vscode.Terminal): Promise<boolean> {
        // Проверяем, доступен ли Shell Integration
        if (terminal.shellIntegration) {
            return true;
        }

        // Пытаемся дождаться активации (с коротким таймаутом)
        try {
            await this.shellManager.waitForShellIntegration(terminal, 2000);
            return true;
        } catch {
            return false;
        }
    }

    async sendCommand(terminal: vscode.Terminal, command: string): Promise<void> {
        const shellIntegration = terminal.shellIntegration;
        if (!shellIntegration) {
            throw new Error('Shell Integration not available');
        }

        try {
            // ВРЕМЕННО: используем sendText для интерактивных приложений как Claude
            // Shell Integration executeCommand может не подходить для интерактивного ввода
            terminal.sendText(command, true);
            
            // TODO: в будущем можно вернуться к Shell Integration для других команд
            // const commandExecution = await this.shellManager.executeCommand(shellIntegration, command);
            // this.activeExecutions.set(terminal, commandExecution.execution);
            // commandExecution.waitForCompletion().finally(() => {
            //     this.activeExecutions.delete(terminal);
            // });

        } catch (error) {
            throw new Error(`Failed to send command via Shell Integration: ${error}`);
        }
    }

    subscribeToOutput(terminal: vscode.Terminal, callback: (data: string) => void): vscode.Disposable {
        const disposables: vscode.Disposable[] = [];

        // Подписываемся на начало выполнения команд
        disposables.push(
            vscode.window.onDidStartTerminalShellExecution(event => {
                if (event.terminal === terminal) {
                    this.handleCommandStart(event, callback);
                }
            })
        );

        // Подписываемся на завершение выполнения команд
        disposables.push(
            vscode.window.onDidEndTerminalShellExecution(event => {
                if (event.terminal === terminal) {
                    this.handleCommandEnd(event, callback);
                }
            })
        );

        // Возвращаем композитный Disposable
        return {
            dispose: () => {
                disposables.forEach(d => d.dispose());
            }
        };
    }

    private async handleCommandStart(
        event: vscode.TerminalShellExecutionStartEvent, 
        callback: (data: string) => void
    ): Promise<void> {
        try {
            // Читаем поток вывода команды
            const stream = event.execution.read();
            
            for await (const data of stream) {
                callback(data);
            }
        } catch (error) {
            console.error('Error reading command output:', error);
            callback(`[ERROR] Failed to read command output: ${error}\n`);
        }
    }

    private handleCommandEnd(
        event: vscode.TerminalShellExecutionEndEvent, 
        callback: (data: string) => void
    ): void {
        const exitCode = event.exitCode;
        if (exitCode !== undefined && exitCode !== 0) {
            callback(`[COMMAND FINISHED] Exit code: ${exitCode}\n`);
        }
    }

    /**
     * Получение информации о текущих выполняющихся командах
     */
    getActiveExecutions(): Map<vscode.Terminal, vscode.TerminalShellExecution> {
        return new Map(this.activeExecutions);
    }

    /**
     * Попытка отмены активной команды в терминале
     */
    async cancelActiveCommand(terminal: vscode.Terminal): Promise<boolean> {
        const execution = this.activeExecutions.get(terminal);
        if (!execution) {
            return false;
        }

        try {
            // VS Code пока не предоставляет прямого способа отмены
            // Пытаемся отправить Ctrl+C через sendText
            terminal.sendText('\x03', false); // Ctrl+C
            return true;
        } catch (error) {
            console.error('Failed to cancel command:', error);
            return false;
        }
    }

    /**
     * Диагностика состояния Shell Integration
     */
    async diagnose(terminal: vscode.Terminal): Promise<{
        status: 'ok' | 'warning' | 'error';
        details: string;
    }> {
        const diagnosis = await this.shellManager.diagnoseShellIntegration(terminal);
        
        return {
            status: diagnosis.status,
            details: `${diagnosis.message}${diagnosis.suggestions.length > 0 ? 
                '\nSuggestions: ' + diagnosis.suggestions.join(', ') : ''}`
        };
    }
}