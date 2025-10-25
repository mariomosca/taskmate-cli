import { SupportedLanguage } from './LanguageDetector.js';

export interface UIMessages {
  // Session management
  sessionNotFound: string;
  newSessionCreated: string;
  noActiveSession: string;
  cannotSaveEmptySession: string;
  sessionSaved: string;
  loadSessionUsage: string;
  sessionNotFoundById: string;
  sessionLoaded: string;
  deleteSessionUsage: string;
  sessionDeleted: string;
  cannotDeleteSession: string;
  sessionResumed: string;
  sessionContext: string;
  sessionLoadError: string;
  sessionLoadingError: string;
  
  // Status and system
  database: string;
  operational: string;
  error: string;
  currentSession: string;
  noSession: string;
  version: string;
  minimal: string;
  
  // UI elements
  loadingSessions: string;
  noSessionsFound: string;
  selectSession: string;
  navigationHelp: string;
  sessionSelected: string;
  newChat: string;
  noTasksFound: string;
  thinking: string;
  generating: string;
  
  // CLI descriptions
  resumeDescription: string;
  sessionIdDescription: string;
  startExample: string;
  resumeExample: string;
  
  // Loading states
  loadingConfiguration: string;
  loadingSession: string;
  
  // Error messages
  unknownError: string;
  systemError: string;
  contextError: string;
  
  // Navigation
  navigateHelp: string;
  autocomplete: string;
  select: string;
  close: string;
  
  // Todoist integration
  createTask: string;
  updateTask: string;
  deleteTask: string;
  newDescription: string;
  newPriority: string;
  newDueDate: string;
  taskToDelete: string;
}

