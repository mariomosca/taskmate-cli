import { parseCliArgs, validateCliArgs, CLIArgs } from '../utils/cli';

// Mock yargs per controllare gli argomenti
jest.mock('yargs', () => {
  const mockYargs = {
    option: jest.fn().mockReturnThis(),
    help: jest.fn().mockReturnThis(),
    alias: jest.fn().mockReturnThis(),
    example: jest.fn().mockReturnThis(),
    parseSync: jest.fn()
  };
  
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
        resume: false,
        'session-id': undefined,
        debug: false,
        provider: undefined
      });

      const result = parseCliArgs();

      expect(result).toEqual({
        resume: false,
        sessionId: undefined,
        debug: false,
        provider: undefined
      });
    });

    it('should parse resume flag correctly', () => {
      mockYargs.parseSync.mockReturnValue({
        resume: true,
        'session-id': undefined,
        debug: false,
        provider: undefined
      });

      const result = parseCliArgs();

      expect(result).toEqual({
        resume: true,
        sessionId: undefined,
        debug: false,
        provider: undefined
      });
    });

    it('should parse session-id correctly', () => {
      mockYargs.parseSync.mockReturnValue({
        resume: true,
        'session-id': 'test-session-123',
        debug: false,
        provider: undefined
      });

      const result = parseCliArgs();

      expect(result).toEqual({
        resume: true,
        sessionId: 'test-session-123',
        debug: false,
        provider: undefined
      });
    });

    it('should parse debug flag correctly', () => {
      mockYargs.parseSync.mockReturnValue({
        resume: false,
        'session-id': undefined,
        debug: true,
        provider: undefined
      });

      const result = parseCliArgs();

      expect(result).toEqual({
        resume: false,
        sessionId: undefined,
        debug: true,
        provider: undefined
      });
    });

    it('should parse provider correctly', () => {
      mockYargs.parseSync.mockReturnValue({
        resume: false,
        'session-id': undefined,
        debug: false,
        provider: 'claude'
      });

      const result = parseCliArgs();

      expect(result).toEqual({
        resume: false,
        sessionId: undefined,
        debug: false,
        provider: 'claude'
      });
    });

    it('should parse all arguments together', () => {
      mockYargs.parseSync.mockReturnValue({
        resume: true,
        'session-id': 'abc123',
        debug: true,
        provider: 'gemini'
      });

      const result = parseCliArgs();

      expect(result).toEqual({
        resume: true,
        sessionId: 'abc123',
        debug: true,
        provider: 'gemini'
      });
    });

    it('should configure yargs options correctly', () => {
      mockYargs.parseSync.mockReturnValue({});
      
      parseCliArgs();

      // Verifica che le opzioni siano state configurate
      expect(mockYargs.option).toHaveBeenCalledWith('resume', {
        alias: 'r',
        type: 'boolean',
        description: 'Riprendi una sessione esistente',
        default: false
      });

      expect(mockYargs.option).toHaveBeenCalledWith('session-id', {
        alias: 's',
        type: 'string',
        description: 'ID della sessione da riprendere (usato con --resume)'
      });

      expect(mockYargs.option).toHaveBeenCalledWith('debug', {
        alias: 'd',
        type: 'boolean',
        description: 'Abilita modalità debug',
        default: false
      });

      expect(mockYargs.option).toHaveBeenCalledWith('provider', {
        alias: 'p',
        type: 'string',
        choices: ['claude', 'gemini'],
        description: 'Provider LLM da utilizzare'
      });

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
        error: 'L\'opzione --session-id può essere usata solo con --resume'
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
        error: 'L\'opzione --session-id può essere usata solo con --resume'
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