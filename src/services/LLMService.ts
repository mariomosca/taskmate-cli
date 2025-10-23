import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { PromptProcessor, SUMMARIZE_CONTEXT } from '../prompts/templates';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class LLMService {
  private anthropic?: Anthropic;
  private defaultProvider: string;

  constructor() {
    this.defaultProvider = process.env.DEFAULT_LLM || 'claude';
    
    const anthropicKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      this.anthropic = new Anthropic({
        apiKey: anthropicKey,
      });
    }
  }

  async chat(messages: LLMMessage[], provider?: string): Promise<LLMResponse> {
    const selectedProvider = provider || this.defaultProvider;

    switch (selectedProvider) {
      case 'claude':
        return this.chatWithClaude(messages);
      case 'gemini':
        return this.chatWithGemini(messages);
      default:
        throw new Error(`Provider ${selectedProvider} non supportato`);
    }
  }

  async summarizeContext(chatHistory: string): Promise<string> {
    // Usa il template centralizzato per il riassunto
    const prompt = PromptProcessor.process(SUMMARIZE_CONTEXT, { chatHistory });
    
    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await this.chat(messages);
    return response.content;
  }

  private async chatWithClaude(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.anthropic) {
      throw new Error('Chiave API Claude non configurata');
    }

    // Separa i messaggi di sistema dagli altri
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const systemContent = systemMessages.map(m => m.content).join('\n\n');

    try {
      const response = await this.anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
        max_tokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4096'),
        temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7'),
        system: systemContent || undefined,
        messages: conversationMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return {
          content: content.text,
          usage: {
            input_tokens: response.usage.input_tokens,
            output_tokens: response.usage.output_tokens
          }
        };
      }

      throw new Error('Risposta non valida da Claude');
    } catch (error) {
      console.error('Errore chiamata Claude:', error);
      throw new Error(`Errore Claude: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }

  private async chatWithGemini(messages: LLMMessage[]): Promise<LLMResponse> {
    const googleApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      throw new Error('Chiave API Gemini non configurata');
    }

    try {
      // Converti i messaggi nel formato Gemini
      const contents = messages
        .filter(m => m.role !== 'system')
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

      const systemInstruction = messages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n\n');

      const requestBody = {
        contents,
        generationConfig: {
          temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
          maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '4096'),
        },
        ...(systemInstruction && {
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          }
        })
      };

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-pro'}:generateContent?key=${googleApiKey}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000
        }
      );

      const candidate = response.data.candidates?.[0];
      if (!candidate?.content?.parts?.[0]?.text) {
        throw new Error('Risposta non valida da Gemini');
      }

      return {
        content: candidate.content.parts[0].text,
        usage: {
          input_tokens: response.data.usageMetadata?.promptTokenCount || 0,
          output_tokens: response.data.usageMetadata?.candidatesTokenCount || 0
        }
      };
    } catch (error) {
      console.error('Errore chiamata Gemini:', error);
      throw new Error(`Errore Gemini: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }

  isConfigured(): boolean {
    const anthropicKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    const googleKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    return !!(anthropicKey || googleKey);
  }

  getAvailableProviders(): string[] {
    const providers: string[] = [];
    const anthropicKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    const googleKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (anthropicKey) providers.push('claude');
    if (googleKey) providers.push('gemini');
    return providers;
  }
}

export const llmService = new LLMService();