/**
 * Language Detection Utility
 * Detects the language of user input to adapt responses accordingly
 */

export type SupportedLanguage = 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageInfo> = {
  en: { code: 'en', name: 'English', nativeName: 'English' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español' },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português' }
};

// Language detection patterns
const LANGUAGE_PATTERNS: Record<SupportedLanguage, RegExp[]> = {
  es: [
    /\b(hola|gracias|por favor|sí|no|cómo|qué|cuándo|dónde|por qué|hacer|tarea|proyecto|gestión)\b/i,
    /\b(español|castellano|tareas|proyectos|gestionar|organizar|planificar)\b/i,
    /\b(buenos días|buenas tardes|buenas noches|muchas gracias|de nada)\b/i
  ],
  it: [
    /\b(ciao|grazie|prego|sì|no|come|cosa|quando|dove|perché|fare|compito|progetto|gestione)\b/i,
    /\b(italiano|compiti|progetti|gestire|organizzare|pianificare)\b/i,
    /\b(buongiorno|buonasera|buonanotte|molte grazie|prego)\b/i
  ],
  fr: [
    /\b(bonjour|merci|s'il vous plaît|oui|non|comment|quoi|quand|où|pourquoi|faire|tâche|projet|gestion)\b/i,
    /\b(français|tâches|projets|gérer|organiser|planifier)\b/i,
    /\b(bonsoir|bonne nuit|merci beaucoup|de rien)\b/i
  ],
  de: [
    /\b(hallo|danke|bitte|ja|nein|wie|was|wann|wo|warum|machen|aufgabe|projekt|verwaltung)\b/i,
    /\b(deutsch|aufgaben|projekte|verwalten|organisieren|planen)\b/i,
    /\b(guten morgen|guten abend|gute nacht|vielen dank|bitte schön)\b/i
  ],
  pt: [
    /\b(olá|obrigado|obrigada|por favor|sim|não|como|o que|quando|onde|por que|fazer|tarefa|projeto|gestão)\b/i,
    /\b(português|tarefas|projetos|gerenciar|organizar|planejar)\b/i,
    /\b(bom dia|boa tarde|boa noite|muito obrigado|de nada)\b/i
  ],
  en: [
    /\b(hello|hi|thanks|thank you|please|yes|no|how|what|when|where|why|do|task|project|management)\b/i,
    /\b(english|tasks|projects|manage|organize|plan)\b/i,
    /\b(good morning|good evening|good night|thank you very much|you're welcome)\b/i
  ]
};

export class LanguageDetector {
  private static userLanguageCache: SupportedLanguage | null = null;
  private static languageHistory: Array<{ text: string; detectedLanguage: SupportedLanguage; confidence: number }> = [];

  /**
   * Detects the language of the given text
   */
  static detectLanguage(text: string): { language: SupportedLanguage; confidence: number } {
    if (!text || text.trim().length === 0) {
      return { language: 'en', confidence: 0.1 };
    }

    const scores: Record<SupportedLanguage, number> = {
      en: 0, es: 0, it: 0, fr: 0, de: 0, pt: 0
    };

    // Check patterns for each language
    for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      const language = lang as SupportedLanguage;
      let langScore = 0;

      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          langScore += matches.length * 2; // Weight for pattern matches
        }
      }

      // Additional scoring based on character patterns
      if (language === 'es') {
        langScore += (text.match(/[ñáéíóúü]/g) || []).length * 3;
      } else if (language === 'it') {
        langScore += (text.match(/[àèéìíîòóù]/g) || []).length * 3;
      } else if (language === 'fr') {
        langScore += (text.match(/[àâäéèêëïîôöùûüÿç]/g) || []).length * 3;
      } else if (language === 'de') {
        langScore += (text.match(/[äöüß]/g) || []).length * 3;
      } else if (language === 'pt') {
        langScore += (text.match(/[ãâáàçéêíóôõú]/g) || []).length * 3;
      }

      scores[language] = langScore;
    }

    // Find the language with the highest score
    const maxScore = Math.max(...Object.values(scores));
    const detectedLanguage = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as SupportedLanguage || 'en';
    
    // Calculate confidence (0-1)
    const totalWords = text.split(/\s+/).length;
    const confidence = Math.min(maxScore / (totalWords * 2), 1);

    // If confidence is too low, use cached language or default to English
    if (confidence < 0.3 && this.userLanguageCache) {
      return { language: this.userLanguageCache, confidence: 0.5 };
    }

    // Cache the detected language if confidence is high enough
    if (confidence > 0.6) {
      this.userLanguageCache = detectedLanguage;
    }

    // Store in history
    this.languageHistory.push({ text, detectedLanguage, confidence });
    if (this.languageHistory.length > 10) {
      this.languageHistory.shift();
    }

    return { language: detectedLanguage, confidence };
  }

  /**
   * Gets the user's preferred language based on recent interactions
   */
  static getUserPreferredLanguage(): SupportedLanguage {
    if (this.userLanguageCache) {
      return this.userLanguageCache;
    }

    // Analyze recent history to determine preferred language
    if (this.languageHistory.length > 0) {
      const languageCounts: Record<SupportedLanguage, number> = {
        en: 0, es: 0, it: 0, fr: 0, de: 0, pt: 0
      };

      this.languageHistory.forEach(entry => {
        if (entry.confidence > 0.5) {
          languageCounts[entry.detectedLanguage]++;
        }
      });

      const mostUsed = Object.entries(languageCounts)
        .sort(([,a], [,b]) => b - a)[0][0] as SupportedLanguage;

      if (languageCounts[mostUsed] > 0) {
        this.userLanguageCache = mostUsed;
        return mostUsed;
      }
    }

    return 'en'; // Default to English
  }

  /**
   * Sets the user's preferred language manually
   */
  static setUserLanguage(language: SupportedLanguage): void {
    this.userLanguageCache = language;
  }

  /**
   * Clears the language cache and history
   */
  static clearCache(): void {
    this.userLanguageCache = null;
    this.languageHistory = [];
  }

  /**
   * Gets language information
   */
  static getLanguageInfo(language: SupportedLanguage): LanguageInfo {
    return SUPPORTED_LANGUAGES[language];
  }

  /**
   * Checks if a language is supported
   */
  static isLanguageSupported(language: string): language is SupportedLanguage {
    return language in SUPPORTED_LANGUAGES;
  }
}