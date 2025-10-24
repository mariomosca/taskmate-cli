import { SlashCommand } from '../types/index.js';
import { TodoistService } from './TodoistService.js';
import { SessionManager } from './SessionManager.js';
import { DatabaseService } from './DatabaseService.js';
import { LLMService } from './LLMService.js';
import { TodoistTask, TodoistProject, CreateTaskRequest } from '../types/todoist.js';

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
      description: 'Mostra tutte le sessioni salvate',
      usage: '/sessions [--limit=numero]',
      handler: this.handleSessionsCommand.bind(this)
    });

    this.registerCommand({
      command: '/new',
      description: 'Crea una nuova sessione',
      usage: '/new [nome] [--provider=claude|gemini]',
      handler: this.handleNewSessionCommand.bind(this)
    });

    this.registerCommand({
      command: '/save',
      description: 'Salva la sessione corrente',
      usage: '/save [nuovo_nome]',
      handler: this.handleSaveSessionCommand.bind(this)
    });

    this.registerCommand({
      command: '/load',
      description: 'Carica una sessione esistente',
      usage: '/load <session_id>',
      handler: this.handleLoadSessionCommand.bind(this)
    });

    this.registerCommand({
      command: '/delete-session',
      description: 'Elimina una sessione',
      usage: '/delete-session <session_id>',
      handler: this.handleDeleteSessionCommand.bind(this)
    });

    // Utility Commands
    this.registerCommand({
      command: '/help',
      description: 'Mostra tutti i comandi disponibili',
      usage: '/help [comando]',
      handler: this.handleHelpCommand.bind(this)
    });

    this.registerCommand({
      command: '/status',
      description: 'Mostra lo stato della connessione e delle configurazioni',
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
        message: `Comando sconosciuto: ${commandName}. Usa /help per vedere i comandi disponibili.`
      };
    }

    try {
      await command.handler(args);
      return {
        success: true,
        message: ""
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      this.context.onError(`Errore nell'esecuzione del comando ${commandName}: ${errorMessage}`);
      return {
        success: false,
        message: `Errore nell'esecuzione del comando: ${errorMessage}`
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
        this.context.onOutput('Nessuna sessione trovata.');
        return;
      }

      let output = `💬 **Sessioni salvate (${limitedSessions.length}/${sessions.length}):**\n\n`;
      
      for (const session of limitedSessions) {
        const current = this.context.sessionManager.getCurrentSession()?.id === session.id ? ' 🔄' : '';
        const messageCount = session.metadata?.totalMessages || session.messages.length;
        output += `• ${session.name}${current}\n`;
        output += `  🆔 ${session.id}\n`;
        output += `  💬 ${messageCount} messaggi\n`;
        output += `  📅 ${session.updatedAt.toLocaleDateString()}\n\n`;
      }

      this.context.onOutput(output);
    } catch (error) {
      throw new Error(`Impossibile recuperare le sessioni: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }

  private async handleNewSessionCommand(args: string[]): Promise<void> {
    try {
      const options = this.parseArgs(args);
      const name = args.filter(arg => !arg.startsWith('--')).join(' ') || undefined;
      const provider = (options.provider as 'claude' | 'gemini') || 'claude';

      if (provider !== 'claude' && provider !== 'gemini') {
        throw new Error('Provider non valido. Usa: claude o gemini');
      }

      const session = await this.context.sessionManager.createSession(name, provider);
      
      this.context.onOutput(`✨ **Nuova sessione creata!**\n\n📝 Nome: ${session.name}\n🆔 ID: ${session.id}`);
    } catch (error) {
      throw new Error(`Impossibile creare la sessione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }

  private async handleSaveSessionCommand(args: string[]): Promise<void> {
    try {
      const currentSession = this.context.sessionManager.getCurrentSession();
      if (!currentSession) {
        throw new Error('Nessuna sessione attiva da salvare.');
      }

      if (currentSession.messages.length === 0) {
        throw new Error('Impossibile salvare una sessione vuota (senza messaggi).');
      }

      const newName = args.join(' ');
      if (newName) {
        currentSession.name = newName;
      }

      // Se la sessione è temporanea, la salviamo nel database
      if (currentSession.isTemporary) {
        currentSession.isTemporary = false;
        const sessionToSave = { ...currentSession };
        delete sessionToSave.isTemporary;
        await this.context.databaseService.createSession(sessionToSave);
      }

      await this.context.sessionManager.saveSession(currentSession);
      
      this.context.onOutput(`💾 **Sessione salvata!**\n\n📝 Nome: ${currentSession.name}\n🆔 ID: ${currentSession.id}\n💬 ${currentSession.messages.length} messaggi`);
    } catch (error) {
      throw new Error(`Impossibile salvare la sessione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }

  private async handleLoadSessionCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      throw new Error('Devi specificare l\'ID della sessione. Uso: /load <session_id>');
    }

    try {
      const sessionId = args[0];
      const session = await this.context.sessionManager.loadSession(sessionId);
      
      if (!session) {
        throw new Error(`Sessione con ID ${sessionId} non trovata.`);
      }

      this.context.onOutput(`📂 **Sessione caricata!**\n\n📝 Nome: ${session.name}\n🆔 ID: ${session.id}\n💬 ${session.messages.length} messaggi\n📅 Ultima attività: ${session.updatedAt.toLocaleDateString()}`);
    } catch (error) {
      throw new Error(`Impossibile caricare la sessione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }

  private async handleDeleteSessionCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      throw new Error('Devi specificare l\'ID della sessione. Uso: /delete-session <session_id>');
    }

    try {
      const sessionId = args[0];
      const success = await this.context.sessionManager.deleteSession(sessionId);
      
      if (!success) {
        throw new Error(`Impossibile eliminare la sessione ${sessionId}.`);
      }

      this.context.onOutput(`🗑️ **Sessione eliminata!**\n\n🆔 ID: ${sessionId}`);
    } catch (error) {
      throw new Error(`Impossibile eliminare la sessione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }

  // Utility Command Handlers
  private async handleHelpCommand(args: string[]): Promise<void> {
    if (args.length > 0) {
      const commandName = args[0];
      const command = this.commands.get(commandName);
      
      if (!command) {
        this.context.onOutput(`Comando ${commandName} non trovato.`);
        return;
      }

      let output = `ℹ️ **Aiuto per ${command.command}:**\n\n`;
      output += `📝 **Descrizione:** ${command.description}\n`;
      output += `💡 **Uso:** ${command.usage}\n`;

      this.context.onOutput(output);
      return;
    }

    let output = `🆘 **Comandi disponibili:**\n\n`;
    output += `💡 **Nota:** Per gestire task e progetti Todoist, usa il linguaggio naturale! L'AI gestirà automaticamente le operazioni.\n\n`;
    
    const categories = {
      'Sessioni': ['/sessions', '/new', '/save', '/load', '/delete-session'],
      'Utilità': ['/help', '/status', '/clear']
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

    output += `💡 Usa \`/help <comando>\` per dettagli specifici.`;

    this.context.onOutput(output);
  }

  private async handleStatusCommand(args: string[]): Promise<void> {
    try {
      let output = `📊 **Status Sistema:**\n\n`;

      // Test Todoist connection
      const todoistStatus = await this.context.todoistService.testConnection();
      output += `🔗 **Todoist:** ${todoistStatus.success ? '✅ Connesso' : '❌ Disconnesso'}\n`;
      if (todoistStatus.data?.projectCount !== undefined) {
        output += `   📁 ${todoistStatus.data.projectCount} progetti disponibili\n`;
      }

      // Database status
      const dbStatus = await this.context.databaseService.healthCheck();
      output += `💾 **Database:** ${dbStatus.status === 'ok' ? '✅ Operativo' : '❌ Errore'}\n`;

      // Session info
      const currentSession = this.context.sessionManager.getCurrentSession();
      output += `💬 **Sessione corrente:** ${currentSession ? currentSession.name : 'Nessuna'}\n`;
      if (currentSession) {
        output += `   🆔 ${currentSession.id}\n`;
        output += `   💬 ${currentSession.messages.length} messaggi\n`;
      }

      // Database stats
      const stats = await this.context.databaseService.getSessionStats();
      output += `\n📈 **Statistiche:**\n`;
      output += `   💬 ${stats.totalSessions} sessioni totali\n`;
      output += `   📝 ${stats.totalMessages} messaggi totali\n`;
      output += `   📊 ${stats.averageMessagesPerSession.toFixed(1)} messaggi/sessione\n`;

      this.context.onOutput(output);
    } catch (error) {
      throw new Error(`Impossibile recuperare lo status: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
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
      if (loader) {
        loader.addStep('thinking', '🤔 Sto pensando alla risposta...');
        loader.startStep('thinking');
      }

      const prompt = `L'utente ha eseguito il comando "${command}" e ha ottenuto i seguenti dati:

${JSON.stringify(data, null, 2)}

Genera una risposta breve e utile (massimo 2-3 frasi) che riassuma i risultati in modo naturale e fornisca insights utili. Usa emoji appropriati e mantieni un tono amichevole e professionale. Rispondi in italiano.`;

      const messages = [{ role: 'user' as const, content: prompt }];
      
      if (loader) {
        loader.completeStep('thinking');
        loader.addStep('generating', '✨ Generando la risposta...');
        loader.startStep('generating');
      }

      const response = await this.context.llmService.chat(messages);
      
      if (loader) {
        loader.completeStep('generating', response.content || fallbackMessage);
      }

      return response.content || fallbackMessage;
    } catch (error) {
      console.error('Errore nella generazione della risposta LLM:', error);
      if (loader) {
        loader.errorStep('generating', 'Errore nella generazione della risposta');
      }
      return fallbackMessage;
    }
  }
}

export default CommandHandler;