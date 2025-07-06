import * as vscode from 'vscode';
import { WebviewProvider } from './webviewProvider';
import { ClaudePseudoTerminal } from './pseudoterminal/ClaudePseudoTerminal';

export function activate(context: vscode.ExtensionContext) {
    console.log('ClaudeCodeHUB is now active!');
    
    const provider = new WebviewProvider(context.extensionUri);
    let claudeTerminal: vscode.Terminal | undefined;
    let claudePty: ClaudePseudoTerminal | undefined;
    
    // Функция для запуска терминала
    const startClaudeTerminal = () => {
        if (!claudePty) {
            claudePty = new ClaudePseudoTerminal();
            claudeTerminal = vscode.window.createTerminal({
                name: 'Claude',
                pty: claudePty
            });
            claudeTerminal.show();
            
            // Connect webview to pseudoterminal
            provider.setPseudoTerminal(claudePty);
        }
    };
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'claudeBridge.chatView',
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        )
    );
    
    // Слушаем событие когда WebView становится видимым
    provider.onViewReady(() => {
        startClaudeTerminal();
    });
    
    // Единая команда для открытия всего
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeBridge.open', async () => {
            // Показываем WebView
            await vscode.commands.executeCommand('claudeBridge.chatView.focus');
            // Запускаем терминал
            startClaudeTerminal();
        })
    );
    
    // Оставляем старую команду для совместимости
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeBridge.openPseudoTerminal', () => {
            startClaudeTerminal();
        })
    );
}

export function deactivate() {
    console.log('ClaudeCodeHUB is deactivated');
}