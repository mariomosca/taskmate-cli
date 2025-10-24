import { TokenCounter } from '../services/TokenCounter';

describe('TokenCounter', () => {
  let tokenCounter: TokenCounter;

  beforeEach(() => {
    tokenCounter = new TokenCounter();
  });

  describe('countTokens', () => {
    it('should count tokens for Claude models', async () => {
      const text = 'Hello, world! This is a test message.';
      const result = await tokenCounter.countTokens(text, 'claude-3-sonnet-20240229');
      
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.model).toBe('claude-3-sonnet-20240229');
      expect(['precise', 'estimated']).toContain(result.method);
    });

    it('should count tokens for Gemini models', async () => {
      const text = 'Hello, world! This is a test message.';
      const result = await tokenCounter.countTokens(text, 'gemini-pro');
      
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.model).toBe('gemini-pro');
      expect(['precise', 'estimated']).toContain(result.method);
    });

    it('should handle empty text', async () => {
      const result = await tokenCounter.countTokens('', 'claude-3-sonnet-20240229');
      expect(result.tokens).toBe(0);
    });

    it('should handle very long text', async () => {
      const longText = 'word '.repeat(10000);
      const result = await tokenCounter.countTokens(longText, 'claude-3-sonnet-20240229');
      
      expect(result.tokens).toBeGreaterThan(1000);
    });

    it('should fallback to estimation for unknown models', async () => {
      const text = 'test message';
      const result = await tokenCounter.countTokens(text, 'unknown-model');
      
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.method).toBe('estimated');
    });
  });

  describe('countMessagesTokens', () => {
    it('should count tokens for message array', async () => {
      const messages = [
        { content: 'Hello, how are you?' },
        { content: 'I am doing well, thank you!' }
      ];
      
      const result = await tokenCounter.countMessagesTokens(messages, 'claude-3-sonnet-20240229');
      
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.model).toBe('claude-3-sonnet-20240229');
    });

    it('should handle empty message array', async () => {
      const result = await tokenCounter.countMessagesTokens([], 'claude-3-sonnet-20240229');
      expect(result.tokens).toBe(0);
    });
  });

  describe('exceedsLimit', () => {
    it('should return false when under limit', async () => {
      const shortText = 'Hello';
      const exceeds = await tokenCounter.exceedsLimit(shortText, 'claude-3-sonnet-20240229', 1000);
      
      expect(exceeds).toBe(false);
    });

    it('should return true when over limit', async () => {
      const longText = 'word '.repeat(1000);
      const exceeds = await tokenCounter.exceedsLimit(longText, 'claude-3-sonnet-20240229', 10);
      
      expect(exceeds).toBe(true);
    });
  });

  describe('getTokenStats', () => {
    it('should provide detailed statistics', async () => {
      const text = 'Hello, how are you today? I am doing well, thank you for asking!';
      
      const stats = await tokenCounter.getTokenStats(text, 'claude-3-sonnet-20240229');
      
      expect(stats).toHaveProperty('result');
      expect(stats).toHaveProperty('characters');
      expect(stats).toHaveProperty('words');
      expect(stats).toHaveProperty('lines');
      expect(stats).toHaveProperty('ratio');
      
      expect(stats.result.tokens).toBeGreaterThan(0);
      expect(stats.characters).toBe(text.length);
      expect(stats.words).toBeGreaterThan(0);
      expect(stats.lines).toBeGreaterThan(0);
      expect(stats.ratio).toBeGreaterThan(0);
    });

    it('should handle empty text', async () => {
      const stats = await tokenCounter.getTokenStats('', 'claude-3-sonnet-20240229');
      
      expect(stats.result.tokens).toBe(0);
      expect(stats.characters).toBe(0);
      expect(stats.words).toBe(0);
      expect(stats.lines).toBe(1); // Empty text still has 1 line
      expect(stats.ratio).toBe(0);
    });
  });

  describe('model detection', () => {
    it('should detect Claude models correctly', async () => {
      const claudeModels = [
        'claude-3-sonnet-20240229',
        'claude-3-opus-20240229'
      ];
      
      for (const model of claudeModels) {
        const result = await tokenCounter.countTokens('test', model);
        expect(result.tokens).toBeGreaterThan(0);
        expect(result.model).toBe(model);
      }
    });

    it('should detect Gemini models correctly', async () => {
      const geminiModels = [
        'gemini-pro',
        'gemini-1.5-pro'
      ];
      
      for (const model of geminiModels) {
        const result = await tokenCounter.countTokens('test', model);
        expect(result.tokens).toBeGreaterThan(0);
        expect(result.model).toBe(model);
      }
    });
  });
});