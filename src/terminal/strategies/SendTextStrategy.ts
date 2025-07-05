/**
 * Fallback стратегия через sendText API
 * ClaudeCodeBridge - Модульная архитектура
 */

import * as vscode from 'vscode';
import { ITerminalStrategy } from '../../interfaces/ITerminalIntegration';

export class SendTextStrategy implements ITerminalStrategy {
    public readonly name = 'SendText';
    public readonly priority = 10; // Низкий приоритет (fallback)

    async isAvailable(terminal: vscode.Terminal): Promise<boolean> {
        // sendText доступен всегда в стандартном Terminal API
        return true;
    }

    async sendCommand(terminal: vscode.Terminal, command: string): Promise<void> {
        try {
            // Отправляем команду с автоматическим Enter
            terminal.sendText(command, true);
        } catch (error) {
            throw new Error(`Failed to send command via sendText: ${error}`);
        }
    }

    subscribeToOutput(terminal: vscode.Terminal, callback: (data: string) => void): vscode.Disposable {
        // sendText API не предоставляет способа читать вывод
        // Возвращаем пустой Disposable и предупреждаем пользователя
        callback('[WARNING] SendText strategy cannot read terminal output. Upgrade to VS Code 1.88+ for full functionality.\n');
        
        return {
            dispose: () => {
                // Ничего не делаем
            }
        };
    }

    /**
     * Отправка специальных команд (Enter, Ctrl+C, etc.)
     */
    async sendSpecialCommand(terminal: vscode.Terminal, specialCommand: 'enter' | 'ctrlC' | 'ctrlZ' | string): Promise<void> {
        const specialCommands = {
            'enter': '\n',
            'ctrlC': '\x03',
            'ctrlZ': '\x1a',
            'up': '\x1b[A',
            'down': '\x1b[B',
            'left': '\x1b[D',
            'right': '\x1b[C'
        };

        const command = specialCommands[specialCommand as keyof typeof specialCommands] || specialCommand;
        
        try {
            terminal.sendText(command, false); // Не добавляем автоматический Enter
        } catch (error) {
            throw new Error(`Failed to send special command "${specialCommand}": ${error}`);
        }
    }

    /**
     * Отправка ответа на интерактивный запрос (y/n)
     */
    async sendInteractiveResponse(terminal: vscode.Terminal, response: 'y' | 'n' | 'yes' | 'no' | string): Promise<void> {
        const normalizedResponse = response.toLowerCase();
        const responseMap = {
            'y': 'y',
            'yes': 'yes',
            'n': 'n',
            'no': 'no'
        };

        const actualResponse = responseMap[normalizedResponse as keyof typeof responseMap] || response;
        
        try {
            terminal.sendText(actualResponse, true); // Отправляем с Enter
        } catch (error) {
            throw new Error(`Failed to send interactive response "${response}": ${error}`);
        }
    }

    /**
     * Имитация работы с Claude Code через sendText
     */
    async simulateClaudeInteraction(terminal: vscode.Terminal, userMessage: string): Promise<void> {
        try {
            // Отправляем сообщение пользователя
            terminal.sendText(userMessage, true);
            
            // Даем уведомление, что ответ нужно отслеживать визуально
            vscode.window.showInformationMessage(
                'Message sent to Claude. Monitor terminal output for response.',
                { modal: false }
            );
        } catch (error) {
            throw new Error(`Failed to simulate Claude interaction: ${error}`);
        }
    }

    /**
     * Проверка активности терминала
     */
    isTerminalActive(terminal: vscode.Terminal): boolean {
        // Проверяем, что терминал не был закрыт
        return vscode.window.terminals.includes(terminal);
    }

    /**
     * Фокусировка на терминале
     */
    focusTerminal(terminal: vscode.Terminal): void {
        terminal.show(true); // true = preserveFocus: false (фокусируемся на терминале)
    }

    /**
     * Диагностика состояния sendText стратегии
     */
    async diagnose(terminal: vscode.Terminal): Promise<{
        status: 'ok' | 'warning' | 'error';
        details: string;
    }> {
        if (!this.isTerminalActive(terminal)) {
            return {
                status: 'error',
                details: 'Terminal is not active or has been closed'
            };
        }

        return {
            status: 'warning',
            details: 'SendText strategy active. Limited functionality: can send commands but cannot read output. Consider upgrading to VS Code 1.88+ for Shell Integration support.'
        };
    }
}