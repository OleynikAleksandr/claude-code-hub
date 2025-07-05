import * as vscode from 'vscode';
import { WebviewProvider } from './webviewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('ClaudeCodeHUB is now active!');
    
    const provider = new WebviewProvider(context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'claudeBridge.chatView',
            provider
        )
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeBridge.start', () => {
            provider.startClaude();
        })
    );
}

export function deactivate() {
    console.log('ClaudeCodeHUB is deactivated');
}