/**
 * Prompt Templates for TaskMate CLI
 * Centralizes all system prompts for easier management and modification
 */

import { LanguageDetector, SupportedLanguage } from '../utils/LanguageDetector.js';
import { MULTILINGUAL_PROMPT_TEMPLATES, MultilingualPromptName } from './multilingualTemplates.js';

export interface PromptTemplate {
  name: string;
  template: string;
  variables?: readonly string[];
  description: string;
}

export const PROMPT_TEMPLATES = {
  // Context Management
  SUMMARIZE_CONTEXT: {
    name: 'summarize_context',
    description: 'Summarizes a previous conversation to provide context',
    variables: ['chatHistory'],
    template: `You are an AI assistant that needs to summarize a previous conversation to provide context for a new session.

Summarize the key points, decisions made, and current state of the project/discussion in a concise but complete manner.
Keep important technical information and project context.

Conversation to summarize:
{chatHistory}

Provide a structured summary that can be used as context to continue this conversation.`
  },

  SUMMARIZE_SESSION: {
    name: 'summarize_session',
    description: 'Summarizes a session to reduce context when approaching the limit',
    variables: ['chatHistory'],
    template: `Summarize this previous conversation concisely but completely, maintaining key points and important context to continue the discussion:

{chatHistory}

IMPORTANT: The summary should be much shorter than the original but contain all essential information to continue the conversation naturally.`
  },

  // Todoist Integration
  TODOIST_TASK_ANALYSIS: {
    name: 'todoist_task_analysis',
    description: 'Analyzes and suggests improvements for Todoist tasks',
    variables: ['tasks', 'context'],
    template: `You are an AI assistant specialized in productivity management with Todoist.

Analyze the following tasks and provide suggestions to improve organization, priorities, and productivity:

Current tasks:
{tasks}

Additional context:
{context}

Provide specific and actionable suggestions to optimize task management.`
  },

  TODOIST_PROJECT_ORGANIZATION: {
    name: 'todoist_project_organization',
    description: 'Suggests how to organize projects and tasks in Todoist',
    variables: ['projects', 'tasks', 'goals'],
    template: `Analyze the current structure of projects and tasks in Todoist and suggest improvements for organization:

Current projects:
{projects}

Tasks:
{tasks}

Goals/Context:
{goals}

Suggest an optimal organizational structure to maximize productivity.`
  },

  // AI Conversation
  GENERAL_ASSISTANT: {
    name: 'general_assistant',
    description: 'System prompt for general conversations',
    variables: ['context'],
    template: `You are an intelligent and helpful AI assistant for productivity and task management.

You can help with:
- Task management and organization
- Productivity analysis
- Suggestions to improve efficiency
- General conversations about projects
- Integration with task management systems

{context}

Respond in a helpful, concise, and action-oriented manner.`
  },

  // Error Handling
  ERROR_RECOVERY: {
    name: 'error_recovery',
    description: 'Handles errors and provides recovery suggestions',
    variables: ['error', 'context'],
    template: `An error occurred during the operation:

Error: {error}
Context: {context}

Provide a clear explanation of the error and suggest possible solutions or alternatives to complete the requested operation.`
  }
} as const;

/**
 * Utility per processare i template sostituendo le variabili
 */
export class PromptProcessor {
  static process(template: PromptTemplate, variables: Record<string, string>): string {
    let result = template.template;
    
    if (template.variables) {
      for (const variable of template.variables) {
        const value = variables[variable] || '';
        result = result.replace(new RegExp(`{${variable}}`, 'g'), value);
      }
    }
    
    return result;
  }

  /**
   * Process a multilingual template with automatic language detection
   */
  static processMultilingual(
    templateName: MultilingualPromptName, 
    variables: Record<string, string>,
    userInput?: string,
    preferredLanguage?: SupportedLanguage
  ): string {
    const multiTemplate = MULTILINGUAL_PROMPT_TEMPLATES[templateName];
    
    // Determine the language to use
    let language: SupportedLanguage;
    
    if (preferredLanguage && preferredLanguage in multiTemplate.templates) {
      language = preferredLanguage;
    } else if (userInput) {
      const detection = LanguageDetector.detectLanguage(userInput);
      language = detection.language;
    } else {
      language = LanguageDetector.getUserPreferredLanguage();
    }
    
    // Get the template in the detected/preferred language
    const template = multiTemplate.templates[language];
    
    // Process variables
    let result: string = template;
    if (multiTemplate.variables) {
      for (const variable of multiTemplate.variables) {
        const value = variables[variable] || '';
        result = result.replace(new RegExp(`{${variable}}`, 'g'), value);
      }
    }
    
    return result;
  }

  /**
   * Get a template with language adaptation
   */
  static getMultilingualTemplate(
    templateName: MultilingualPromptName,
    language?: SupportedLanguage
  ): PromptTemplate {
    const multiTemplate = MULTILINGUAL_PROMPT_TEMPLATES[templateName];
    const targetLanguage = language || LanguageDetector.getUserPreferredLanguage();
    
    return {
      name: multiTemplate.name,
      description: multiTemplate.description,
      variables: multiTemplate.variables,
      template: multiTemplate.templates[targetLanguage]
    };
  }

  static getTemplate(name: keyof typeof PROMPT_TEMPLATES): PromptTemplate {
    return PROMPT_TEMPLATES[name];
  }

  static listTemplates(): string[] {
    return Object.keys(PROMPT_TEMPLATES);
  }

  static listMultilingualTemplates(): string[] {
    return Object.keys(MULTILINGUAL_PROMPT_TEMPLATES);
  }

  static validateVariables(template: PromptTemplate, variables: Record<string, string>): boolean {
    if (!template.variables) return true;
    
    return template.variables.every(variable => 
      variables.hasOwnProperty(variable) && variables[variable] !== undefined
    );
  }

  /**
   * Detect user language from input and cache it
   */
  static detectAndCacheUserLanguage(userInput: string): SupportedLanguage {
    const detection = LanguageDetector.detectLanguage(userInput);
    return detection.language;
  }

  /**
   * Set user's preferred language manually
   */
  static setUserLanguage(language: SupportedLanguage): void {
    LanguageDetector.setUserLanguage(language);
  }

  /**
   * Get user's current preferred language
   */
  static getUserLanguage(): SupportedLanguage {
    return LanguageDetector.getUserPreferredLanguage();
  }
}

// Export dei template più utilizzati per facilità d'uso
export const {
  SUMMARIZE_CONTEXT,
  SUMMARIZE_SESSION,
  TODOIST_TASK_ANALYSIS,
  TODOIST_PROJECT_ORGANIZATION,
  GENERAL_ASSISTANT,
  ERROR_RECOVERY
} = PROMPT_TEMPLATES;