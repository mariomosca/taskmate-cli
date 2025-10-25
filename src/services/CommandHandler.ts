import { SlashCommand } from '../types/index.js';
import { TodoistService } from './TodoistService.js';
import { SessionManager } from './SessionManager.js';
import { DatabaseService } from './DatabaseService.js';
import { LLMService } from './LLMService.js';
import { TodoistTask, TodoistProject, CreateTaskRequest } from '../types/todoist.js';
import { logger } from '../utils/logger.js';
import { errorHandler } from '../utils/ErrorHandler.js';
import { ErrorType } from '../types/errors.js';
import { LanguageDetector } from '../utils/LanguageDetector.js';
import { PromptProcessor } from '../prompts/templates.js';
import { UIMessageManager } from '../utils/UIMessages.js';

export interface LoadingStep {
  id: string;
  message: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  result?: string;
}

export interface CommandContext {
  todoistService: TodoistService;
  sessionManager: SessionManager;
  databaseService: DatabaseService;
  llmService: LLMService;
  onOutput: (message: string) => void;
  onError: (error: string) => void;
  onProgressUpdate?: (steps: LoadingStep[]) => void;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
}

class ProgressiveLoader {
  private steps: LoadingStep[] = [];
  private context: CommandContext;

  constructor(context: CommandContext) {
    this.context = context;
  }

  addStep(id: string, message: string): void {
    this.steps.push({ id, message, status: 'pending' });
    this.updateProgress();
  }

  startStep(id: string): void {
    const step = this.steps.find(s => s.id === id);
    if (step) {
      step.status = 'loading';
      this.updateProgress();
    }
  }

  completeStep(id: string, result?: string): void {
    const step = this.steps.find(s => s.id === id);
    if (step) {
      step.status = 'completed';
      if (result) step.result = result;
      this.updateProgress();
    }
  }

  errorStep(id: string, error: string): void {
    const step = this.steps.find(s => s.id === id);
    if (step) {
      step.status = 'error';
      step.result = error;
      this.updateProgress();
    }
  }

  private updateProgress(): void {
    if (this.context.onProgressUpdate) {
      this.context.onProgressUpdate([...this.steps]);
    }
  }

  clear(): void {
    this.steps = [];
  }
}

export class CommandHandler {
  private commands: Map<string, SlashCommand> = new Map();
  private context: CommandContext;

  constructor(context: CommandContext) {
    this.context = context;
    this.registerCommands();
  }

  private registerCommands(): void {
    // Session Commands
    this.registerCommand({
      command: '/sessions',
      description: 'Show all saved sessions',
      usage: '/sessions [--limit=10]',
      handler: this.handleSessionsCommand.bind(this)
    });

    this.registerCommand({
      command: '/new',
      description: 'Create a new session',
      usage: '/new [nome]',
      handler: this.handleNewSessionCommand.bind(this)
    });

    this.registerCommand({
      command: '/save',
      description: 'Save the current session',
      usage: '/save [nome]',
      handler: this.handleSaveSessionCommand.bind(this)
    });

    this.registerCommand({
      command: '/load',
      description: 'Load an existing session',
      usage: '/load <nome>',
      handler: this.handleLoadSessionCommand.bind(this)
    });

    this.registerCommand({
      command: '/delete',
      description: 'Delete a session',
      usage: '/delete <nome>',
      handler: this.handleDeleteSessionCommand.bind(this)
    });

    // Utility Commands
    this.registerCommand({
      command: '/help',
      description: 'Show all available commands',
      usage: '/help [comando]',
      handler: this.handleHelpCommand.bind(this)
    });

    this.registerCommand({
      command: '/status',
      description: 'Show connection and configuration status',
      usage: '/status',
      handler: this.handleStatusCommand.bind(this)
    });

    this.registerCommand({
      command: '/clear',
      description: 'Pulisce la chat corrente',
      usage: '/clear',
      handler: this.handleClearCommand.bind(this)
    });
  }

