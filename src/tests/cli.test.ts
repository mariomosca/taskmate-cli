import { parseCliArgs, validateCliArgs, CLIArgs } from '../utils/cli';

// Mock yargs per controllare gli argomenti
const mockYargs = {
  command: jest.fn().mockReturnThis(),
  option: jest.fn().mockReturnThis(),
  help: jest.fn().mockReturnThis(),
  alias: jest.fn().mockReturnThis(),
  example: jest.fn().mockReturnThis(),
  parseSync: jest.fn().mockReturnValue({
    _: [],
    resume: false,
    'session-id': undefined,
    debug: false
  })
};

jest.mock('yargs', () => {
  return jest.fn(() => mockYargs);
});

jest.mock('yargs/helpers', () => ({
  hideBin: jest.fn((argv) => argv.slice(2))
}));

describe('CLI Utils', () => {
  let mockYargs: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    const yargs = require('yargs');
    mockYargs = yargs();
  });

  describe('parseCliArgs', () => {
    it('should parse default arguments correctly', () => {
      mockYargs.parseSync.mockReturnValue({
        _: [],
        resume: false,
        'session-id': undefined,
        debug: false,
        provider: undefined,
        message: undefined,
        verbose: undefined
      });

      const result = parseCliArgs();

      expect(result).toEqual({
        command: undefined,
        resume: false,
        sessionId: undefined,
        debug: false,
        provider: undefined,
        message: undefined,
        verbose: undefined
      });
    });

    it('should parse resume flag correctly', () => {
      mockYargs.parseSync.mockReturnValue({
        _: [],
        resume: true,
        'session-id': undefined,
        debug: false,
        provider: undefined,
        message: undefined,
        verbose: undefined
      });

      const result = parseCliArgs();

      expect(result).toEqual({
        command: undefined,
        resume: true,
        sessionId: undefined,
        debug: false,
        provider: undefined,
        message: undefined,
        verbose: undefined
      });
    });

    it('should parse session-id correctly', () => {
      mockYargs.parseSync.mockReturnValue({
        _: [],
        resume: true,
        'session-id': 'test-session-123',
        debug: false,
        provider: undefined,
        message: undefined,
        verbose: undefined
      });

      const result = parseCliArgs();

      expect(result).toEqual({
        command: undefined,
        resume: true,
        sessionId: 'test-session-123',
        debug: false,
        provider: undefined,
        message: undefined,
        verbose: undefined
      });
    });

    it('should parse debug flag correctly', () => {
      mockYargs.parseSync.mockReturnValue({
        _: [],
        resume: false,
        'session-id': undefined,
        debug: true,
        provider: undefined,
        message: undefined,
        verbose: undefined
      });

      const result = parseCliArgs();

      expect(result).toEqual({
        command: undefined,
        resume: false,
        sessionId: undefined,
        debug: true,
        provider: undefined,
        message: undefined,
        verbose: undefined
      });
    });

    it('should parse provider correctly', () => {
      mockYargs.parseSync.mockReturnValue({
        _: [],
        resume: false,
        'session-id': undefined,
        debug: false,
        provider: 'claude',
        message: undefined,
        verbose: undefined
      });

      const result = parseCliArgs();

      expect(result).toEqual({
        command: undefined,
        resume: false,
        sessionId: undefined,
        debug: false,
        provider: 'claude',
        message: undefined,
        verbose: undefined
      });
    });

    it('should parse all arguments together', () => {
      mockYargs.parseSync.mockReturnValue({
        _: [],
        resume: true,
        'session-id': 'abc123',
        debug: true,
        provider: 'gemini'
      });

      const result = parseCliArgs();

      expect(result).toEqual({
        command: undefined,
        resume: true,
        sessionId: 'abc123',
        debug: true,
        provider: 'gemini',
        message: undefined,
        verbose: undefined
      });
    });

    it('should configure yargs options correctly', () => {
      mockYargs.parseSync.mockReturnValue({
        _: [],
        resume: false,
        'session-id': undefined,
        debug: false
      });
      
      parseCliArgs();

      // Verifica che le opzioni siano state configurate
      expect(mockYargs.option).toHaveBeenCalledWith('resume', expect.objectContaining({
        alias: 'r',
        type: 'boolean',
        default: false
      }));

      expect(mockYargs.option).toHaveBeenCalledWith('session-id', expect.objectContaining({
        alias: 's',
        type: 'string'
      }));

      expect(mockYargs.option).toHaveBeenCalledWith('debug', expect.objectContaining({
        alias: 'd',
        type: 'boolean',
        description: 'Enable debug mode',
        default: false
      }));

      expect(mockYargs.option).toHaveBeenCalledWith('provider', expect.objectContaining({
        alias: 'p',
        type: 'string',
        choices: ['claude', 'gemini'],
        description: 'LLM provider to use'
      }));

      expect(mockYargs.option).toHaveBeenCalledWith('message', expect.objectContaining({
        alias: 'm',
        type: 'string',
        description: 'Send an initial message to start the conversation'
      }));

      expect(mockYargs.option).toHaveBeenCalledWith('verbose', expect.objectContaining({
        alias: 'v',
        type: 'boolean',
        description: 'Show detailed CLI argument processing and debug information'
      }));

      expect(mockYargs.help).toHaveBeenCalled();
      expect(mockYargs.alias).toHaveBeenCalledWith('help', 'h');
    });
  });

  describe('validateCliArgs', () => {
    it('should validate valid arguments with no options', () => {
      const args: CLIArgs = {
        resume: false,
        debug: false
      };

      const result = validateCliArgs(args);

      expect(result).toEqual({ valid: true });
    });

    it('should validate valid arguments with resume only', () => {
      const args: CLIArgs = {
        resume: true,
        debug: false
      };

      const result = validateCliArgs(args);

      expect(result).toEqual({ valid: true });
    });

    it('should validate valid arguments with resume and session-id', () => {
      const args: CLIArgs = {
        resume: true,
        sessionId: 'test-session',
        debug: false
      };

      const result = validateCliArgs(args);

      expect(result).toEqual({ valid: true });
    });

    it('should validate valid arguments with debug', () => {
      const args: CLIArgs = {
        resume: false,
        debug: true
      };

      const result = validateCliArgs(args);

      expect(result).toEqual({ valid: true });
    });

    it('should validate valid arguments with provider', () => {
      const args: CLIArgs = {
        resume: false,
        debug: false,
        provider: 'claude'
      };

      const result = validateCliArgs(args);

      expect(result).toEqual({ valid: true });
    });

    it('should validate all valid options together', () => {
      const args: CLIArgs = {
        resume: true,
        sessionId: 'test-session',
        debug: true,
        provider: 'gemini'
      };

      const result = validateCliArgs(args);

      expect(result).toEqual({ valid: true });
    });

    it('should reject session-id without resume', () => {
      const args: CLIArgs = {
        resume: false,
        sessionId: 'test-session',
        debug: false
      };

      const result = validateCliArgs(args);

      expect(result).toEqual({
        valid: false,
        error: 'The --session-id option can only be used with --resume'
      });
    });

    it('should reject session-id with undefined resume', () => {
      const args: CLIArgs = {
        sessionId: 'test-session',
        debug: false
      };

      const result = validateCliArgs(args);

      expect(result).toEqual({
        valid: false,
        error: 'The --session-id option can only be used with --resume'
      });
    });

    it('should handle empty session-id with resume', () => {
      const args: CLIArgs = {
        resume: true,
        sessionId: '',
        debug: false
      };

      // Empty string is truthy, so validation passes
      const result = validateCliArgs(args);

      expect(result).toEqual({ valid: true });
    });

    it('should handle undefined session-id with resume', () => {
      const args: CLIArgs = {
        resume: true,
        sessionId: undefined,
        debug: false
      };

      const result = validateCliArgs(args);

      expect(result).toEqual({ valid: true });
    });
  });
});