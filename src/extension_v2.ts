/**
 * Обновленная точка входа расширения с терминальной интеграцией
 * ClaudeCodeBridge - Кластерная модульная архитектура
 */

import * as vscode from 'vscode';
import { WebviewProviderV2 } from './webviewProvider_v2';

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 ClaudeCodeBridge v2 is activating...');
    
    // Создаем провайдер WebView с новой терминальной интеграцией
    const provider = new WebviewProviderV2(context.extensionUri);
    
    // Регистрируем WebView провайдер
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            WebviewProviderV2.viewType,
            provider
        )
    );
    
    // Команда для запуска Claude
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeBridge.start', async () => {
            try {
                await provider.startClaude();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to start Claude: ${error}`);
            }
        })
    );

    // Команда для остановки Claude
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeBridge.stop', async () => {
            try {
                await provider.stopClaude();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to stop Claude: ${error}`);
            }
        })
    );

    // Команда для открытия панели
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeBridge.openPanel', () => {
            vscode.commands.executeCommand('claudeBridge.chatView.focus');
        })
    );

    // Команда для диагностики
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeBridge.diagnose', async () => {
            // Эту команду можно вызвать из Command Palette
            vscode.window.showInformationMessage(
                'Diagnostics available in Claude Bridge panel. Click "Diagnostics" button.'
            );
        })
    );

    // Проверяем версию VS Code для Shell Integration
    const vsCodeVersion = vscode.version;
    const majorVersion = parseInt(vsCodeVersion.split('.')[0]);
    const minorVersion = parseInt(vsCodeVersion.split('.')[1]);
    
    if (majorVersion < 1 || (majorVersion === 1 && minorVersion < 88)) {
        vscode.window.showWarningMessage(
            'Claude Code Bridge: For best experience, upgrade to VS Code 1.88+ for Shell Integration support. ' +
            'Current version will use fallback mode.',
            'Learn More'
        ).then(selection => {
            if (selection === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse(
                    'https://code.visualstudio.com/docs/terminal/shell-integration'
                ));
            }
        });
    }

    // Показываем приветственное сообщение
    vscode.window.showInformationMessage(
        '🤖 Claude Code Bridge v2 activated! Open the Claude Bridge panel to get started.',
        'Open Panel'
    ).then(selection => {
        if (selection === 'Open Panel') {
            vscode.commands.executeCommand('claudeBridge.openPanel');
        }
    });

    console.log('✅ ClaudeCodeBridge v2 activated successfully!');
}

export function deactivate() {
    console.log('🔄 ClaudeCodeBridge v2 is deactivating...');
    // Cleanup будет выполнен автоматически через subscriptions
    console.log('✅ ClaudeCodeBridge v2 deactivated');
}