import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';

export class ClaudePseudoTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<void | number>();
    private claudeOutputEmitter = new vscode.EventEmitter<string>();
    
    onDidWrite: vscode.Event<string> = this.writeEmitter.event;
    onDidClose?: vscode.Event<void | number> = this.closeEmitter.event;
    onClaudeOutput: vscode.Event<string> = this.claudeOutputEmitter.event;
    
    private claudeProcess?: ChildProcess;
    private isReady = false;
    private inputBuffer = '';
    private isReceivingClaudeResponse = false;
    private debugMode = false; // Флаг для DEBUG сообщений
    
    constructor() {}
    
    open(initialDimensions: vscode.TerminalDimensions | undefined): void {
        this.writeEmitter.fire('\x1b[36mClaude Pseudo Terminal Started\x1b[0m\r\n');
        this.writeEmitter.fire('\x1b[32mReady to send messages to Claude!\x1b[0m\r\n');
        this.isReady = true;
    }
    
    close(): void {
        if (this.claudeProcess) {
            this.claudeProcess.kill('SIGTERM');
            this.claudeProcess = undefined;
        }
        this.closeEmitter.fire();
    }
    
    
    handleInput(data: string): void {
        if (!this.isReady) {
            return;
        }
        
        if (this.claudeProcess && this.claudeProcess.stdin) {
            // Real Claude process mode
            this.claudeProcess.stdin.write(data);
        } else {
            // Echo mode fallback
            this.writeEmitter.fire(data);
            
            if (data === '\r') {
                this.writeEmitter.fire('\n');
                if (this.inputBuffer.trim()) {
                    this.writeEmitter.fire(`\x1b[32mEcho:\x1b[0m ${this.inputBuffer.trim()}\r\n`);
                }
                this.inputBuffer = '';
                this.writeEmitter.fire('> ');
            } else if (data === '\x7f') {
                // Backspace
                if (this.inputBuffer.length > 0) {
                    this.inputBuffer = this.inputBuffer.slice(0, -1);
                }
            } else if (data !== '\r' && data !== '\n') {
                this.inputBuffer += data;
            }
        }
    }
    
    sendMessage(message: string): void {
        this.writeEmitter.fire(`\r\n\x1b[36m> Sending to Claude:\x1b[0m ${message}\r\n`);
        
        // Создаем новый процесс для каждого сообщения (как в claude-code-chat)
        this.startClaudeProcessForMessage(message);
    }
    
    private startClaudeProcessForMessage(message: string): void {
        try {
            // Используем подход из claude-code-chat: -p режим с stream-json + --verbose + --ide + все разрешения
            const args = ['-p', '--output-format', 'stream-json', '--verbose', '--ide', '--dangerously-skip-permissions'];
            
            // Получаем рабочий каталог из VS Code workspace
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();
            
            this.claudeProcess = spawn('claude', args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: false,
                cwd: cwd,  // Добавляем рабочий каталог
                env: { 
                    ...process.env, 
                    FORCE_COLOR: '0',  // Отключаем цвета в выводе
                    NO_COLOR: '1'      // Ещё один способ отключить цвета
                }
            });
            
            // Отправляем сообщение в stdin и закрываем
            if (this.claudeProcess.stdin) {
                this.claudeProcess.stdin.write(message + '\n');
                this.claudeProcess.stdin.end();
            }
            
            this.setupProcessHandlers();
            
        } catch (error) {
            this.writeEmitter.fire(`\x1b[31mError starting Claude: ${error}\x1b[0m\r\n`);
        }
    }
    
    private setupProcessHandlers(): void {
        if (!this.claudeProcess) return;
        
        this.claudeProcess.stdout?.on('data', (data: Buffer) => {
            const output = data.toString();
            // Показываем raw output только в режиме отладки
            if (this.debugMode) {
                this.writeEmitter.fire(output);
            }
            
            // DEBUG: показываем все что получаем (только в режиме отладки)
            if (this.debugMode) {
                this.writeEmitter.fire(`\x1b[33m[DEBUG] Raw output: ${JSON.stringify(output)}\x1b[0m\r\n`);
            }
            
            // Парсим JSON построчно как в claude-code-chat
            const lines = output.split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const jsonData = JSON.parse(line.trim());
                        // DEBUG: показываем JSON только в режиме отладки
                        if (this.debugMode) {
                            this.writeEmitter.fire(`\x1b[32m[JSON] ${JSON.stringify(jsonData)}\x1b[0m\r\n`);
                        }
                        
                        // Фильтруем служебные сообщения и отправляем в WebView только текст ассистента
                        // Исключаем все служебные JSON сообщения:
                        // - tool_result сообщения (результаты выполнения инструментов)
                        // - сообщения с parent_tool_use_id (внутренние tool операции) 
                        // - сообщения типа 'user' содержащие tool_use_id
                        const isServiceMessage = 
                            jsonData.parent_tool_use_id || 
                            jsonData.session_id ||
                            (jsonData.type === 'user' && jsonData.message?.content?.some((c: any) => c.tool_use_id || c.type === 'tool_result'));
                        
                        // Показываем только сообщения ассистента, которые не являются служебными
                        if (!isServiceMessage && jsonData.type === 'assistant' && jsonData.message?.content) {
                            for (const content of jsonData.message.content) {
                                if (content.type === 'text' && content.text?.trim()) {
                                    this.claudeOutputEmitter.fire(content.text.trim());
                                }
                            }
                        }
                        // Игнорируем служебные сообщения: system, user с tool_result, и прочие JSON
                        // НЕ отправляем их в WebView
                    } catch (error) {
                        // Если не JSON, отправляем как обычный текст
                        if (line.trim().length > 0) {
                            this.claudeOutputEmitter.fire(line.trim());
                        }
                    }
                }
            }
        });
        
        this.claudeProcess.stderr?.on('data', (data: Buffer) => {
            const error = data.toString();
            this.writeEmitter.fire(`\x1b[31mError: ${error}\x1b[0m`);
            this.claudeOutputEmitter.fire(`Error: ${error}`);
        });
        
        this.claudeProcess.on('close', (code) => {
            this.writeEmitter.fire(`\x1b[33mClaude process finished with code ${code}\x1b[0m\r\n`);
            this.claudeProcess = undefined;
        });
        
        this.claudeProcess.on('error', (error) => {
            this.writeEmitter.fire(`\x1b[31mFailed to start Claude: ${error.message}\x1b[0m\r\n`);
            this.claudeOutputEmitter.fire(`Error: ${error.message}`);
            this.claudeProcess = undefined;
        });
    }
}