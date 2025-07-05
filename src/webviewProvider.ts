import * as vscode from 'vscode';
import { ClaudeProcess } from './claudeProcess';

export class WebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'claudeBridge.chatView';
    
    private _view?: vscode.WebviewView;
    private claudeProcess?: ClaudeProcess;
    
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
        
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.type) {
                    case 'sendMessage':
                        this.sendMessageToClaude(message.text);
                        break;
                }
            }
        );
    }
    
    public startClaude() {
        if (!this.claudeProcess) {
            this.claudeProcess = new ClaudeProcess();
            this.claudeProcess.onOutput((text: string) => {
                this._view?.webview.postMessage({ type: 'claudeOutput', text });
            });
            
            this.claudeProcess.start();
            vscode.window.showInformationMessage('Claude Bridge started!');
        }
    }
    
    private sendMessageToClaude(message: string) {
        if (this.claudeProcess) {
            this.claudeProcess.sendMessage(message);
        } else {
            vscode.window.showWarningMessage('Claude is not running. Click "Start Claude Bridge" first.');
        }
    }
    
    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'style.css')
        );
        
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'index.html');
        const htmlContent = require('fs').readFileSync(htmlPath.fsPath, 'utf8');
        
        return htmlContent.replace('${styleUri}', styleUri.toString());
    }
}