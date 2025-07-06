import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';

export class ClaudePseudoTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<void | number>();
    private claudeOutputEmitter = new vscode.EventEmitter<string>();
    private sessionErrorEmitter = new vscode.EventEmitter<string>();
    
    onDidWrite: vscode.Event<string> = this.writeEmitter.event;
    onDidClose?: vscode.Event<void | number> = this.closeEmitter.event;
    onClaudeOutput: vscode.Event<string> = this.claudeOutputEmitter.event;
    onSessionError: vscode.Event<string> = this.sessionErrorEmitter.event;
    
    private claudeProcess?: ChildProcess;
    private isReady = false;
    private inputBuffer = '';
    private isReceivingClaudeResponse = false;
    private debugMode = true; // Флаг для DEBUG сообщений - ВРЕМЕННО ВКЛЮЧЕН
    private sessionActive = false; // Флаг активности сессии
    private currentSessionId?: string; // ID текущей сессии для --resume
    
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
        this.sessionActive = false;
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
        
        // Проверяем, инициализирована ли сессия
        if (!this.sessionActive) {
            this.writeEmitter.fire(`\x1b[31m❌ No active session. Please click "New Session" to start.\x1b[0m\r\n`);
            this.sessionErrorEmitter.fire('No active session. Please start a new session first.');
            return;
        }
        
        // Создаем новый процесс для каждого сообщения (как в claude-code-chat)
        // но с --resume для поддержания сессии
        this.startClaudeProcessForMessage(message);
    }
    
    startNewSession(): void {
        // Завершаем старую сессию если она есть
        if (this.claudeProcess) {
            this.claudeProcess.kill('SIGTERM');
            this.claudeProcess = undefined;
        }
        
        // Очищаем session ID для создания новой сессии
        this.currentSessionId = undefined;
        this.sessionActive = true; // Теперь сессия готова к работе
        
        this.writeEmitter.fire(`\r\n\x1b[32m✅ New Claude session ready\x1b[0m\r\n`);
    }
    
    // УДАЛЕНЫ: старые методы долгоживущей сессии
    // Теперь используем подход claude-code-chat: новый процесс + --resume

    private startClaudeProcessForMessage(message: string): void {
        try {
            // Используем подход из claude-code-chat: новый процесс для каждого сообщения
            const args = ['-p', '--output-format', 'stream-json', '--verbose', '--ide', '--dangerously-skip-permissions'];
            
            // Добавляем --resume если есть session ID (как в claude-code-chat)
            if (this.currentSessionId) {
                args.push('--resume', this.currentSessionId);
                this.writeEmitter.fire(`\x1b[33m[DEBUG] Resuming session: ${this.currentSessionId}\x1b[0m\r\n`);
            } else {
                this.writeEmitter.fire(`\x1b[33m[DEBUG] Starting new session\x1b[0m\r\n`);
            }
            
            // Получаем рабочий каталог из VS Code workspace
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();
            
            this.claudeProcess = spawn('claude', args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: false,
                cwd: cwd,
                env: { 
                    ...process.env, 
                    FORCE_COLOR: '0',
                    NO_COLOR: '1'
                }
            });
            
            // Отправляем сообщение в stdin И ЗАКРЫВАЕМ (как в claude-code-chat)
            if (this.claudeProcess.stdin) {
                this.claudeProcess.stdin.write(message + '\n');
                this.claudeProcess.stdin.end(); // ← КЛЮЧЕВОЕ!
            }
            
            this.setupProcessHandlers();
            
        } catch (error) {
            this.writeEmitter.fire(`\x1b[31mError starting Claude: ${error}\x1b[0m\r\n`);
            this.sessionErrorEmitter.fire(`Failed to start Claude: ${error}`);
        }
    }
    
    private setupProcessHandlers(): void {
        if (!this.claudeProcess) return;
        
        this.claudeProcess.stdout?.on('data', (data: Buffer) => {
            const output = data.toString();
            
            // ВРЕМЕННО: Всегда показываем, что данные приходят
            this.writeEmitter.fire(`\x1b[33m[DATA RECEIVED] Length: ${output.length} bytes\x1b[0m\r\n`);
            
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
                        
                        // Отладочная информация только в debug режиме
                        if (this.debugMode) {
                            this.writeEmitter.fire(`\x1b[36m[JSON] Type: ${jsonData.type}, Has message: ${!!jsonData.message}, Has content: ${!!jsonData.message?.content}\x1b[0m\r\n`);
                            if (jsonData.message?.content) {
                                this.writeEmitter.fire(`\x1b[36m[CONTENT] Types: ${jsonData.message.content.map((c: any) => c.type).join(', ')}\x1b[0m\r\n`);
                            }
                        }
                        
                        // ОБРАБОТКА SESSION ID (как в claude-code-chat)
                        if (jsonData.type === 'result' && jsonData.session_id) {
                            const isNewSession = !this.currentSessionId;
                            this.currentSessionId = jsonData.session_id;
                            
                            if (this.debugMode) {
                                this.writeEmitter.fire(`\x1b[32m[SESSION] ID captured: ${this.currentSessionId}${isNewSession ? ' (new)' : ' (resumed)'}\x1b[0m\r\n`);
                            }
                        }
                        
                        // УЛУЧШЕННАЯ ФИЛЬТРАЦИЯ:
                        // Показываем ТОЛЬКО сообщения типа 'assistant' с типом контента 'text'
                        // Игнорируем:
                        // - сообщения типа 'user' (это tool_result)
                        // - сообщения типа 'system' (служебные)
                        // - контент типа 'tool_use' (вызовы инструментов)
                        
                        if (jsonData.type === 'assistant' && jsonData.message?.content) {
                            for (const content of jsonData.message.content) {
                                // Отправляем в WebView ТОЛЬКО текстовый контент от ассистента
                                if (content.type === 'text' && content.text?.trim()) {
                                    this.claudeOutputEmitter.fire(content.text.trim());
                                    
                                    // Отладочная информация
                                    if (this.debugMode) {
                                        this.writeEmitter.fire(`\x1b[32m[SENT TO WEBVIEW] ${content.text.substring(0, 50)}...\x1b[0m\r\n`);
                                    }
                                }
                            }
                        }
                        
                    } catch (error) {
                        // Если не JSON, игнорируем строку (НЕ отправляем в WebView)
                        if (this.debugMode) {
                            this.writeEmitter.fire(`\x1b[31m[JSON PARSE ERROR] Ignoring line: ${line.substring(0, 100)}...\x1b[0m\r\n`);
                        }
                    }
                }
            }
        });
        
        this.claudeProcess.stderr?.on('data', (data: Buffer) => {
            const error = data.toString();
            this.writeEmitter.fire(`\x1b[31mError: ${error}\x1b[0m`);
            this.sessionErrorEmitter.fire(`Claude error: ${error}`);
        });
        
        this.claudeProcess.on('close', (code) => {
            this.writeEmitter.fire(`\x1b[33mClaude process finished with code ${code}\x1b[0m\r\n`);
            this.claudeProcess = undefined;
            // НЕ сбрасываем sessionActive - сессия остается активной для следующих запросов
        });
        
        this.claudeProcess.on('error', (error) => {
            this.writeEmitter.fire(`\x1b[31mFailed to start Claude: ${error.message}\x1b[0m\r\n`);
            this.sessionErrorEmitter.fire(`Failed to start Claude: ${error.message}`);
            this.claudeProcess = undefined;
            // Сбрасываем sessionActive только при ошибке
            this.sessionActive = false;
        });
    }
}