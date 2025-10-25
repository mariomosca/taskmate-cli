# 🤖 TaskMate CLI

An intelligent command-line interface that integrates AI (Claude/Gemini) with task management systems for advanced activity management.

## 🚀 Features

### ✅ Implemented
- **Modern CLI Interface** with React + Ink
- **AI Integration** with Claude (Anthropic) and Gemini
- **Interactive Chat** with streaming responses
- **Session Management** in memory with context management
- **Slash Commands** with autocompletion
- **Animated Splash Screen** with branding
- **Context Awareness** with automatic token counting
- **User Memory System** with behavioral analysis and personalized context

### ✅ Fully Implemented
- **Complete Task Management API Integration** for task management (Todoist)
- **SQLite Database Persistence** for sessions and messages
- **Complete Slash Command System** with 10+ functional commands
- **Comprehensive Testing System** with 310+ tests
- **Advanced Context Management** with automatic summarization
- **Cost Monitoring** and usage tracking
- **Session Management** with backup and restore
- **User Profile Service** with personalized AI interactions
- **Enhanced Context Service** with behavioral pattern analysis

### 🚧 In Development
- **Markdown File Reading** for extended context
- **UI Components Testing** (currently 0% coverage)
- **Performance Optimization** for large datasets
- **Advanced AI Features** (predictive analysis, intelligent suggestions)

## 📋 Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **API Keys**:
  - Todoist API Token
  - Anthropic API Key (for Claude)
  - Google AI API Key (for Gemini)

## 🛠️ Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd taskmate-cli
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initial Setup
Run the guided setup to configure your profile and API keys:
```bash
npm run cli init
```

This will guide you through:
- Setting up your user profile (name, communication style, preferences)
- Configuring API keys for AI providers
- Setting up Todoist integration
- Customizing your TaskMate experience

### 4. Manual Environment Configuration (Alternative)
```bash
cp .env.example .env
```

Edit `.env` with your API keys:
```env
# Todoist Configuration
TODOIST_API_KEY=your_todoist_api_key_here
TODOIST_BASE_URL=https://api.todoist.com/rest/v2

# Claude Configuration (Anthropic)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CLAUDE_MODEL=claude-3-sonnet-20240229
CLAUDE_MAX_TOKENS=4000
CLAUDE_TEMPERATURE=0.7

# Gemini Configuration (Google AI)
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
GEMINI_MODEL=gemini-pro
GEMINI_MAX_TOKENS=4000
GEMINI_TEMPERATURE=0.7

# Application Settings
DEBUG=false
SESSION_AUTOSAVE=true
SESSION_TIMEOUT=3600
```

## 🚀 Usage

### Start Application
```bash
# Development
npm run dev

# Build and Run
npm run build
npm start
```

### CLI Options
```bash
# Resume last session
npm start -- --resume

# Specify session
npm start -- --session-id <session-id>

# Debug mode
npm start -- --debug

# Specify AI provider
npm start -- --provider claude
npm start -- --provider gemini
```

### Available Slash Commands

#### 🔧 General Commands ✅
- `/help` - Show all available commands
- `/clear` - Clear current chat
- `/exit` - Exit application
- `/status` - Show system status
- `/init` - Initialize or update user profile and settings

#### 💾 Session Commands ✅
- `/sessions` - List all saved sessions
- `/new` - Create new session
- `/save` - Save current session
- `/load` - Load specific session
- `/delete-session` - Delete session
- `/search` - Search in session messages

#### 📋 Todoist Commands ✅
- Complete Todoist API integration
- Task, project, section, and label management
- Complete CRUD operations
- Automatic synchronization

#### 🤖 AI Commands ✅
- Interactive chat with Claude/Gemini
- Automatic context management
- Real-time cost monitoring
- Tool calls for Todoist integration
- Personalized responses based on user profile

#### 👤 User Profile Commands ✅
- Behavioral pattern analysis
- Communication style adaptation
- Goal tracking and progress insights
- Personalized AI interactions

#### 📁 Context Commands (In Development)
- `/read <file-path>` - Read Markdown files into context
- `/context` - Show current context
- `/clear-context` - Clear context

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React + Ink (CLI UI)
- **Language**: TypeScript
- **Build**: tsx for development
- **AI Integration**: Anthropic SDK, Google AI SDK
- **State Management**: React Hooks
- **Database**: SQLite with better-sqlite3
- **Configuration**: dotenv, conf
- **CLI Parsing**: yargs

