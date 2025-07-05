# Claude Code HUB v0.2.0 🚀

**Псевдотерминал для Claude Code с полным контролем процесса**

[![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)](./CHANGELOG.md)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.88%2B-green.svg)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](./LICENSE)

## 🎯 Революция в архитектуре v0.2.0

**BREAKING CHANGES**: Полный переход с Shell Integration на псевдотерминал!

### ✨ Новая архитектура
- **Псевдотерминал**: Прямое управление процессом Claude через `vscode.Pseudoterminal`
- **Полный контроль**: Управление stdin/stdout без ограничений VS Code Terminal API
- **Простота**: 100 строк кода вместо 2000 - в 20 раз меньше сложности
- **Надежность**: Нет проблем с Shell Integration - работает всегда

### 🔄 Что изменилось
- **Удалено**: Вся архитектура Shell Integration (1955 строк кода)
- **Добавлено**: ClaudePseudoTerminal для прямого управления процессом
- **Упрощено**: Одна команда вместо множества
- **Улучшено**: Размер пакета сокращен с 41KB до 21KB

## 🚀 Быстрый старт

### Требования
- **VS Code 1.88+** (для Pseudoterminal API)
- **Claude CLI** установлен и доступен в PATH

### Установка
1. Установите VSIX пакет в VS Code
2. Откройте Command Palette (`Ctrl+Shift+P`)
3. Выполните команду: **"Open Claude Pseudo Terminal"**
4. Начните взаимодействие с Claude!

### Использование
```bash
# Проверьте доступность Claude CLI
claude --version

# В VS Code:
# 1. Откройте Command Palette (Ctrl+Shift+P)
# 2. Найдите: "Open Claude Pseudo Terminal"  
# 3. Псевдотерминал откроется с echo-режимом
```

## 🔧 Архитектура

### Компоненты системы
```
┌─────────────────────────────────────────────┐
│              WebView UI                     │
│  ┌─────────────┐ ┌─────────────────────────┐ │
│  │ Status Bar  │ │    Chat Interface       │ │
│  │ Controls    │ │    Diagnostics         │ │
│  └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────┐
│        Terminal Integration Module          │
│  ┌─────────────────┐ ┌─────────────────────┐ │
│  │ Shell Integration│ │   Send Text        │ │
│  │ Strategy (1.88+) │ │ Strategy (Fallback) │ │
│  └─────────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────┐
│           VS Code Terminal                  │
│              Claude CLI                     │
└─────────────────────────────────────────────┘
```

### Стратегии взаимодействия
1. **ShellIntegrationStrategy** (Приоритет: 100)
   - Полная двусторонняя коммуникация
   - Real-time потоки вывода
   - Отслеживание выполнения команд

2. **SendTextStrategy** (Приоритет: 10)
   - Базовая отправка команд
   - Совместимость со старыми версиями
   - Ограниченный мониторинг

## 📊 Мониторинг и диагностика

### Статусы системы
- 🟢 **Active**: Claude готов к работе
- 🟡 **Initializing**: Настройка интеграции
- 🔴 **Error**: Обнаружена проблема

### Диагностическая информация
- Текущая стратегия взаимодействия
- Состояние Shell Integration
- Здоровье терминала
- Совместимость системы
- Рекомендации по устранению проблем

## 🧪 Тестирование

```bash
# Компиляция
npm run compile

# Запуск тестов
npm test

# Режим разработки
npm run watch
```

## 📚 Документация

- [📖 README_v2.md](./README_v2.md) - Полная документация
- [💡 INSPIRATION.md](./INSPIRATION.md) - Источники вдохновения
- [📝 CHANGELOG.md](./CHANGELOG.md) - История изменений

## 🛠️ Разработка

### Сборка из исходников
```bash
git clone <repository-url>
cd claude-code-hub
npm install
npm run compile
npm run package
```

### Структура проекта
```
src/
├── interfaces/           # TypeScript интерфейсы
├── terminal/            # Модули терминальной интеграции
│   ├── strategies/      # Стратегии взаимодействия
│   ├── TerminalIntegrationModule.ts
│   └── ShellIntegrationManager.ts
├── webviewProvider_v2.ts
├── extension_v2.ts
└── test/               # Тесты
```

## 🐛 Устранение проблем

### Частые проблемы
- **Shell Integration недоступен**: Обновите VS Code до 1.88+
- **Claude команда не найдена**: Проверьте установку Claude CLI
- **Проблемы подключения**: Используйте кнопку "Diagnostics"

### Получение помощи
1. Используйте встроенную диагностику
2. Проверьте консоль разработчика VS Code
3. Просмотрите вывод терминала
4. Создайте issue с диагностической информацией

## 🤝 Вклад в проект

Мы приветствуем вклад сообщества! Области для улучшения:
- Дополнительные стратегии коммуникации
- Механизмы восстановления после ошибок
- Оптимизация производительности
- Улучшения UI/UX

## 📄 Лицензия

Этот проект является частью инициативы ClaudeCodeBridge. См. основной репозиторий для информации о лицензии.

---

**Сделано с ❤️ для сообщества VS Code и Claude**

*Claude Code Bridge v2 - Bringing AI-powered development directly to your IDE*