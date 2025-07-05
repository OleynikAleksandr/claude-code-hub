import { spawn, ChildProcess } from 'child_process';
import * as vscode from 'vscode';

export class ClaudeProcess {
    private process?: ChildProcess;
    private outputHandlers: ((text: string) => void)[] = [];
    
    public start() {
        try {
            this.process = spawn('claude', [], {
                env: { ...process.env },
                shell: true
            });
            
            this.process.stdout?.on('data', (data: Buffer) => {
                const text = data.toString();
                this.outputHandlers.forEach(handler => handler(text));
            });
            
            this.process.stderr?.on('data', (data: Buffer) => {
                const text = data.toString();
                console.error('Claude stderr:', text);
                this.outputHandlers.forEach(handler => handler(`Error: ${text}`));
            });
            
            this.process.on('error', (error) => {
                console.error('Failed to start Claude:', error);
                vscode.window.showErrorMessage(`Failed to start Claude: ${error.message}`);
            });
            
            this.process.on('close', (code) => {
                console.log(`Claude process exited with code ${code}`);
                if (code !== 0) {
                    vscode.window.showWarningMessage(`Claude process exited with code ${code}`);
                }
            });
            
        } catch (error) {
            console.error('Error starting Claude:', error);
            vscode.window.showErrorMessage('Failed to start Claude. Make sure Claude CLI is installed.');
        }
    }
    
    public sendMessage(message: string) {
        if (this.process && this.process.stdin) {
            this.process.stdin.write(message + '\n');
        }
    }
    
    public onOutput(handler: (text: string) => void) {
        this.outputHandlers.push(handler);
    }
    
    public stop() {
        if (this.process) {
            this.process.kill();
            this.process = undefined;
        }
    }
}