  private registerCommand(command: SlashCommand): void {
    this.commands.set(command.command, command);
  }

  public getCommands(): SlashCommand[] {
    return Array.from(this.commands.values());
  }

  public getCommand(commandName: string): SlashCommand | undefined {
    return this.commands.get(commandName);
  }

  public async executeCommand(input: string): Promise<CommandResult> {
    const parts = input.trim().split(/\s+/);
    const commandName = parts[0];
    const args = parts.slice(1);

    const command = this.commands.get(commandName);
    if (!command) {
      return {
        success: false,
        message: `Unknown command: ${commandName}. Use /help to see available commands.`
      };
    }

    try {
      await command.handler(args);
      return {
        success: true,
        message: ""
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.context.onError(`Error executing command ${commandName}: ${errorMessage}`);
      return {
        success: false,
        message: `Error executing command: ${errorMessage}`
      };
    }
  }



  // Session Command Handlers
  private async handleSessionsCommand(args: string[]): Promise<void> {
    try {
      const options = this.parseArgs(args);
      const limit = parseInt(options.limit || '10');
      
      const sessions = await this.context.sessionManager.listSessions();
      const limitedSessions = sessions.slice(0, limit);

      if (limitedSessions.length === 0) {
        this.context.onOutput(UIMessageManager.getMessage('sessionNotFound'));
        return;
      }

      let output = `💬 **Saved sessions (${limitedSessions.length}/${sessions.length}):**\n\n`;
      
      for (const session of limitedSessions) {
        const current = this.context.sessionManager.getCurrentSession()?.id === session.id ? ' 🔄' : '';
        const messageCount = session.metadata?.totalMessages || session.messages.length;
        output += `• ${session.name}${current}\n`;
        output += `  🆔 ${session.id}\n`;
        output += `  💬 ${messageCount} messages\n`;
        output += `  📅 ${session.updatedAt.toLocaleDateString()}\n\n`;
      }

      this.context.onOutput(output);
    } catch (error) {
      throw errorHandler.handleError(error as Error, {
        operation: 'list_sessions',
        component: 'CommandHandler',
        metadata: { command: 'sessions' }
      });
    }
  }

  private async handleNewSessionCommand(args: string[]): Promise<void> {
    const options = this.parseArgs(args);
    const name = args.filter(arg => !arg.startsWith('--')).join(' ') || undefined;
    const provider = (options.provider as 'claude' | 'gemini') || 'claude';

    try {
      if (provider !== 'claude' && provider !== 'gemini') {
        throw errorHandler.createValidationError(
          'Invalid provider. Use: claude or gemini',
          {
            operation: 'create_session',
            component: 'CommandHandler',
            metadata: { providedProvider: provider, validProviders: ['claude', 'gemini'] }
          }
        );
      }

      const session = await this.context.sessionManager.createSession(name, provider);
      
      this.context.onOutput(UIMessageManager.getMessage('newSessionCreated', { name: session.name, id: session.id }));
    } catch (error) {
      throw errorHandler.handleError(error as Error, {
        operation: 'create_session',
        component: 'CommandHandler',
        metadata: { sessionName: name, provider }
      });
    }
  }

  private async handleSaveSessionCommand(args: string[]): Promise<void> {
    try {
      const currentSession = this.context.sessionManager.getCurrentSession();
      if (!currentSession) {
        throw new Error(UIMessageManager.getMessage('noActiveSession'));
      }

      if (currentSession.messages.length === 0) {
        throw new Error(UIMessageManager.getMessage('cannotSaveEmptySession'));
      }

      const newName = args.join(' ');
      if (newName) {
        currentSession.name = newName;
      }

      // If the session is temporary, save it to database
      if (currentSession.isTemporary) {
        currentSession.isTemporary = false;
        const sessionToSave = { ...currentSession };
        delete sessionToSave.isTemporary;
        await this.context.databaseService.createSession(sessionToSave);
      }

      await this.context.sessionManager.saveSession(currentSession);
      
      this.context.onOutput(UIMessageManager.getMessage('sessionSaved', { 
        name: currentSession.name, 
        id: currentSession.id, 
        messageCount: currentSession.messages.length 
      }));
    } catch (error) {
      throw new Error(`Unable to save session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleLoadSessionCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      throw errorHandler.createValidationError(
        UIMessageManager.getMessage('loadSessionUsage'),
        {
          operation: 'load_session',
          component: 'CommandHandler',
          metadata: { command: 'load', argsProvided: args.length }
        }
      );
    }

    const sessionId = args[0];

    try {
      const session = await this.context.sessionManager.loadSession(sessionId);
      
      if (!session) {
        throw errorHandler.createValidationError(
          `Session with ID ${sessionId} not found.`,
          {
            operation: 'load_session',
            component: 'CommandHandler',
            metadata: { sessionId }
          }
        );
      }

      this.context.onOutput(`📂 **Session loaded!**\n\n📝 Name: ${session.name}\n🆔 ID: ${session.id}\n💬 ${session.messages.length} messages\n📅 Last activity: ${session.updatedAt.toLocaleDateString()}`);
    } catch (error) {
      throw errorHandler.handleError(error as Error, {
        operation: 'load_session',
        component: 'CommandHandler',
        metadata: { sessionId }
      });
    }
  }

  private async handleDeleteSessionCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.context.onOutput(UIMessageManager.getMessage('deleteSessionUsage'));
      return;
    }

    const sessionId = args[0];
    
    try {
      const session = await this.context.databaseService.getSession(sessionId);
      if (!session) {
        this.context.onOutput(UIMessageManager.getMessage('sessionNotFoundById', { sessionId }));
        return;
      }

      await this.context.databaseService.deleteSession(sessionId);
      this.context.onOutput(UIMessageManager.getMessage('sessionDeleted', { sessionId }));
    } catch (error) {
      this.context.onOutput(UIMessageManager.getMessage('cannotDeleteSession', { sessionId }));
    }
  }

  // Utility Command Handlers
  private async handleHelpCommand(args: string[]): Promise<void> {
    if (args.length > 0) {
      const commandName = args[0];
      const command = this.commands.get(commandName);
      
      if (!command) {
        this.context.onOutput(`Command ${commandName} not found.`);
        return;
      }

      let output = `ℹ️ **Help for ${command.command}:**\n\n`;
      output += `📝 **Description:** ${command.description}\n`;
      output += `💡 **Usage:** ${command.usage}\n`;

      this.context.onOutput(output);
      return;
    }

    let output = `🆘 **Available Commands:**\n\n`;
    output += `💡 **Note:** To manage tasks and projects, use natural language! The AI will automatically handle operations.\n\n`;
    
    const categories = {
      'Sessions': ['/sessions', '/new', '/save', '/load', '/delete-session'],
      'Utilities': ['/help', '/status', '/clear']
    };

    for (const [category, commandNames] of Object.entries(categories)) {
      output += `**${category}:**\n`;
      for (const cmdName of commandNames) {
        const cmd = this.commands.get(cmdName);
        if (cmd) {
          output += `• ${cmd.command} - ${cmd.description}\n`;
        }
      }
      output += '\n';
    }

    output += `💡 Use \`/help <command>\` for specific details.`;

    this.context.onOutput(output);
  }

  private async handleStatusCommand(args: string[]): Promise<void> {
    try {
      let output = `📊 **System Status:**\n\n`;

      // Test Todoist connection
      const todoistStatus = await this.context.todoistService.testConnection();
      output += `🔗 **Todoist:** ${todoistStatus.success ? '✅ Connected' : '❌ Disconnected'}\n`;
      if (todoistStatus.data?.projectCount !== undefined) {
        output += `   📁 ${todoistStatus.data.projectCount} projects available\n`;
      }

      // Database status
      const dbStatus = await this.context.databaseService.healthCheck();
      output += `💾 **${UIMessageManager.getMessage('database')}:** ${dbStatus.status === 'ok' ? UIMessageManager.getMessage('operational') : UIMessageManager.getMessage('error')}\n`;

      // Session info
      const currentSession = this.context.sessionManager.getCurrentSession();
      output += `💬 **${UIMessageManager.getMessage('currentSession')}:** ${currentSession ? currentSession.name : UIMessageManager.getMessage('noSession')}\n`;
      if (currentSession) {
        output += `   🆔 ${currentSession.id}\n`;
        output += `   💬 ${currentSession.messages.length} messages\n`;
      }

      // Database stats
      const stats = await this.context.databaseService.getSessionStats();
      output += `\n📈 **Statistics:**\n`;
      output += `   💬 ${stats.totalSessions} total sessions\n`;
      output += `   📝 ${stats.totalMessages} total messages\n`;
      output += `   📊 ${stats.averageMessagesPerSession.toFixed(1)} messages/session\n`;

      this.context.onOutput(output);
    } catch (error) {
      throw errorHandler.createLLMError(
        ErrorType.LLM_ERROR,
        `Unable to retrieve status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { component: 'CommandHandler', operation: 'status' }
      );
    }
  }

  private async handleClearCommand(args: string[]): Promise<void> {
    // This would typically clear the chat interface
    // For now, we just send a message
    this.context.onOutput(`🧹 **Chat pulita!**\n\nLa cronologia della chat è stata cancellata dalla vista.`);
  }

  // Utility Methods
  private parseArgs(args: string[]): Record<string, string> {
    const options: Record<string, string> = {};
    
    for (const arg of args) {
      if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        options[key] = value || 'true';
      }
    }
    
    return options;
  }

  public isSlashCommand(input: string): boolean {
    return input.trim().startsWith('/');
  }

  public getCommandSuggestions(partial: string): string[] {
    const commands = Array.from(this.commands.keys());
    return commands.filter(cmd => cmd.startsWith(partial)).sort();
  }

  private async generateIntelligentResponse(command: string, data: any, fallbackMessage: string, loader?: ProgressiveLoader): Promise<string> {
    try {
      // Detect user language from the command or fallback message
      const languageDetection = await LanguageDetector.detectLanguage(command + ' ' + fallbackMessage);
      const userLanguage = languageDetection.language;

      // Use multilingual loading messages
      const loadingMessages = {
        en: { thinking: '🤔 Thinking about the response...', generating: '✨ Generating response...' },
        es: { thinking: '🤔 Pensando en la respuesta...', generating: '✨ Generando respuesta...' },
        it: { thinking: '🤔 Sto pensando alla risposta...', generating: '✨ Generando la risposta...' },
        fr: { thinking: '🤔 Réflexion sur la réponse...', generating: '✨ Génération de la réponse...' },
        de: { thinking: '🤔 Denke über die Antwort nach...', generating: '✨ Antwort generieren...' },
        pt: { thinking: '🤔 Pensando na resposta...', generating: '✨ Gerando resposta...' }
      };

      if (loader) {
        loader.addStep('thinking', loadingMessages[userLanguage]?.thinking || loadingMessages.en.thinking);
        loader.startStep('thinking');
      }

      // Use multilingual GENERAL_ASSISTANT template
      const prompt = PromptProcessor.processMultilingual('GENERAL_ASSISTANT', { 
        command, 
        data: JSON.stringify(data, null, 2) 
      }, userLanguage);

      const messages = [{ role: 'user' as const, content: prompt }];
      
      if (loader) {
        loader.completeStep('thinking');
        loader.addStep('generating', loadingMessages[userLanguage]?.generating || loadingMessages.en.generating);
        loader.startStep('generating');
      }

      const response = await this.context.llmService.chat(messages);
      
      if (loader) {
        loader.completeStep('generating', response.content || fallbackMessage);
      }

      return response.content || fallbackMessage;
    } catch (error) {
      logger.error('Error generating LLM response:', error);
      if (loader) {
        loader.errorStep('generating', 'Error generating response');
      }
      return fallbackMessage;
    }
  }
}

export default CommandHandler;