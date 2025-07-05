/**
 * Обновленный WebView Provider с интеграцией терминального модуля
 * ClaudeCodeBridge - Кластерная модульная архитектура
 */

import * as vscode from 'vscode';
import { TerminalIntegrationModule } from './terminal/TerminalIntegrationModule';
import { TerminalState } from './interfaces/ITerminalIntegration';

export class WebviewProviderV2 implements vscode.WebviewViewProvider {
    public static readonly viewType = 'claudeBridge.chatView';
    
    private _view?: vscode.WebviewView;
    private terminalModule?: TerminalIntegrationModule;
    private isInitialized = false;
    
    constructor(
        private readonly _extensionUri: vscode.Uri
    ) {}
    
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        
        // Обработка сообщений от WebView
        webviewView.webview.onDidReceiveMessage(
            message => this.handleWebviewMessage(message)
        );

        // Инициализируем состояние UI
        this.updateUI();
    }
    
    /**
     * Обработка сообщений от WebView
     */
    private async handleWebviewMessage(message: any): Promise<void> {
        try {
            switch (message.type) {
                case 'sendMessage':
                    await this.sendMessageToClaude(message.text);
                    break;
                    
                case 'startClaude':
                    await this.startClaude();
                    break;
                    
                case 'stopClaude':
                    await this.stopClaude();
                    break;
                    
                case 'getDiagnostics':
                    await this.sendDiagnostics();
                    break;
                    
                case 'clearChat':
                    this.clearChat();
                    break;
                    
                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            this.sendErrorToWebview(`Error handling message: ${error}`);
        }
    }
    
    /**
     * Запуск Claude через терминальный модуль
     */
    public async startClaude(): Promise<void> {
        try {
            if (this.terminalModule) {
                this.sendMessageToWebview({
                    type: 'status',
                    message: 'Claude is already running'
                });
                return;
            }

            // Создаем новый терминальный модуль
            this.terminalModule = new TerminalIntegrationModule({
                terminalName: 'Claude Code Bridge',
                autoStartClaude: true,
                useFallback: true
            });

            // Подписываемся на вывод Claude
            this.terminalModule.onOutput((data: string) => {
                this.sendMessageToWebview({
                    type: 'claudeOutput',
                    text: data
                });
            });

            // Подписываемся на изменения состояния
            this.terminalModule.onStateChange((state: TerminalState) => {
                this.sendMessageToWebview({
                    type: 'stateChange',
                    state: state
                });
                this.updateUI();
            });

            // Инициализируем модуль
            await this.terminalModule.initialize();
            
            // Запускаем Claude
            await this.terminalModule.startClaude();
            
            this.isInitialized = true;
            
            vscode.window.showInformationMessage('Claude Code Bridge started successfully!');
            
        } catch (error) {
            const errorMessage = `Failed to start Claude: ${error}`;
            this.sendErrorToWebview(errorMessage);
            vscode.window.showErrorMessage(errorMessage);
        }
    }

    /**
     * Остановка Claude
     */
    public async stopClaude(): Promise<void> {
        if (this.terminalModule) {
            this.terminalModule.dispose();
            this.terminalModule = undefined;
            this.isInitialized = false;
            
            this.sendMessageToWebview({
                type: 'status',
                message: 'Claude stopped'
            });
            
            this.updateUI();
            
            vscode.window.showInformationMessage('Claude Code Bridge stopped');
        }
    }
    
    /**
     * Отправка сообщения в Claude
     */
    private async sendMessageToClaude(message: string): Promise<void> {
        if (!this.terminalModule || !this.isInitialized) {
            this.sendErrorToWebview('Claude is not running. Click "Start Claude" first.');
            return;
        }

        try {
            // Отображаем сообщение пользователя в UI
            this.sendMessageToWebview({
                type: 'userMessage',
                text: message
            });

            // Отправляем в Claude
            await this.terminalModule.sendMessage(message);
            
        } catch (error) {
            this.sendErrorToWebview(`Failed to send message: ${error}`);
        }
    }

    /**
     * Отправка диагностической информации
     */
    private async sendDiagnostics(): Promise<void> {
        if (!this.terminalModule) {
            this.sendMessageToWebview({
                type: 'diagnostics',
                data: {
                    status: 'not_initialized',
                    message: 'Terminal module not initialized'
                }
            });
            return;
        }

        try {
            const diagnostics = await this.terminalModule.diagnose();
            const strategyInfo = this.terminalModule.getCurrentStrategyInfo();
            
            this.sendMessageToWebview({
                type: 'diagnostics',
                data: {
                    status: 'ok',
                    state: diagnostics.state,
                    strategy: strategyInfo,
                    terminal: diagnostics.terminalActive,
                    issues: diagnostics.issues
                }
            });
        } catch (error) {
            this.sendErrorToWebview(`Failed to get diagnostics: ${error}`);
        }
    }

    /**
     * Очистка чата
     */
    private clearChat(): void {
        this.sendMessageToWebview({
            type: 'clearChat'
        });
    }

    /**
     * Отправка сообщения в WebView
     */
    private sendMessageToWebview(message: any): void {
        this._view?.webview.postMessage(message);
    }

    /**
     * Отправка ошибки в WebView
     */
    private sendErrorToWebview(error: string): void {
        this.sendMessageToWebview({
            type: 'error',
            message: error
        });
    }

    /**
     * Обновление UI состояния
     */
    private updateUI(): void {
        const state = this.terminalModule?.getState() || TerminalState.INACTIVE;
        const strategyInfo = this.terminalModule?.getCurrentStrategyInfo();
        
        this.sendMessageToWebview({
            type: 'uiUpdate',
            data: {
                isRunning: this.isInitialized,
                state: state,
                strategy: strategyInfo?.name || 'None',
                canSendMessages: state === TerminalState.CLAUDE_READY
            }
        });
    }

    /**
     * Получение HTML для WebView
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'style.css')
        );
        
        // Возвращаем обновленный HTML с поддержкой новых функций
        return this._generateAdvancedHTML(styleUri.toString());
    }

    /**
     * Генерация расширенного HTML для WebView
     */
    private _generateAdvancedHTML(styleUri: string): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <title>Claude Code Bridge</title>
            <style>
                .status-bar {
                    background: var(--vscode-statusBar-background);
                    color: var(--vscode-statusBar-foreground);
                    padding: 8px;
                    font-size: 12px;
                    border-bottom: 1px solid var(--vscode-widget-border);
                }
                .status-indicator {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-right: 6px;
                }
                .status-active { background-color: #4CAF50; }
                .status-inactive { background-color: #757575; }
                .status-error { background-color: #F44336; }
                .controls {
                    padding: 8px;
                    border-bottom: 1px solid var(--vscode-widget-border);
                }
                .button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    margin: 2px;
                    cursor: pointer;
                    border-radius: 3px;
                }
                .button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .chat-output {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                    font-family: var(--vscode-editor-font-family);
                }
                .message {
                    margin-bottom: 10px;
                    padding: 8px;
                    border-radius: 4px;
                }
                .message.user {
                    background: var(--vscode-inputValidation-infoBorder);
                    margin-left: 20px;
                }
                .message.claude {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                }
                .message.system {
                    background: var(--vscode-inputValidation-warningBorder);
                    font-style: italic;
                    font-size: 12px;
                }
                .input-area {
                    padding: 10px;
                    border-top: 1px solid var(--vscode-widget-border);
                }
                .input-field {
                    width: 100%;
                    padding: 8px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 3px;
                    resize: vertical;
                    min-height: 60px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="status-bar">
                    <span class="status-indicator status-inactive" id="statusIndicator"></span>
                    <span id="statusText">Claude Code Bridge - Not Running</span>
                    <span style="float: right;" id="strategyText">Strategy: None</span>
                </div>
                
                <div class="controls">
                    <button class="button" id="startBtn" onclick="startClaude()">Start Claude</button>
                    <button class="button" id="stopBtn" onclick="stopClaude()" disabled>Stop</button>
                    <button class="button" onclick="clearChat()">Clear</button>
                    <button class="button" onclick="getDiagnostics()">Diagnostics</button>
                </div>
                
                <div class="chat-output" id="chatOutput">
                    <div class="message system">
                        Welcome to Claude Code Bridge! Click "Start Claude" to begin.
                    </div>
                </div>
                
                <div class="input-area">
                    <textarea 
                        class="input-field" 
                        id="messageInput" 
                        placeholder="Type your message to Claude..."
                        disabled
                    ></textarea>
                    <button class="button" id="sendBtn" onclick="sendMessage()" disabled style="margin-top: 8px;">Send</button>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                // Элементы UI
                const statusIndicator = document.getElementById('statusIndicator');
                const statusText = document.getElementById('statusText');
                const strategyText = document.getElementById('strategyText');
                const startBtn = document.getElementById('startBtn');
                const stopBtn = document.getElementById('stopBtn');
                const sendBtn = document.getElementById('sendBtn');
                const messageInput = document.getElementById('messageInput');
                const chatOutput = document.getElementById('chatOutput');
                
                // Состояние
                let isRunning = false;
                let canSendMessages = false;
                
                // Обработка сообщений от расширения
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.type) {
                        case 'claudeOutput':
                            addMessage('claude', message.text);
                            break;
                        case 'userMessage':
                            addMessage('user', message.text);
                            break;
                        case 'error':
                            addMessage('system', '❌ ' + message.message);
                            break;
                        case 'status':
                            addMessage('system', '📢 ' + message.message);
                            break;
                        case 'stateChange':
                            updateStatus(message.state);
                            break;
                        case 'uiUpdate':
                            updateUI(message.data);
                            break;
                        case 'clearChat':
                            chatOutput.innerHTML = '';
                            break;
                        case 'diagnostics':
                            showDiagnostics(message.data);
                            break;
                    }
                });
                
                // Функции UI
                function startClaude() {
                    vscode.postMessage({ type: 'startClaude' });
                    addMessage('system', '🚀 Starting Claude...');
                }
                
                function stopClaude() {
                    vscode.postMessage({ type: 'stopClaude' });
                }
                
                function sendMessage() {
                    const text = messageInput.value.trim();
                    if (text && canSendMessages) {
                        vscode.postMessage({ type: 'sendMessage', text: text });
                        messageInput.value = '';
                    }
                }
                
                function clearChat() {
                    vscode.postMessage({ type: 'clearChat' });
                }
                
                function getDiagnostics() {
                    vscode.postMessage({ type: 'getDiagnostics' });
                }
                
                function addMessage(type, content) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message ' + type;
                    messageDiv.textContent = content;
                    chatOutput.appendChild(messageDiv);
                    chatOutput.scrollTop = chatOutput.scrollHeight;
                }
                
                function updateStatus(state) {
                    statusText.textContent = 'Claude Code Bridge - ' + state;
                    
                    // Обновляем индикатор
                    statusIndicator.className = 'status-indicator ' + 
                        (state === 'claude_ready' ? 'status-active' : 
                         state === 'error' ? 'status-error' : 'status-inactive');
                }
                
                function updateUI(data) {
                    isRunning = data.isRunning;
                    canSendMessages = data.canSendMessages;
                    
                    startBtn.disabled = isRunning;
                    stopBtn.disabled = !isRunning;
                    sendBtn.disabled = !canSendMessages;
                    messageInput.disabled = !canSendMessages;
                    
                    strategyText.textContent = 'Strategy: ' + data.strategy;
                    
                    if (data.state) {
                        updateStatus(data.state);
                    }
                }
                
                function showDiagnostics(data) {
                    const diagText = JSON.stringify(data, null, 2);
                    addMessage('system', '🔍 Diagnostics:\\n' + diagText);
                }
                
                // Отправка по Enter
                messageInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                    }
                });
            </script>
        </body>
        </html>`;
    }
}