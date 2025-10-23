/**
 * Prompt Templates per Todoist AI CLI
 * Centralizza tutti i prompt di sistema per facilitare la gestione e modifica
 */

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
    description: 'Riassume una conversazione precedente per fornire contesto',
    variables: ['chatHistory'],
    template: `Sei un assistente AI che deve riassumere una conversazione precedente per fornire contesto a una nuova sessione. 

Riassumi i punti chiave, le decisioni prese, e lo stato attuale del progetto/discussione in modo conciso ma completo.
Mantieni le informazioni tecniche importanti e il contesto del progetto.

Conversazione da riassumere:
{chatHistory}

Fornisci un riassunto strutturato che possa essere usato come contesto per continuare questa conversazione.`
  },

  SUMMARIZE_SESSION: {
    name: 'summarize_session',
    description: 'Riassume una sessione per ridurre il context quando si avvicina al limite',
    variables: ['chatHistory'],
    template: `Riassumi questa conversazione precedente in modo conciso ma completo, mantenendo i punti chiave e il contesto importante per continuare la discussione:

{chatHistory}

IMPORTANTE: Il riassunto deve essere molto più breve dell'originale ma contenere tutte le informazioni essenziali per continuare la conversazione in modo naturale.`
  },

  // Todoist Integration
  TODOIST_TASK_ANALYSIS: {
    name: 'todoist_task_analysis',
    description: 'Analizza e suggerisce miglioramenti per i task di Todoist',
    variables: ['tasks', 'context'],
    template: `Sei un assistente AI specializzato nella gestione della produttività con Todoist.

Analizza i seguenti task e fornisci suggerimenti per migliorare l'organizzazione, le priorità e la produttività:

Task attuali:
{tasks}

Contesto aggiuntivo:
{context}

Fornisci suggerimenti specifici e actionable per ottimizzare la gestione dei task.`
  },

  TODOIST_PROJECT_ORGANIZATION: {
    name: 'todoist_project_organization',
    description: 'Suggerisce come organizzare progetti e task in Todoist',
    variables: ['projects', 'tasks', 'goals'],
    template: `Analizza la struttura attuale dei progetti e task in Todoist e suggerisci miglioramenti per l'organizzazione:

Progetti attuali:
{projects}

Task:
{tasks}

Obiettivi/Contesto:
{goals}

Suggerisci una struttura organizzativa ottimale per massimizzare la produttività.`
  },

  // AI Conversation
  GENERAL_ASSISTANT: {
    name: 'general_assistant',
    description: 'Prompt di sistema per conversazioni generali',
    variables: ['context'],
    template: `Sei un assistente AI intelligente e utile per la gestione della produttività e dei task con Todoist.

Puoi aiutare con:
- Gestione e organizzazione dei task
- Analisi della produttività
- Suggerimenti per migliorare l'efficienza
- Conversazioni generali sui progetti

{context}

Rispondi in modo utile, conciso e orientato all'azione.`
  },

  // Error Handling
  ERROR_RECOVERY: {
    name: 'error_recovery',
    description: 'Gestisce errori e fornisce suggerimenti di recovery',
    variables: ['error', 'context'],
    template: `Si è verificato un errore durante l'operazione:

Errore: {error}
Contesto: {context}

Fornisci una spiegazione chiara dell'errore e suggerisci possibili soluzioni o alternative per completare l'operazione richiesta.`
  }
} as const;

/**
 * Utility per processare i template sostituendo le variabili
 */
export class PromptProcessor {
  static process(template: PromptTemplate, variables: Record<string, string>): string {
    let processed = template.template;
    
    // Sostituisci le variabili nel template
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return processed;
  }

  static getTemplate(name: keyof typeof PROMPT_TEMPLATES): PromptTemplate {
    return PROMPT_TEMPLATES[name];
  }

  static listTemplates(): string[] {
    return Object.keys(PROMPT_TEMPLATES);
  }

  static validateVariables(template: PromptTemplate, variables: Record<string, string>): boolean {
    if (!template.variables) return true;
    
    return template.variables.every(variable => 
      variables.hasOwnProperty(variable) && variables[variable] !== undefined
    );
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