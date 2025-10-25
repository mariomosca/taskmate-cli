# Contributing to TaskMate CLI

Thank you for your interest in contributing to TaskMate CLI! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- API keys for:
  - Todoist API
  - Anthropic Claude API (optional)
  - Google Gemini API (optional)

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/taskmate-cli.git
   cd taskmate-cli
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Start development**
   ```bash
   npm run dev
   ```

## 📋 How to Contribute

### Reporting Issues

- Use the GitHub issue tracker
- Check if the issue already exists
- Provide clear reproduction steps
- Include system information and error messages

### Submitting Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

4. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```

5. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

## 🎯 Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Testing

- Write unit tests for new functions
- Maintain test coverage above 75%
- Test both success and error scenarios
- Use descriptive test names

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `style:` formatting changes
- `refactor:` code refactoring
- `test:` adding tests
- `chore:` maintenance tasks

### Pull Request Guidelines

- Keep PRs focused and atomic
- Include a clear description of changes
- Reference related issues
- Ensure all tests pass
- Update documentation if needed

## 🏗️ Project Structure

```
src/
├── components/     # React components (Ink-based)
├── services/      # Business logic and API integrations
├── utils/         # Utility functions
├── types/         # TypeScript type definitions
├── prompts/       # LLM prompt templates
└── __tests__/     # Test files
```

### Key Components

- **LLMService**: AI integration and conversation management
- **TodoistService**: Todoist API integration
- **SessionManager**: Session persistence and management
- **DatabaseService**: SQLite database operations

## 🔧 Available Scripts

- `npm run dev` - Start development mode
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting issues

## 📚 Resources

- [Project Documentation](./README.md)
- [API Reference](./API_REFERENCE.md)
- [Services Guide](./SERVICES_GUIDE.md)
- [Migration Guide](./MIGRATION.md)

## 🤝 Community

- Be respectful and inclusive
- Help others learn and grow
- Share knowledge and best practices
- Follow the [Code of Conduct](./CODE_OF_CONDUCT.md)

## 📄 License

By contributing to TaskMate CLI, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to TaskMate CLI! 🎉