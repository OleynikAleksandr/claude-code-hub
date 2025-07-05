import * as vscode from 'vscode';
import { WebviewProvider } from './webviewProvider';
import { ClaudePseudoTerminal } from './pseudoterminal/ClaudePseudoTerminal';

export function activate(context: vscode.ExtensionContext) {
    console.log('ClaudeCodeHUB is now active!');
    
    const provider = new WebviewProvider(context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'claudeBridge.chatView',
            provider
        )
    );
    
    // Command to open pseudo terminal
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeBridge.openPseudoTerminal', () => {
            const pty = new ClaudePseudoTerminal();
            const terminal = vscode.window.createTerminal({
                name: 'Claude',
                pty
            });
            terminal.show();
            
            // Connect webview to pseudoterminal
            provider.setPseudoTerminal(pty);
        })
    );
}

export function deactivate() {
    console.log('ClaudeCodeHUB is deactivated');
}