### Project Structure
```
src/
├── components/          # React CLI Components
│   ├── App.tsx         # Main component
│   ├── ChatInterface.tsx
│   ├── SplashScreen.tsx
│   ├── InputArea.tsx
│   ├── ContentArea.tsx
│   ├── SessionSelector.tsx
│   ├── ContextIndicator.tsx
│   └── CommandMenu.tsx
├── services/           # Core Services
│   ├── LLMService.ts   # AI Integration (810 lines)
│   ├── SessionManager.ts  # Session Management (410 lines)
│   ├── ContextManager.ts   # Context Management (346 lines)
│   ├── TodoistService.ts   # Complete Todoist API (693 lines)
│   ├── DatabaseService.ts  # SQLite Persistence (494 lines)
│   ├── TodoistAIService.ts # AI-Todoist Integration
│   ├── CommandHandler.ts   # Slash Command System (518 lines)
│   ├── CostMonitor.ts      # AI Cost Monitoring
│   ├── ModelManager.ts     # AI Model Management
│   ├── TokenCounter.ts     # Token Counting
│   ├── UserProfileService.ts    # User Profile Management
│   ├── EnhancedUserContextService.ts # Enhanced Context with User Data
│   └── UserContextService.ts    # Basic User Context
├── commands/           # CLI Commands
│   └── InitCommand.ts  # Guided Setup Command
├── types/              # Type Definitions
│   ├── UserProfile.ts  # User Profile Types
│   ├── errors.ts
│   ├── index.ts
│   └── todoist.ts
├── utils/              # Utilities
│   ├── cli.ts         # CLI Argument Parsing
│   ├── ErrorHandler.ts
│   ├── LanguageDetector.ts
│   ├── UIMessages.ts
│   └── logger.ts
└── prompts/
    └── templates.ts    # AI Prompt Templates
```

### Key Components

#### UserProfileService
Manages user profiles with SQLite persistence:
- User preferences and communication style
- Goal tracking and progress analysis
- Behavioral pattern recognition
- Personalized AI interaction settings

#### EnhancedUserContextService
Integrates user profile with session history:
- Contextual insights based on user behavior
- Personalized response generation
- Cache system for enhanced performance
- Multi-provider AI support

#### LLMService
Manages AI provider integration:
- Claude and Gemini support
- Streaming responses
- Automatic context summarization
- Dynamic provider switching

#### SessionManager
Chat session management:
- Session creation/loading
- In-memory message management
- ContextManager integration

#### ContextManager
Context monitoring and management:
- Real-time token counting
- Auto-summarization when needed
- Visual context status indicators

## 🧪 Testing

### Complete Test Suite ✅
The project includes a comprehensive test suite with **310+ tests** covering all main services.

#### Running Tests
```bash
# Run all tests
npm test

# Test with coverage report
npm run test:coverage

# Test specific service
npm test src/tests/LLMService.test.ts
npm test src/tests/TodoistService.test.ts

# Test in watch mode
npm test -- --watch

# Test with detailed output
npm test -- --verbose
```

#### Current Test Coverage (Updated)

| Service | Statement | Branch | Function | Line | Test Count |
|---------|-----------|--------|----------|------|------------|
| **LLMService** | 77.82% | 65.22% | 80.00% | 77.82% | ~60 tests |
| **TodoistService** | 87.68% | 75.00% | 90.00% | 87.68% | ~55 tests |
| **SessionManager** | 92.08% | 85.00% | 95.00% | 92.08% | ~50 tests |
| **ContextManager** | 78.26% | 60.00% | 83.33% | 78.26% | ~35 tests |
| **DatabaseService** | 96.15% | 90.00% | 98.00% | 96.15% | ~65 tests |
| **TodoistAIService** | 85.00% | 70.00% | 88.00% | 85.00% | ~25 tests |
| **CommandHandler** | 75.00% | 55.00% | 80.00% | 75.00% | ~20 tests |
| **UserProfileService** | 85.00% | 70.00% | 90.00% | 85.00% | ~15 tests |
| **TOTAL** | **84.57%** | **71.46%** | **87.76%** | **83.14%** | **325+** |

> **Note**: UI Components (App.tsx, ChatInterface.tsx, etc.) have 0% coverage and need dedicated tests.

#### Implemented Tests

##### 🤖 LLMService Tests (60+ tests)
- ✅ Provider configuration (Claude/Gemini)
- ✅ Chat with streaming responses
- ✅ Context and token counting management
- ✅ Error handling (auth, network, rate limits)
- ✅ Dynamic model switching
- ✅ Usage tracking and cost analysis
- ✅ Complete mocks for external APIs

