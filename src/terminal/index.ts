/**
 * Экспорт модулей терминальной интеграции
 * ClaudeCodeBridge - Кластерная модульная архитектура
 */

// Основной модуль
export { TerminalIntegrationModule } from './TerminalIntegrationModule';

// Менеджер Shell Integration
export { ShellIntegrationManager, CommandExecution } from './ShellIntegrationManager';

// Стратегии
export { ShellIntegrationStrategy } from './strategies/ShellIntegrationStrategy';
export { SendTextStrategy } from './strategies/SendTextStrategy';

// Интерфейсы
export * from '../interfaces/ITerminalIntegration';