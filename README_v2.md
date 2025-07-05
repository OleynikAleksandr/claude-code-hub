# Claude Code Bridge v2 🚀

**Advanced VS Code Extension for Claude Code Integration with Terminal Support**

## 🌟 Features

### Core Functionality
- **🔄 Terminal Integration**: Direct integration with VS Code's integrated terminal
- **📡 Shell Integration API**: Advanced terminal communication using VS Code 1.88+ features  
- **🔄 Fallback Support**: Automatic fallback to basic `sendText` for older VS Code versions
- **🎯 Modular Architecture**: Clean, extensible codebase with strategy pattern
- **📊 Real-time Monitoring**: Live output streaming and state tracking
- **🔍 Advanced Diagnostics**: Detailed system health and capability reporting

### User Experience
- **💬 Enhanced WebView UI**: Modern chat interface with status indicators
- **⚡ Smart Controls**: Context-aware buttons and input fields
- **📈 State Visualization**: Clear status indicators and progress tracking
- **🛠️ Built-in Diagnostics**: One-click system analysis and troubleshooting

## 🏗️ Architecture

### Modular Design
```
ClaudeCodeBridge/
├── interfaces/           # TypeScript interfaces and contracts
├── terminal/            # Terminal integration modules
│   ├── strategies/      # Different terminal communication strategies
│   ├── TerminalIntegrationModule.ts  # Main integration module
│   └── ShellIntegrationManager.ts    # Shell Integration API wrapper
├── webviewProvider_v2.ts  # Enhanced WebView provider
└── extension_v2.ts       # Main extension entry point
```

### Strategy Pattern
The extension uses a **strategy pattern** for terminal communication:

1. **ShellIntegrationStrategy** (Priority: 100)
   - Uses VS Code 1.88+ Shell Integration API
   - Full bidirectional communication
   - Real-time output streaming
   - Command execution tracking

2. **SendTextStrategy** (Priority: 10)
   - Fallback for older VS Code versions
   - Basic command sending via `sendText()`
   - Limited output monitoring capabilities

## 🚀 Quick Start

### Prerequisites
- **VS Code 1.88+** (recommended for full functionality)
- **Claude CLI** installed and accessible in PATH
- **Shell Integration** enabled in VS Code (automatic in recent versions)

### Installation
1. Install the extension from VSIX package
2. Open the Claude Bridge panel from Activity Bar
3. Click "Start Claude" to initialize terminal integration
4. Begin chatting with Claude Code!

### First Use
```bash
# Verify Claude CLI is available
claude --version

# Open VS Code in your project directory
code .

# Open Claude Bridge panel and click "Start Claude"
```

## 🔧 Configuration

### Terminal Settings
The extension creates a terminal with optimized settings:
```typescript
{
  terminalName: 'Claude Code Bridge',
  shellIntegrationTimeout: 10000,  // 10 seconds
  claudeCommand: 'claude',
  autoStartClaude: true,
  useFallback: true
}
```

### VS Code Settings
For optimal experience, ensure these VS Code settings:
```json
{
  "terminal.integrated.shellIntegration.enabled": true,
  "terminal.integrated.shellIntegration.showWelcome": false
}
```

## 📊 Monitoring & Diagnostics

### Status Indicators
- 🟢 **Active**: Claude is ready and responsive
- 🟡 **Initializing**: Setting up terminal integration
- 🔴 **Error**: Issue detected, check diagnostics

### Diagnostic Information
Click "Diagnostics" button to view:
- Current terminal strategy
- Shell Integration status
- Terminal health
- System compatibility
- Error details and suggestions

## 🔬 Technical Details

### Shell Integration API Usage
The extension leverages VS Code's Shell Integration API for advanced features:

```typescript
// Execute command with output streaming
const execution = shellIntegration.executeCommand('your-command');
const stream = execution.read();

for await (const data of stream) {
  // Process real-time output
  handleOutput(data);
}

// Wait for command completion
const exitCode = await execution.waitForCompletion();
```

### Error Handling
Comprehensive error handling with automatic fallback:
1. Attempt Shell Integration
2. Fall back to SendText strategy if needed
3. Provide clear error messages and suggestions
4. Maintain extension stability

## 🧪 Testing

### Running Tests
```bash
# Compile TypeScript
npm run compile

# Run extension tests
npm test

# Watch mode for development
npm run watch
```

### Test Coverage
- ✅ Terminal Integration Module
- ✅ Strategy Selection
- ✅ State Management
- ✅ Output Handling
- ✅ Error Scenarios
- ✅ Module Lifecycle

## 🔄 Migration from v1

### What's Changed
- **Enhanced Architecture**: Modular, extensible design
- **Terminal Integration**: Direct VS Code terminal communication
- **Advanced UI**: Better status tracking and controls
- **Improved Compatibility**: Automatic fallback support

### Migration Steps
1. Backup existing settings (if any)
2. Install v2 extension
3. Remove v1 extension
4. Test functionality with your projects

## 🛠️ Development

### Building from Source
```bash
# Clone repository
git clone <repository-url>
cd claude-code-hub

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package extension
npm run package
```

### Extension Structure
```typescript
// Main module export
export { TerminalIntegrationModule } from './terminal';

// Strategy implementations
export { ShellIntegrationStrategy, SendTextStrategy } from './terminal/strategies';

// Interfaces
export { ITerminalIntegration, TerminalState } from './interfaces';
```

## 🐛 Troubleshooting

### Common Issues

**Shell Integration Not Available**
- Ensure VS Code 1.88+ is installed
- Check terminal shell compatibility
- Verify `terminal.integrated.shellIntegration.enabled` setting

**Claude Command Not Found**
- Verify Claude CLI installation: `claude --version`
- Check PATH environment variable
- Restart VS Code after installing Claude CLI

**Connection Issues**
- Use "Diagnostics" button for detailed analysis
- Check VS Code developer console (Help → Toggle Developer Tools)
- Verify terminal permissions and shell configuration

### Getting Help
1. Use built-in diagnostics feature
2. Check VS Code output panel for detailed logs
3. Review terminal output for Claude CLI messages
4. File issues with diagnostic information

## 📝 Changelog

### v0.1.0 (Current)
- ✨ **New**: Shell Integration API support
- ✨ **New**: Modular architecture with strategy pattern
- ✨ **New**: Advanced WebView UI with status tracking
- ✨ **New**: Comprehensive diagnostics system
- ✨ **New**: Automatic fallback support
- 🔧 **Improved**: Error handling and user feedback
- 🔧 **Improved**: Terminal management and lifecycle
- 📚 **Added**: Comprehensive testing suite

### v0.0.2 (Legacy)
- Basic terminal spawning with limited integration
- Simple WebView interface
- Manual Claude CLI process management

## 🤝 Contributing

We welcome contributions! Areas for improvement:
- Additional terminal communication strategies
- Enhanced error recovery mechanisms
- Performance optimizations
- UI/UX improvements
- Documentation and examples

## 📄 License

This project is part of the ClaudeCodeBridge initiative. See main repository for license details.

---

**Made with ❤️ for the VS Code and Claude community**

*Claude Code Bridge v2 - Bringing AI-powered development directly to your IDE*