# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial open source release preparation
- Comprehensive documentation and contribution guidelines
- GitHub issue and PR templates
- Security policy and code of conduct

## [0.1.0] - 2024-01-XX

### Added
- AI-powered CLI for intelligent task management
- Integration with Claude (Anthropic) and Gemini (Google) LLMs
- Todoist integration for task synchronization
- Session management for conversation continuity
- Context-aware assistance with file and project understanding
- Cost monitoring and token usage tracking
- Interactive terminal interface with React/Ink
- Comprehensive error handling and retry mechanisms
- Local SQLite database for session storage
- Command-line interface with multiple operation modes
- Progress tracking and loading indicators
- Configurable AI model selection
- API metadata caching for performance optimization

### Features
- **Multi-LLM Support**: Choose between Claude and Gemini models
- **Todoist Integration**: Sync tasks and projects with Todoist
- **Session Management**: Persistent conversation history
- **Context Awareness**: File and project context understanding
- **Cost Tracking**: Monitor API usage and costs
- **Interactive UI**: Beautiful terminal interface
- **Error Recovery**: Robust error handling with retry logic
- **Local Storage**: SQLite database for data persistence
- **Configuration**: Flexible configuration management
- **Testing**: Comprehensive test suite with integration tests

### Technical Details
- Built with TypeScript and React/Ink
- Uses SQLite for local data storage
- Implements token counting and cost estimation
- Supports multiple AI model providers
- Includes comprehensive error handling
- Features modular service architecture
- Provides extensive logging and debugging capabilities

[Unreleased]: https://github.com/mariomosca/taskmate-cli/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mariomosca/taskmate-cli/releases/tag/v0.1.0