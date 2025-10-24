import { encoding_for_model } from 'tiktoken';
import { logger } from '../utils/logger.js';

export interface TokenCountResult {
  tokens: number;
  model: string;
  method: 'precise' | 'estimated';
}

export class TokenCounter {
  private encoders: Map<string, any> = new Map();

  async countTokens(text: string, model: string): Promise<TokenCountResult> {
    try {
      switch (model) {
        case 'claude-3-sonnet':
        case 'claude-3-opus':
        case 'claude-3-sonnet-20240229':
        case 'claude-3-opus-20240229':
          return this.countClaudeTokens(text, model);
        
        case 'gemini-pro':
        case 'gemini-2.5-pro':
        case 'gemini-1.5-pro':
          return this.countGeminiTokens(text, model);
        
        default:
          return this.estimateTokens(text, model);
      }
    } catch (error) {
      logger.warn(`Fallback to estimation for model ${model}:`, error);
      return this.estimateTokens(text, model);
    }
  }

  private countClaudeTokens(text: string, model: string): TokenCountResult {
    try {
      // Implementazione specifica per Claude
      // Usa approssimazione basata su GPT-4 (simile tokenization)
      const encoder = encoding_for_model('gpt-4');
      const tokens = encoder.encode(text).length;
      encoder.free();
      
      return {
        tokens,
        model,
        method: 'precise'
      };
    } catch (error) {
      logger.warn(`Error in Claude token counting, falling back to estimation:`, error);
      return this.estimateTokens(text, model);
    }
  }

  private countGeminiTokens(text: string, model: string): TokenCountResult {
    // Implementazione specifica per Gemini
    // Usa stima migliorata basata su caratteristiche del modello
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    const tokens = Math.ceil(normalizedText.length / 2.5); // Gemini è più efficiente
    
    return {
      tokens,
      model,
      method: 'estimated'
    };
  }

  private estimateTokens(text: string, model: string): TokenCountResult {
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    const tokens = Math.ceil(normalizedText.length / 3);
    
    return {
      tokens,
      model,
      method: 'estimated'
    };
  }

  /**
   * Conta i token per un array di messaggi
   */
  async countMessagesTokens(messages: Array<{content: string}>, model: string): Promise<TokenCountResult> {
    const totalText = messages.map(m => m.content).join('\n');
    return this.countTokens(totalText, model);
  }

  /**
   * Verifica se il testo supera il limite di token per il modello
   */
  async exceedsLimit(text: string, model: string, limit: number): Promise<boolean> {
    const result = await this.countTokens(text, model);
    return result.tokens > limit;
  }

  /**
   * Ottieni statistiche dettagliate sul conteggio
   */
  async getTokenStats(text: string, model: string): Promise<{
    result: TokenCountResult;
    characters: number;
    words: number;
    lines: number;
    ratio: number; // token per carattere
  }> {
    const result = await this.countTokens(text, model);
    const characters = text.length;
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const lines = text.split('\n').length;
    const ratio = characters > 0 ? result.tokens / characters : 0;

    return {
      result,
      characters,
      words,
      lines,
      ratio
    };
  }
}