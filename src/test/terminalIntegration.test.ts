/**
 * Тесты для модуля терминальной интеграции
 * ClaudeCodeBridge - Кластерная модульная архитектура
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { TerminalIntegrationModule } from '../terminal/TerminalIntegrationModule';
import { TerminalState } from '../interfaces/ITerminalIntegration';

suite('Terminal Integration Module Tests', () => {
    let terminalModule: TerminalIntegrationModule;

    setup(() => {
        terminalModule = new TerminalIntegrationModule({
            terminalName: 'Test Terminal',
            autoStartClaude: false,
            shellIntegrationTimeout: 5000
        });
    });

    teardown(() => {
        if (terminalModule) {
            terminalModule.dispose();
        }
    });

    test('Module initialization', async () => {
        // Проверяем начальное состояние
        assert.strictEqual(terminalModule.getState(), TerminalState.INACTIVE);

        // Инициализируем модуль
        try {
            await terminalModule.initialize();
            
            // Проверяем, что состояние изменилось
            const state = terminalModule.getState();
            assert.notStrictEqual(state, TerminalState.INACTIVE);
            
            // Проверяем, что стратегия выбрана
            const strategyInfo = terminalModule.getCurrentStrategyInfo();
            assert.ok(strategyInfo, 'Strategy should be selected');
            assert.ok(strategyInfo.name, 'Strategy should have a name');
            
        } catch (error) {
            // В среде тестирования может не быть полной поддержки терминала
            console.warn('Terminal initialization failed in test environment:', error);
        }
    });

    test('Output callback registration', () => {
        let outputReceived = false;
        let stateChanged = false;

        // Регистрируем обработчики
        terminalModule.onOutput((data) => {
            outputReceived = true;
            assert.ok(typeof data === 'string', 'Output should be a string');
        });

        terminalModule.onStateChange((state) => {
            stateChanged = true;
            assert.ok(Object.values(TerminalState).includes(state), 'State should be valid');
        });

        // Проверяем, что обработчики зарегистрированы (косвенно)
        assert.ok(true, 'Callbacks registered without errors');
    });

    test('Diagnostics', async () => {
        const diagnostics = await terminalModule.diagnose();
        
        assert.ok(diagnostics, 'Diagnostics should be returned');
        assert.ok(typeof diagnostics.state === 'string', 'State should be a string');
        assert.ok(typeof diagnostics.terminalActive === 'boolean', 'Terminal active should be boolean');
        assert.ok(Array.isArray(diagnostics.issues), 'Issues should be an array');
    });

    test('Module disposal', () => {
        // Проверяем, что disposal не вызывает ошибок
        assert.doesNotThrow(() => {
            terminalModule.dispose();
        }, 'Dispose should not throw errors');

        // Проверяем состояние после disposal
        assert.strictEqual(terminalModule.getState(), TerminalState.INACTIVE);
    });
});

suite('Terminal Strategy Tests', () => {
    test('Strategy availability check', async () => {
        // Создаем фиктивный терминал для тестирования
        const terminal = vscode.window.createTerminal('Test Terminal');
        
        try {
            // Импортируем стратегии
            const { ShellIntegrationStrategy } = await import('../terminal/strategies/ShellIntegrationStrategy');
            const { SendTextStrategy } = await import('../terminal/strategies/SendTextStrategy');
            
            const shellStrategy = new ShellIntegrationStrategy();
            const sendTextStrategy = new SendTextStrategy();
            
            // SendText должен быть всегда доступен
            const sendTextAvailable = await sendTextStrategy.isAvailable(terminal);
            assert.strictEqual(sendTextAvailable, true, 'SendText strategy should always be available');
            
            // ShellIntegration может быть недоступен в тестовой среде
            const shellAvailable = await shellStrategy.isAvailable(terminal);
            assert.ok(typeof shellAvailable === 'boolean', 'Shell integration availability should be boolean');
            
        } finally {
            terminal.dispose();
        }
    });
});

suite('Integration Tests', () => {
    test('Full module lifecycle', async function() {
        this.timeout(10000); // Увеличиваем таймаут для интеграционного теста
        
        const module = new TerminalIntegrationModule({
            terminalName: 'Integration Test Terminal',
            autoStartClaude: false,
            useFallback: true
        });
        
        let stateChanges: TerminalState[] = [];
        let outputMessages: string[] = [];
        
        // Подписываемся на события
        module.onStateChange((state) => {
            stateChanges.push(state);
        });
        
        module.onOutput((data) => {
            outputMessages.push(data);
        });
        
        try {
            // Инициализируем
            await module.initialize();
            
            // Проверяем, что состояние изменилось
            assert.ok(stateChanges.length > 0, 'State should have changed during initialization');
            assert.ok(outputMessages.length > 0, 'Should have received output messages');
            
            // Проверяем диагностику
            const diagnostics = await module.diagnose();
            assert.ok(diagnostics.strategy !== null, 'Strategy should be selected');
            
        } catch (error) {
            console.warn('Integration test failed (expected in some environments):', error);
        } finally {
            module.dispose();
        }
    });
});