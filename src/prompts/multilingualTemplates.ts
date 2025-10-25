/**
 * Multilingual Prompt Templates for TaskMate CLI
 * Contains translations of all prompts in supported languages
 */

import { SupportedLanguage } from '../utils/LanguageDetector.js';

export interface MultilingualPromptTemplate {
  name: string;
  description: string;
  variables?: readonly string[];
  templates: Record<SupportedLanguage, string>;
}

export const MULTILINGUAL_PROMPT_TEMPLATES = {
  // Context Management
  SUMMARIZE_CONTEXT: {
    name: 'summarize_context',
    description: 'Summarizes a previous conversation to provide context',
    variables: ['chatHistory'],
    templates: {
      en: `You are an AI assistant that needs to summarize a previous conversation to provide context for a new session.

Summarize the key points, decisions made, and current state of the project/discussion in a concise but complete manner.
Keep important technical information and project context.

Conversation to summarize:
{chatHistory}

Provide a structured summary that can be used as context to continue this conversation.`,

      es: `Eres un asistente de IA que necesita resumir una conversación anterior para proporcionar contexto para una nueva sesión.

Resume los puntos clave, las decisiones tomadas y el estado actual del proyecto/discusión de manera concisa pero completa.
Mantén la información técnica importante y el contexto del proyecto.

Conversación a resumir:
{chatHistory}

Proporciona un resumen estructurado que pueda usarse como contexto para continuar esta conversación.`,

      it: `Sei un assistente IA che deve riassumere una conversazione precedente per fornire contesto per una nuova sessione.

Riassumi i punti chiave, le decisioni prese e lo stato attuale del progetto/discussione in modo conciso ma completo.
Mantieni le informazioni tecniche importanti e il contesto del progetto.

Conversazione da riassumere:
{chatHistory}

Fornisci un riassunto strutturato che possa essere usato come contesto per continuare questa conversazione.`,

      fr: `Vous êtes un assistant IA qui doit résumer une conversation précédente pour fournir un contexte pour une nouvelle session.

Résumez les points clés, les décisions prises et l'état actuel du projet/discussion de manière concise mais complète.
Conservez les informations techniques importantes et le contexte du projet.

Conversation à résumer :
{chatHistory}

Fournissez un résumé structuré qui peut être utilisé comme contexte pour continuer cette conversation.`,

      de: `Sie sind ein KI-Assistent, der ein vorheriges Gespräch zusammenfassen muss, um Kontext für eine neue Sitzung zu bieten.

Fassen Sie die wichtigsten Punkte, getroffenen Entscheidungen und den aktuellen Stand des Projekts/der Diskussion prägnant aber vollständig zusammen.
Behalten Sie wichtige technische Informationen und Projektkontext bei.

Zu zusammenfassendes Gespräch:
{chatHistory}

Stellen Sie eine strukturierte Zusammenfassung bereit, die als Kontext verwendet werden kann, um dieses Gespräch fortzusetzen.`,

      pt: `Você é um assistente de IA que precisa resumir uma conversa anterior para fornecer contexto para uma nova sessão.

Resume os pontos-chave, decisões tomadas e estado atual do projeto/discussão de forma concisa mas completa.
Mantenha informações técnicas importantes e contexto do projeto.

Conversa para resumir:
{chatHistory}

Forneça um resumo estruturado que possa ser usado como contexto para continuar esta conversa.`
    }
  },

  SUMMARIZE_SESSION: {
    name: 'summarize_session',
    description: 'Summarizes a session to reduce context when approaching the limit',
    variables: ['chatHistory'],
    templates: {
      en: `Summarize this previous conversation concisely but completely, maintaining key points and important context to continue the discussion:

{chatHistory}

IMPORTANT: The summary should be much shorter than the original but contain all essential information to continue the conversation naturally.`,

      es: `Resume esta conversación anterior de manera concisa pero completa, manteniendo los puntos clave y el contexto importante para continuar la discusión:

{chatHistory}

IMPORTANTE: El resumen debe ser mucho más corto que el original pero contener toda la información esencial para continuar la conversación naturalmente.`,

      it: `Riassumi questa conversazione precedente in modo conciso ma completo, mantenendo i punti chiave e il contesto importante per continuare la discussione:

{chatHistory}

IMPORTANTE: Il riassunto deve essere molto più breve dell'originale ma contenere tutte le informazioni essenziali per continuare la conversazione naturalmente.`,

      fr: `Résumez cette conversation précédente de manière concise mais complète, en maintenant les points clés et le contexte important pour continuer la discussion :

{chatHistory}

IMPORTANT : Le résumé doit être beaucoup plus court que l'original mais contenir toutes les informations essentielles pour continuer la conversation naturellement.`,

      de: `Fassen Sie dieses vorherige Gespräch prägnant aber vollständig zusammen, wobei Sie wichtige Punkte und wichtigen Kontext beibehalten, um die Diskussion fortzusetzen:

{chatHistory}

WICHTIG: Die Zusammenfassung sollte viel kürzer als das Original sein, aber alle wesentlichen Informationen enthalten, um das Gespräch natürlich fortzusetzen.`,

      pt: `Resume esta conversa anterior de forma concisa mas completa, mantendo pontos-chave e contexto importante para continuar a discussão:

{chatHistory}

IMPORTANTE: O resumo deve ser muito mais curto que o original mas conter todas as informações essenciais para continuar a conversa naturalmente.`
    }
  },

  // Todoist Integration
  TODOIST_TASK_ANALYSIS: {
    name: 'todoist_task_analysis',
    description: 'Analyzes and suggests improvements for Todoist tasks',
    variables: ['tasks', 'context'],
    templates: {
      en: `You are an AI assistant specialized in productivity management with Todoist.

Analyze the following tasks and provide suggestions to improve organization, priorities, and productivity:

Current tasks:
{tasks}

Additional context:
{context}

Provide specific and actionable suggestions to optimize task management.`,

      es: `Eres un asistente de IA especializado en gestión de productividad con Todoist.

Analiza las siguientes tareas y proporciona sugerencias para mejorar la organización, prioridades y productividad:

Tareas actuales:
{tasks}

Contexto adicional:
{context}

Proporciona sugerencias específicas y accionables para optimizar la gestión de tareas.`,

      it: `Sei un assistente IA specializzato nella gestione della produttività con Todoist.

Analizza le seguenti attività e fornisci suggerimenti per migliorare organizzazione, priorità e produttività:

Attività attuali:
{tasks}

Contesto aggiuntivo:
{context}

Fornisci suggerimenti specifici e attuabili per ottimizzare la gestione delle attività.`,

      fr: `Vous êtes un assistant IA spécialisé dans la gestion de la productivité avec Todoist.

Analysez les tâches suivantes et fournissez des suggestions pour améliorer l'organisation, les priorités et la productivité :

Tâches actuelles :
{tasks}

Contexte supplémentaire :
{context}

Fournissez des suggestions spécifiques et exploitables pour optimiser la gestion des tâches.`,

      de: `Sie sind ein KI-Assistent, der auf Produktivitätsmanagement mit Todoist spezialisiert ist.

Analysieren Sie die folgenden Aufgaben und geben Sie Vorschläge zur Verbesserung von Organisation, Prioritäten und Produktivität:

Aktuelle Aufgaben:
{tasks}

Zusätzlicher Kontext:
{context}

Geben Sie spezifische und umsetzbare Vorschläge zur Optimierung des Aufgabenmanagements.`,

      pt: `Você é um assistente de IA especializado em gestão de produtividade com Todoist.

Analise as seguintes tarefas e forneça sugestões para melhorar organização, prioridades e produtividade:

Tarefas atuais:
{tasks}

Contexto adicional:
{context}

Forneça sugestões específicas e acionáveis para otimizar o gerenciamento de tarefas.`
    }
  },

  TODOIST_PROJECT_ORGANIZATION: {
    name: 'todoist_project_organization',
    description: 'Suggests how to organize projects and tasks in Todoist',
    variables: ['projects', 'tasks', 'goals'],
    templates: {
      en: `Analyze the current structure of projects and tasks in Todoist and suggest improvements for organization:

Current projects:
{projects}

Tasks:
{tasks}

Goals/Context:
{goals}

Suggest an optimal organizational structure to maximize productivity.`,

      es: `Analiza la estructura actual de proyectos y tareas en Todoist y sugiere mejoras para la organización:

Proyectos actuales:
{projects}

Tareas:
{tasks}

Objetivos/Contexto:
{goals}

Sugiere una estructura organizacional óptima para maximizar la productividad.`,

      it: `Analizza la struttura attuale di progetti e attività in Todoist e suggerisci miglioramenti per l'organizzazione:

Progetti attuali:
{projects}

Attività:
{tasks}

Obiettivi/Contesto:
{goals}

Suggerisci una struttura organizzativa ottimale per massimizzare la produttività.`,

      fr: `Analysez la structure actuelle des projets et tâches dans Todoist et suggérez des améliorations pour l'organisation :

Projets actuels :
{projects}

Tâches :
{tasks}

Objectifs/Contexte :
{goals}

Suggérez une structure organisationnelle optimale pour maximiser la productivité.`,

      de: `Analysieren Sie die aktuelle Struktur von Projekten und Aufgaben in Todoist und schlagen Sie Verbesserungen für die Organisation vor:

Aktuelle Projekte:
{projects}

Aufgaben:
{tasks}

Ziele/Kontext:
{goals}

Schlagen Sie eine optimale Organisationsstruktur vor, um die Produktivität zu maximieren.`,

      pt: `Analise a estrutura atual de projetos e tarefas no Todoist e sugira melhorias para organização:

Projetos atuais:
{projects}

Tarefas:
{tasks}

Objetivos/Contexto:
{goals}

Sugira uma estrutura organizacional ótima para maximizar a produtividade.`
    }
  },

  // General Assistant
  GENERAL_ASSISTANT: {
    name: 'general_assistant',
    description: 'System prompt for general conversations',
    variables: ['context'],
    templates: {
      en: `You are an intelligent and helpful AI assistant for productivity and task management.

You can help with:
- Task management and organization
- Productivity analysis
- Suggestions to improve efficiency
- General conversations about projects
- Integration with task management systems

{context}

Respond in a helpful, concise, and action-oriented manner.`,

      es: `Eres un asistente de IA inteligente y útil para productividad y gestión de tareas.

Puedes ayudar con:
- Gestión y organización de tareas
- Análisis de productividad
- Sugerencias para mejorar la eficiencia
- Conversaciones generales sobre proyectos
- Integración con sistemas de gestión de tareas

{context}

Responde de manera útil, concisa y orientada a la acción.`,

      it: `Sei un assistente IA intelligente e utile per produttività e gestione delle attività.

Puoi aiutare con:
- Gestione e organizzazione delle attività
- Analisi della produttività
- Suggerimenti per migliorare l'efficienza
- Conversazioni generali sui progetti
- Integrazione con sistemi di gestione delle attività

{context}

Rispondi in modo utile, conciso e orientato all'azione.`,

      fr: `Vous êtes un assistant IA intelligent et utile pour la productivité et la gestion des tâches.

Vous pouvez aider avec :
- Gestion et organisation des tâches
- Analyse de la productivité
- Suggestions pour améliorer l'efficacité
- Conversations générales sur les projets
- Intégration avec les systèmes de gestion des tâches

{context}

Répondez de manière utile, concise et orientée action.`,

      de: `Sie sind ein intelligenter und hilfreicher KI-Assistent für Produktivität und Aufgabenmanagement.

Sie können helfen mit:
- Aufgabenmanagement und -organisation
- Produktivitätsanalyse
- Vorschläge zur Effizienzsteigerung
- Allgemeine Gespräche über Projekte
- Integration mit Aufgabenmanagementsystemen

{context}

Antworten Sie hilfreich, prägnant und handlungsorientiert.`,

      pt: `Você é um assistente de IA inteligente e útil para produtividade e gerenciamento de tarefas.

Você pode ajudar com:
- Gerenciamento e organização de tarefas
- Análise de produtividade
- Sugestões para melhorar eficiência
- Conversas gerais sobre projetos
- Integração com sistemas de gerenciamento de tarefas

{context}

Responda de forma útil, concisa e orientada à ação.`
    }
  },

  // Error Recovery
  ERROR_RECOVERY: {
    name: 'error_recovery',
    description: 'Handles errors and provides recovery suggestions',
    variables: ['error', 'context'],
    templates: {
      en: `An error occurred during the operation:

Error: {error}
Context: {context}

Provide a clear explanation of the error and suggest possible solutions or alternatives to complete the requested operation.`,

      es: `Ocurrió un error durante la operación:

Error: {error}
Contexto: {context}

Proporciona una explicación clara del error y sugiere posibles soluciones o alternativas para completar la operación solicitada.`,

      it: `Si è verificato un errore durante l'operazione:

Errore: {error}
Contesto: {context}

Fornisci una spiegazione chiara dell'errore e suggerisci possibili soluzioni o alternative per completare l'operazione richiesta.`,

      fr: `Une erreur s'est produite pendant l'opération :

Erreur : {error}
Contexte : {context}

Fournissez une explication claire de l'erreur et suggérez des solutions possibles ou des alternatives pour terminer l'opération demandée.`,

      de: `Ein Fehler ist während der Operation aufgetreten:

Fehler: {error}
Kontext: {context}

Geben Sie eine klare Erklärung des Fehlers und schlagen Sie mögliche Lösungen oder Alternativen vor, um die angeforderte Operation abzuschließen.`,

      pt: `Ocorreu um erro durante a operação:

Erro: {error}
Contexto: {context}

Forneça uma explicação clara do erro e sugira possíveis soluções ou alternativas para completar a operação solicitada.`
    }
  }
} as const;

export type MultilingualPromptName = keyof typeof MULTILINGUAL_PROMPT_TEMPLATES;