export const UI_MESSAGES: Record<SupportedLanguage, UIMessages> = {
  en: {
    // Session management
    sessionNotFound: 'No session found.',
    newSessionCreated: '✨ **New session created!**\n\n📝 Name: {name}\n🆔 ID: {id}',
    noActiveSession: 'No active session to save.',
    cannotSaveEmptySession: 'Cannot save an empty session (without messages).',
    sessionSaved: '💾 **Session saved!**\n\n📝 Name: {name}\n🆔 ID: {id}\n💬 {messageCount} messages',
    loadSessionUsage: 'You must specify the session ID. Usage: /load <session_id>',
    sessionNotFoundById: 'Session with ID {sessionId} not found.',
    sessionLoaded: '📂 **Session loaded!**\n\n📝 Name: {name}\n🆔 ID: {id}\n💬 {messageCount} messages\n📅 Last activity: {lastActivity}',
    deleteSessionUsage: 'You must specify the session ID. Usage: /delete-session <session_id>',
    sessionDeleted: '🗑️ **Session deleted!**\n\n🆔 ID: {sessionId}',
    cannotDeleteSession: 'Cannot delete session {sessionId}.',
    currentSession: 'Current session',
    noSession: 'None',
    sessionResumed: '📝 Session resumed with previous context',
    sessionContext: 'Previous session context: {context}',
    sessionLoadError: '❌ Session {id} not found',
    sessionLoadingError: '❌ Error loading session: {error}',
    
    // Status and system
    database: 'Database',
    operational: '✅ Operational',
    error: '❌ Error',
    version: 'Version',
    minimal: 'Minimal',
    
    // UI elements
    loadingSessions: '🔍 Loading sessions...',
    noSessionsFound: '⚠️  No sessions found',
    selectSession: '📋 Select a session to resume',
    navigationHelp: 'Use ↑/↓ to navigate, ENTER to select, ESC to cancel',
    sessionSelected: 'Selected session: {name}',
    newChat: '💬 {name}',
    noTasksFound: '📋 No tasks found.',
    thinking: '🤔 Thinking...',
    generating: '✨ Generating...',
    
    // CLI descriptions
    resumeDescription: 'Resume an existing session',
    sessionIdDescription: 'Session ID to resume (used with --resume)',
    startExample: 'Start a new chat session',
    resumeExample: 'Resume specific session',
    
    // Loading states
    loadingConfiguration: 'Loading configuration...',
    loadingSession: 'Loading session...',
    
    // Error messages
    unknownError: 'Unknown error',
    systemError: '❌ Error: {error}',
    contextError: 'Error preparing context',
    
    // Navigation
    navigateHelp: '{up}{down} Navigate • Tab Autocomplete • Enter Select • Esc Close',
    autocomplete: 'Tab Autocomplete',
    select: 'Enter Select',
    close: 'Esc Close',
    
    // Todoist integration
    createTask: 'Create a new task in Todoist. Supports content, description, project, priority, due date and labels.',
    updateTask: 'Update an existing task in Todoist.',
    deleteTask: 'Delete a task from Todoist.',
    newDescription: 'New task description',
    newPriority: 'New priority',
    newDueDate: 'New due date in natural language',
    taskToDelete: 'ID of the task to delete'
  },

  es: {
    // Session management
    sessionNotFound: 'No se encontró ninguna sesión.',
    newSessionCreated: '✨ **¡Nueva sesión creada!**\n\n📝 Nombre: {name}\n🆔 ID: {id}',
    noActiveSession: 'No hay sesión activa para guardar.',
    cannotSaveEmptySession: 'No se puede guardar una sesión vacía (sin mensajes).',
    sessionSaved: '💾 **¡Sesión guardada!**\n\n📝 Nombre: {name}\n🆔 ID: {id}\n💬 {messageCount} mensajes',
    loadSessionUsage: 'Debes especificar el ID de la sesión. Uso: /load <session_id>',
    sessionNotFoundById: 'Sesión con ID {sessionId} no encontrada.',
    sessionLoaded: '📂 **¡Sesión cargada!**\n\n📝 Nombre: {name}\n🆔 ID: {id}\n💬 {messageCount} mensajes\n📅 Última actividad: {lastActivity}',
    deleteSessionUsage: 'Debes especificar el ID de la sesión. Uso: /delete-session <session_id>',
    sessionDeleted: '🗑️ **¡Sesión eliminada!**\n\n🆔 ID: {sessionId}',
    cannotDeleteSession: 'No se puede eliminar la sesión {sessionId}.',
    currentSession: 'Sesión actual',
    noSession: 'Ninguna',
    sessionResumed: '📝 Sesión reanudada con contexto anterior',
    sessionContext: 'Contexto de sesión anterior: {context}',
    sessionLoadError: '❌ Sesión {sessionId} no encontrada',
    sessionLoadingError: '❌ Error al cargar la sesión: {error}',
    
    // Status and system
    database: 'Base de datos',
    operational: '✅ Operativa',
    error: '❌ Error',
    version: 'Versión',
    minimal: 'Mínima',
    
    // UI elements
    loadingSessions: '🔍 Cargando sesiones...',
    noSessionsFound: '⚠️  No se encontraron sesiones',
    selectSession: '📋 Selecciona una sesión para reanudar',
    navigationHelp: 'Usa ↑/↓ para navegar, ENTER para seleccionar, ESC para cancelar',
    sessionSelected: 'Sesión seleccionada: {name}',
    newChat: '💬 {name}',
    noTasksFound: '📋 No se encontraron tareas',
    thinking: '🤔 Pensando...',
    generating: '✨ Generando...',
    
    // CLI descriptions
    resumeDescription: 'Reanudar una sesión existente',
    sessionIdDescription: 'ID de sesión para reanudar (usado con --resume)',
    startExample: 'Iniciar una nueva sesión de chat',
    resumeExample: 'Reanudar sesión específica',
    
    // Loading states
    loadingConfiguration: 'Cargando configuración...',
    loadingSession: 'Cargando sesión...',
    
    // Error messages
    unknownError: 'Error desconocido',
    systemError: '❌ Error: {error}',
    contextError: 'Error preparando contexto',
    
    // Navigation
    navigateHelp: '{up}{down} Navegar • Tab Autocompletar • Enter Seleccionar • Esc Cerrar',
    autocomplete: 'Tab Autocompletar',
    select: 'Enter Seleccionar',
    close: 'Esc Cerrar',
    
    // Todoist integration
    createTask: 'Crear una nueva tarea en Todoist. Soporta contenido, descripción, proyecto, prioridad, fecha de vencimiento y etiquetas.',
    updateTask: 'Actualizar una tarea existente en Todoist.',
    deleteTask: 'Eliminar una tarea de Todoist.',
    newDescription: 'Nueva descripción de la tarea',
    newPriority: 'Nueva prioridad',
    newDueDate: 'Nueva fecha de vencimiento en lenguaje natural',
    taskToDelete: 'ID de la tarea a eliminar'
  },

  it: {
    // Session management
    sessionNotFound: 'Nessuna sessione trovata.',
    newSessionCreated: '✨ **Nuova sessione creata!**\n\n📝 Nome: {name}\n🆔 ID: {id}',
    noActiveSession: 'Nessuna sessione attiva da salvare.',
    cannotSaveEmptySession: 'Impossibile salvare una sessione vuota (senza messaggi).',
    sessionSaved: '💾 **Sessione salvata!**\n\n📝 Nome: {name}\n🆔 ID: {id}\n💬 {messageCount} messaggi',
    loadSessionUsage: 'Devi specificare l\'ID della sessione. Uso: /load <session_id>',
    sessionNotFoundById: 'Sessione con ID {sessionId} non trovata.',
    sessionLoaded: '📂 **Sessione caricata!**\n\n📝 Nome: {name}\n🆔 ID: {id}\n💬 {messageCount} messaggi\n📅 Ultima attività: {lastActivity}',
    deleteSessionUsage: 'Devi specificare l\'ID della sessione. Uso: /delete-session <session_id>',
    sessionDeleted: '🗑️ **Sessione eliminata!**\n\n🆔 ID: {sessionId}',
    cannotDeleteSession: 'Impossibile eliminare la sessione {sessionId}.',
    currentSession: 'Sessione corrente',
    noSession: 'Nessuna',
    sessionResumed: '📝 Sessione ripresa con contesto precedente',
    sessionContext: 'Contesto della sessione precedente: {context}',
    sessionLoadError: '❌ Sessione {sessionId} non trovata',
    sessionLoadingError: '❌ Errore nel caricamento della sessione: {error}',
    
    // Status and system
    database: 'Database',
    operational: '✅ Operativo',
    error: '❌ Errore',
    version: 'Versione',
    minimal: 'Minimal',
    
    // UI elements
    loadingSessions: '🔍 Caricamento sessioni...',
    noSessionsFound: '⚠️  Nessuna sessione trovata',
    selectSession: '📋 Seleziona una sessione da riprendere',
    navigationHelp: 'Usa ↑/↓ per navigare, INVIO per selezionare, ESC per annullare',
    sessionSelected: 'Sessione selezionata: {name}',
    newChat: '💬 {name}',
    noTasksFound: '📋 Nessuna task trovata.',
    thinking: '🤔 Sto pensando...',
    generating: '✨ Generando...',
    
    // CLI descriptions
    resumeDescription: 'Riprendi una sessione esistente',
    sessionIdDescription: 'ID della sessione da riprendere (usato con --resume)',
    startExample: 'Avvia una nuova sessione chat',
    resumeExample: 'Riprendi la sessione specifica',
    
    // Loading states
    loadingConfiguration: 'Caricamento configurazione...',
    loadingSession: 'Caricamento sessione...',
    
    // Error messages
    unknownError: 'Errore sconosciuto',
    systemError: '❌ Errore: {error}',
    contextError: 'Errore durante la preparazione del contesto',
    
    // Navigation
    navigateHelp: '{up}{down} Naviga • Tab Autocompleta • Enter Seleziona • Esc Chiudi',
    autocomplete: 'Tab Autocompleta',
    select: 'Enter Seleziona',
    close: 'Esc Chiudi',
    
    // Todoist integration
    createTask: 'Crea una nuova task in Todoist. Supporta contenuto, descrizione, progetto, priorità, scadenza e etichette.',
    updateTask: 'Aggiorna una task esistente in Todoist.',
    deleteTask: 'Elimina una task da Todoist.',
    newDescription: 'Nuova descrizione della task',
    newPriority: 'Nuova priorità',
    newDueDate: 'Nuova scadenza in linguaggio naturale',
    taskToDelete: 'ID della task da eliminare'
  },

  fr: {
    // Session management
    sessionNotFound: 'Aucune session trouvée.',
    newSessionCreated: '✨ **Nouvelle session créée !**\n\n📝 Nom : {name}\n🆔 ID : {id}',
    noActiveSession: 'Aucune session active à sauvegarder.',
    cannotSaveEmptySession: 'Impossible de sauvegarder une session vide (sans messages).',
    sessionSaved: '💾 **Session sauvegardée !**\n\n📝 Nom : {name}\n🆔 ID : {id}\n💬 {messageCount} messages',
    loadSessionUsage: 'Vous devez spécifier l\'ID de la session. Usage : /load <session_id>',
    sessionNotFoundById: 'Session avec ID {sessionId} non trouvée.',
    sessionLoaded: '📂 **Session chargée !**\n\n📝 Nom : {name}\n🆔 ID : {id}\n💬 {messageCount} messages\n📅 Dernière activité : {lastActivity}',
    deleteSessionUsage: 'Vous devez spécifier l\'ID de la session. Usage : /delete-session <session_id>',
    sessionDeleted: '🗑️ **Session supprimée !**\n\n🆔 ID : {sessionId}',
    cannotDeleteSession: 'Impossible de supprimer la session {sessionId}.',
    currentSession: 'Session actuelle',
    noSession: 'Aucune',
    sessionResumed: '📝 Session reprise avec contexte précédent',
    sessionContext: 'Contexte de session précédente : {context}',
    sessionLoadError: '❌ Session {sessionId} non trouvée',
    sessionLoadingError: '❌ Erreur lors du chargement de la session : {error}',
    
    // Status and system
    database: 'Base de données',
    operational: '✅ Opérationnelle',
    error: '❌ Erreur',
    version: 'Version',
    minimal: 'Minimale',
    
    // UI elements
    loadingSessions: '🔍 Chargement des sessions...',
    noSessionsFound: '⚠️  Aucune session trouvée',
    selectSession: '📋 Sélectionnez une session à reprendre',
    navigationHelp: 'Utilisez ↑/↓ pour naviguer, ENTRÉE pour sélectionner, ESC pour annuler',
    sessionSelected: 'Session sélectionnée : {name}',
    newChat: '💬 {name}',
    noTasksFound: '📋 Aucune tâche trouvée.',
    thinking: '🤔 Réflexion...',
    generating: '✨ Génération...',
    
    // CLI descriptions
    resumeDescription: 'Reprendre une session existante',
    sessionIdDescription: 'ID de session à reprendre (utilisé avec --resume)',
    startExample: 'Démarrer une nouvelle session de chat',
    resumeExample: 'Reprendre une session spécifique',
    
    // Loading states
    loadingConfiguration: 'Chargement de la configuration...',
    loadingSession: 'Chargement de la session...',
    
    // Error messages
    unknownError: 'Erreur inconnue',
    systemError: '❌ Erreur : {error}',
    contextError: 'Erreur lors de la préparation du contexte',
    
    // Navigation
    navigateHelp: '{up}{down} Naviguer • Tab Complétion • Entrée Sélectionner • Esc Fermer',
    autocomplete: 'Tab Complétion',
    select: 'Entrée Sélectionner',
    close: 'Esc Fermer',
    
    // Todoist integration
    createTask: 'Créer une nouvelle tâche dans Todoist. Prend en charge le contenu, la description, le projet, la priorité, la date d\'échéance et les étiquettes.',
    updateTask: 'Mettre à jour une tâche existante dans Todoist.',
    deleteTask: 'Supprimer une tâche de Todoist.',
    newDescription: 'Nouvelle description de la tâche',
    newPriority: 'Nouvelle priorité',
    newDueDate: 'Nouvelle date d\'échéance en langage naturel',
    taskToDelete: 'ID de la tâche à supprimer'
  },

  de: {
    // Session management
    sessionNotFound: 'Keine Sitzung gefunden.',
    newSessionCreated: '✨ **Neue Sitzung erstellt!**\n\n📝 Name: {name}\n🆔 ID: {id}',
    noActiveSession: 'Keine aktive Sitzung zum Speichern.',
    cannotSaveEmptySession: 'Kann keine leere Sitzung speichern (ohne Nachrichten).',
    sessionSaved: '💾 **Sitzung gespeichert!**\n\n📝 Name: {name}\n🆔 ID: {id}\n💬 {messageCount} Nachrichten',
    loadSessionUsage: 'Sie müssen die Sitzungs-ID angeben. Verwendung: /load <session_id>',
    sessionNotFoundById: 'Sitzung mit ID {sessionId} nicht gefunden.',
    sessionLoaded: '📂 **Sitzung geladen!**\n\n📝 Name: {name}\n🆔 ID: {id}\n💬 {messageCount} Nachrichten\n📅 Letzte Aktivität: {lastActivity}',
    deleteSessionUsage: 'Sie müssen die Sitzungs-ID angeben. Verwendung: /delete-session <session_id>',
    sessionDeleted: '🗑️ **Sitzung gelöscht!**\n\n🆔 ID: {sessionId}',
    cannotDeleteSession: 'Kann Sitzung {sessionId} nicht löschen.',
    currentSession: 'Aktuelle Sitzung',
    noSession: 'Keine',
    sessionResumed: '📝 Sitzung mit vorherigem Kontext fortgesetzt',
    sessionContext: 'Vorheriger Sitzungskontext: {context}',
    sessionLoadError: '❌ Sitzung {sessionId} nicht gefunden',
    sessionLoadingError: '❌ Fehler beim Laden der Sitzung: {error}',
    
    // Status and system
    database: 'Datenbank',
    operational: '✅ Betriebsbereit',
    error: '❌ Fehler',
    version: 'Version',
    minimal: 'Minimal',
    
    // UI elements
    loadingSessions: '🔍 Lade Sitzungen...',
    noSessionsFound: '⚠️  Keine Sitzungen gefunden',
    selectSession: '📋 Wählen Sie eine Sitzung zum Fortsetzen',
    navigationHelp: 'Verwenden Sie ↑/↓ zum Navigieren, ENTER zum Auswählen, ESC zum Abbrechen',
    sessionSelected: 'Ausgewählte Sitzung: {name}',
    newChat: '💬 {name}',
    noTasksFound: '📋 Keine Aufgaben gefunden.',
    thinking: '🤔 Denke nach...',
    generating: '✨ Generiere...',
    
    // CLI descriptions
    resumeDescription: 'Eine bestehende Sitzung fortsetzen',
    sessionIdDescription: 'Sitzungs-ID zum Fortsetzen (verwendet mit --resume)',
    startExample: 'Eine neue Chat-Sitzung starten',
    resumeExample: 'Spezifische Sitzung fortsetzen',
    
    // Loading states
    loadingConfiguration: 'Lade Konfiguration...',
    loadingSession: 'Lade Sitzung...',
    
    // Error messages
    unknownError: 'Unbekannter Fehler',
    systemError: '❌ Fehler: {error}',
    contextError: 'Fehler beim Vorbereiten des Kontexts',
    
    // Navigation
    navigateHelp: '{up}{down} Navigieren • Tab Vervollständigen • Enter Auswählen • Esc Schließen',
    autocomplete: 'Tab Vervollständigen',
    select: 'Enter Auswählen',
    close: 'Esc Schließen',
    
    // Todoist integration
    createTask: 'Eine neue Aufgabe in Todoist erstellen. Unterstützt Inhalt, Beschreibung, Projekt, Priorität, Fälligkeitsdatum und Labels.',
    updateTask: 'Eine bestehende Aufgabe in Todoist aktualisieren.',
    deleteTask: 'Eine Aufgabe aus Todoist löschen.',
    newDescription: 'Neue Aufgabenbeschreibung',
    newPriority: 'Neue Priorität',
    newDueDate: 'Neues Fälligkeitsdatum in natürlicher Sprache',
    taskToDelete: 'ID der zu löschenden Aufgabe'
  },

  pt: {
    // Session management
    sessionNotFound: 'Nenhuma sessão encontrada.',
    newSessionCreated: '✨ **Nova sessão criada!**\n\n📝 Nome: {name}\n🆔 ID: {id}',
    noActiveSession: 'Nenhuma sessão ativa para salvar.',
    cannotSaveEmptySession: 'Não é possível salvar uma sessão vazia (sem mensagens).',
    sessionSaved: '💾 **Sessão salva!**\n\n📝 Nome: {name}\n🆔 ID: {id}\n💬 {messageCount} mensagens',
    loadSessionUsage: 'Você deve especificar o ID da sessão. Uso: /load <session_id>',
    sessionNotFoundById: 'Sessão com ID {sessionId} não encontrada.',
    sessionLoaded: '📂 **Sessão carregada!**\n\n📝 Nome: {name}\n🆔 ID: {id}\n💬 {messageCount} mensagens\n📅 Última atividade: {lastActivity}',
    deleteSessionUsage: 'Você deve especificar o ID da sessão. Uso: /delete-session <session_id>',
    sessionDeleted: '🗑️ **Sessão excluída!**\n\n🆔 ID: {sessionId}',
    cannotDeleteSession: 'Não é possível excluir a sessão {sessionId}.',
    currentSession: 'Sessão atual',
    noSession: 'Nenhuma',
    sessionResumed: '📝 Sessão retomada com contexto anterior',
    sessionContext: 'Contexto da sessão anterior: {context}',
    sessionLoadError: '❌ Sessão {sessionId} não encontrada',
    sessionLoadingError: '❌ Erro ao carregar a sessão: {error}',
    
    // Status and system
    database: 'Banco de dados',
    operational: '✅ Operacional',
    error: '❌ Erro',
    version: 'Versão',
    minimal: 'Mínima',
    
    // UI elements
    loadingSessions: '🔍 Carregando sessões...',
    noSessionsFound: '⚠️  Nenhuma sessão encontrada',
    selectSession: '📋 Selecione uma sessão para retomar',
    navigationHelp: 'Use ↑/↓ para navegar, ENTER para selecionar, ESC para cancelar',
    sessionSelected: 'Sessão selecionada: {name}',
    newChat: '💬 {name}',
    noTasksFound: '📋 Nenhuma tarefa encontrada.',
    thinking: '🤔 Pensando...',
    generating: '✨ Gerando...',
    
    // CLI descriptions
    resumeDescription: 'Retomar uma sessão existente',
    sessionIdDescription: 'ID da sessão para retomar (usado com --resume)',
    startExample: 'Iniciar uma nova sessão de chat',
    resumeExample: 'Retomar sessão específica',
    
    // Loading states
    loadingConfiguration: 'Carregando configuração...',
    loadingSession: 'Carregando sessão...',
    
    // Error messages
    unknownError: 'Erro desconhecido',
    systemError: '❌ Erro: {error}',
    contextError: 'Erro ao preparar contexto',
    
    // Navigation
    navigateHelp: '{up}{down} Navegar • Tab Autocompletar • Enter Selecionar • Esc Fechar',
    autocomplete: 'Tab Autocompletar',
    select: 'Enter Selecionar',
    close: 'Esc Fechar',
    
    // Todoist integration
    createTask: 'Criar uma nova tarefa no Todoist. Suporta conteúdo, descrição, projeto, prioridade, data de vencimento e etiquetas.',
    updateTask: 'Atualizar uma tarefa existente no Todoist.',
    deleteTask: 'Excluir uma tarefa do Todoist.',
    newDescription: 'Nova descrição da tarefa',
    newPriority: 'Nova prioridade',
    newDueDate: 'Nova data de vencimento em linguagem natural',
    taskToDelete: 'ID da tarefa a ser excluída'
  }
};

export class UIMessageManager {
  private static currentLanguage: SupportedLanguage = 'en';

  static setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
  }

  static getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  static getMessage(key: keyof UIMessages, variables?: Record<string, string | number>): string {
    let message = UI_MESSAGES[this.currentLanguage][key];
    
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        message = message.replace(new RegExp(`{${key}}`, 'g'), String(value));
      });
    }
    
    return message;
  }

  static getMessages(): UIMessages {
    return UI_MESSAGES[this.currentLanguage];
  }
}