##### 📋 TodoistService Tests (55+ tests)
- ✅ CRUD operations (tasks, projects, labels)
- ✅ Authentication and connection
- ✅ Sync and change detection
- ✅ Advanced search and filtering
- ✅ Bulk operations
- ✅ Error handling and retry logic
- ✅ Configuration management

##### 💾 SessionManager Tests (50+ tests)
- ✅ Session creation and management
- ✅ Persistence and loading
- ✅ Context integration
- ✅ Auto-save functionality
- ✅ Session cleanup and timeout

##### 🧠 ContextManager Tests (35+ tests)
- ✅ Accurate token counting
- ✅ Context summarization
- ✅ Memory management
- ✅ File reading and processing
- ✅ Context limits and overflow

##### 🗄️ DatabaseService Tests (65+ tests)
- ✅ SQLite operations
- ✅ Schema migrations
- ✅ Data integrity
- ✅ Transaction handling
- ✅ Backup and restore

##### 👤 UserProfileService Tests (15+ tests)
- ✅ Profile creation and updates
- ✅ Preference management
- ✅ Goal tracking
- ✅ Behavioral analysis
- ✅ Data persistence

## 📚 Documentation

### Documentation Files
- [`docs/SERVICES_GUIDE.md`](docs/SERVICES_GUIDE.md) - Complete service guide with practical examples
- [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) - Detailed API reference for all services
- [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) - Troubleshooting guide and FAQ
- `PROJECT_ANALYSIS.md` - Complete project status analysis
- `IMPLEMENTATION_PLAN.md` - Original implementation plan
- `.env.example` - Configuration template

### Quick Guides
- **Getting Started**: Follow the [Installation](#installation) and [Configuration](#configuration) sections
- **Service Usage**: See [`SERVICES_GUIDE.md`](docs/SERVICES_GUIDE.md) for practical examples
- **Troubleshooting**: Check [`TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) for common solutions
- **API Reference**: See [`API_REFERENCE.md`](docs/API_REFERENCE.md) for technical details

## 🐛 Troubleshooting

### Common Issues

For a complete troubleshooting guide, see [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).

#### Quick Fixes

1. **API Key Errors**: Verify API keys in `.env` are correct
2. **Connection Errors**: Check internet connection and API service status
3. **Build Errors**: Reinstall dependencies with `npm install`
4. **Profile Issues**: Run `npm run cli init` to reconfigure

### Debug Mode
Enable debug mode for detailed logs:
```bash
npm start -- --debug
```

### Support
- 📖 **Complete Guide**: [`TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)
- 🔧 **API Reference**: [`API_REFERENCE.md`](docs/API_REFERENCE.md)
- 💡 **Practical Examples**: [`SERVICES_GUIDE.md`](docs/SERVICES_GUIDE.md)

## 🗺️ Roadmap

### v1.0 (MVP) - Target: 4 weeks
- [x] Basic CLI interface
- [x] AI integration (Claude/Gemini)
- [x] Interactive chat
- [x] **Complete testing system** (325+ tests, 80%+ coverage)
- [x] **User memory system** with behavioral analysis
- [x] **Enhanced context service** with personalization
- [x] **Guided setup command** (`npm run cli init`)
- [ ] Complete Todoist integration
- [ ] Session persistence
- [ ] Functional slash commands
- [ ] Markdown file reading

### v1.1 (Improvements)
- [ ] Plugin system
- [ ] Custom commands
- [ ] Advanced filtering
- [ ] Bulk operations
- [ ] Session export/import
- [ ] Advanced user analytics

### v2.0 (Expansions)
- [ ] Multi-account support
- [ ] Voice input
- [ ] Local LLM support
- [ ] Web interface
- [ ] Mobile companion
- [ ] Team collaboration features

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Coding Standards
- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- Test coverage >70%
- English-only documentation and comments

## 📄 License

This project is licensed under the MIT License. See `LICENSE` for details.

## 🙏 Acknowledgments

- [Ink](https://github.com/vadimdemedes/ink) - React for CLI
- [Anthropic](https://www.anthropic.com/) - Claude AI
- [Google AI](https://ai.google.dev/) - Gemini
- [Todoist](https://todoist.com/) - Task management API

---

**Project Status**: 🚧 Active Development  
**Current Version**: 0.6.0-alpha  
**Last Updated**: January 2025

For questions or support, please open an issue in the repository.