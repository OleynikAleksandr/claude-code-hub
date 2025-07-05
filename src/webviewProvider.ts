import * as vscode from 'vscode';
import { ClaudePseudoTerminal } from './pseudoterminal/ClaudePseudoTerminal';

export class WebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'claudeBridge.chatView';
    
    private _view?: vscode.WebviewView;
    private pseudoTerminal?: ClaudePseudoTerminal;
    
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
    
    public setPseudoTerminal(pty: ClaudePseudoTerminal) {
        this.pseudoTerminal = pty;
        
        // Listen to terminal output and send to webview
        pty.onDidWrite(data => {
            this._view?.webview.postMessage({ type: 'claudeOutput', text: data });
        });
        
        vscode.window.showInformationMessage('Claude Bridge connected to pseudo terminal!');
    }
    
    private sendMessageToClaude(message: string) {
        if (this.pseudoTerminal) {
            this.pseudoTerminal.sendMessage(message);
        } else {
            vscode.window.showWarningMessage('Pseudo terminal not connected. Use "Open Pseudo Terminal" command first.');
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