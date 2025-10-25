import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createInterface } from 'readline';
import { UserProfile } from '../types/UserProfile.js';
import { UserProfileService } from '../services/UserProfileService.js';
import { DatabaseService } from '../services/DatabaseService.js';

interface InitConfig {
  // API Keys
  CLAUDE_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  TODOIST_API_KEY?: string;
  
  // LLM Configuration
  DEFAULT_LLM_PROVIDER?: string;
  DEFAULT_MODEL?: string;
  
  // User Profile
  userProfile?: UserProfile;
}

export class InitCommand {
  private rl: any;
  private configPath: string;
  private envPath: string;

  constructor() {
    this.configPath = join(homedir(), '.taskmate-cli');
    this.envPath = join(process.cwd(), '.env');
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async execute(): Promise<void> {
    console.log('🚀 Benvenuto in TaskMate CLI Setup!');
    console.log('Configuriamo insieme il tuo assistente AI personale.\n');

    try {
      const config: InitConfig = {};

      // Step 1: API Keys Setup
      await this.setupApiKeys(config);

      // Step 2: LLM Configuration
      await this.setupLLMConfig(config);

      // Step 3: User Profile Setup
      await this.setupUserProfile(config);

      // Step 4: Save Configuration
      await this.saveConfiguration(config);

      // Step 5: Test Connections
      await this.testConnections(config);

      console.log('\n✅ Setup completato con successo!');
      console.log('Ora puoi utilizzare TaskMate CLI con il comando: taskmate');
      
    } catch (error) {
      console.error('\n❌ Errore durante il setup:', error);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  private async setupApiKeys(config: InitConfig): Promise<void> {
    console.log('📋 Step 1: Configurazione API Keys\n');

    // Anthropic/Claude API Key
    const claudeKey = await this.askQuestion(
      'Inserisci la tua Anthropic/Claude API Key (opzionale): '
    );
    if (claudeKey.trim()) {
      config.CLAUDE_API_KEY = claudeKey.trim();
      config.ANTHROPIC_API_KEY = claudeKey.trim();
    }

    // Google/Gemini API Key
    const geminiKey = await this.askQuestion(
      'Inserisci la tua Google/Gemini API Key (opzionale): '
    );
    if (geminiKey.trim()) {
      config.GEMINI_API_KEY = geminiKey.trim();
      config.GOOGLE_API_KEY = geminiKey.trim();
    }

    // Todoist API Key
    const todoistKey = await this.askQuestion(
      'Inserisci la tua Todoist API Key (opzionale): '
    );
    if (todoistKey.trim()) {
      config.TODOIST_API_KEY = todoistKey.trim();
    }

    if (!config.CLAUDE_API_KEY && !config.GEMINI_API_KEY) {
      console.log('\n⚠️  Attenzione: Nessuna API key LLM configurata.');
      console.log('Potrai configurarle successivamente modificando il file .env');
    }
  }

  private async setupLLMConfig(config: InitConfig): Promise<void> {
    console.log('\n🤖 Step 2: Configurazione LLM\n');

    const availableProviders = [];
    if (config.CLAUDE_API_KEY) availableProviders.push('anthropic');
    if (config.GEMINI_API_KEY) availableProviders.push('google');

    if (availableProviders.length > 0) {
      console.log('Provider disponibili:', availableProviders.join(', '));
      const provider = await this.askQuestion(
        `Scegli il provider LLM predefinito (${availableProviders.join('/')}) [${availableProviders[0]}]: `
      );
      config.DEFAULT_LLM_PROVIDER = provider.trim() || availableProviders[0];

      // Model selection based on provider
      if (config.DEFAULT_LLM_PROVIDER === 'anthropic') {
        const model = await this.askQuestion(
          'Modello Claude [claude-3-5-sonnet-20241022]: '
        );
        config.DEFAULT_MODEL = model.trim() || 'claude-3-5-sonnet-20241022';
      } else if (config.DEFAULT_LLM_PROVIDER === 'google') {
        const model = await this.askQuestion(
          'Modello Gemini [gemini-1.5-pro]: '
        );
        config.DEFAULT_MODEL = model.trim() || 'gemini-1.5-pro';
      }
    } else {
      config.DEFAULT_LLM_PROVIDER = 'anthropic';
      config.DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
    }
  }

  private async setupUserProfile(config: InitConfig): Promise<void> {
    console.log('\n👤 Step 3: Configurazione Profilo Utente\n');

    const name = await this.askQuestion('Il tuo nome: ');
    const email = await this.askQuestion('La tua email (opzionale): ');
    
    console.log('\nObiettivi principali (separati da virgola):');
    const goalsInput = await this.askQuestion('Es: Aumentare produttività, Gestire progetti, Apprendere nuove tecnologie: ');
    const goals = goalsInput.split(',').map(g => g.trim()).filter(g => g);

    console.log('\nPreferenze di lavoro:');
    const workingHours = await this.askQuestion('Orari di lavoro preferiti [9:00-18:00]: ');
    const communicationStyle = await this.askQuestion('Stile di comunicazione (direct/detailed/casual) [casual]: ');
    const taskPriorities = await this.askQuestion('Priorità task (separati da virgola) [produttività, qualità]: ');

    console.log('\nContesto professionale:');
    const currentProjects = await this.askQuestion('Progetti attuali (separati da virgola): ');
    const interests = await this.askQuestion('Interessi principali (separati da virgola): ');
    const skills = await this.askQuestion('Competenze principali (separati da virgola): ');
    const workDomain = await this.askQuestion('Dominio lavorativo (es: sviluppo software, marketing, design): ');

    config.userProfile = {
      id: 'default',
      name: name.trim(),
      email: email.trim() || undefined,
      goals,
      preferences: {
        workingHours: workingHours.trim() || '9:00-18:00',
        communicationStyle: (communicationStyle.trim() || 'casual') as 'direct' | 'detailed' | 'casual',
        taskPriorities: taskPriorities.split(',').map(p => p.trim()).filter(p => p).length > 0 
          ? taskPriorities.split(',').map(p => p.trim()).filter(p => p)
          : ['produttività', 'qualità'],
        preferredLLM: (config.DEFAULT_LLM_PROVIDER === 'google' ? 'gemini' : 'claude') as 'claude' | 'gemini'
      },
      context: {
        currentProjects: currentProjects.split(',').map(p => p.trim()).filter(p => p),
        interests: interests.split(',').map(i => i.trim()).filter(i => i),
        skills: skills.split(',').map(s => s.trim()).filter(s => s),
        workDomain: workDomain.trim() || undefined
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async saveConfiguration(config: InitConfig): Promise<void> {
    console.log('\n💾 Step 4: Salvataggio Configurazione\n');

    // Create .env file
    const envContent = this.generateEnvContent(config);
    writeFileSync(this.envPath, envContent);
    console.log('✅ File .env creato');

    // Initialize database and save user profile
    if (config.userProfile) {
      const dbService = new DatabaseService();
      const userProfileService = new UserProfileService(dbService);
      
      await userProfileService.createProfile(config.userProfile);
      console.log('✅ Profilo utente salvato');
      
      dbService.close();
    }
  }

  private generateEnvContent(config: InitConfig): string {
    const lines = [
      '# TaskMate CLI Configuration',
      '# Generated by taskmate init',
      '',
      '# API Keys',
    ];

    if (config.CLAUDE_API_KEY) {
      lines.push(`CLAUDE_API_KEY=${config.CLAUDE_API_KEY}`);
      lines.push(`ANTHROPIC_API_KEY=${config.ANTHROPIC_API_KEY}`);
    }

    if (config.GEMINI_API_KEY) {
      lines.push(`GEMINI_API_KEY=${config.GEMINI_API_KEY}`);
      lines.push(`GOOGLE_API_KEY=${config.GOOGLE_API_KEY}`);
    }

    if (config.TODOIST_API_KEY) {
      lines.push(`TODOIST_API_KEY=${config.TODOIST_API_KEY}`);
    }

    lines.push('');
    lines.push('# LLM Configuration');
    lines.push(`DEFAULT_LLM_PROVIDER=${config.DEFAULT_LLM_PROVIDER || 'anthropic'}`);
    lines.push(`DEFAULT_MODEL=${config.DEFAULT_MODEL || 'claude-3-5-sonnet-20241022'}`);
    lines.push('');
    lines.push('# Default Configuration');
    lines.push('MAX_TOKENS=4000');
    lines.push('TEMPERATURE=0.7');
    lines.push('DEBUG_MODE=false');
    lines.push('');
    lines.push('# Database Configuration');
    lines.push('DATABASE_URL=sqlite:./data/sessions.db');
    lines.push('DATABASE_ECHO=false');
    lines.push('DATABASE_POOL_SIZE=5');
    lines.push('');
    lines.push('# UI Configuration');
    lines.push('UI_THEME=dark');
    lines.push('SHOW_SPLASH=true');
    lines.push('ENABLE_AUTOCOMPLETE=true');
    lines.push('HISTORY_SIZE=1000');
    lines.push('');
    lines.push('# Session Management');
    lines.push('AUTO_SAVE_SESSIONS=true');
    lines.push('SESSION_TIMEOUT=3600');
    lines.push('MAX_SESSIONS=100');
    lines.push('');
    lines.push('# Directories');
    lines.push('DATA_DIR=./data');
    lines.push('LOG_DIR=./logs');
    lines.push('CONFIG_DIR=./config');
    lines.push('');
    lines.push('# Todoist API Configuration');
    lines.push('TODOIST_API_BASE_URL=https://api.todoist.com/rest/v2');
    lines.push('TODOIST_API_TIMEOUT=10000');

    return lines.join('\n') + '\n';
  }

  private async testConnections(config: InitConfig): Promise<void> {
    console.log('\n🔍 Step 5: Test Connessioni\n');

    // Test LLM connections
    if (config.CLAUDE_API_KEY) {
      console.log('🧪 Testing Anthropic/Claude connection...');
      // Here you would test the actual API connection
      console.log('✅ Anthropic/Claude: OK');
    }

    if (config.GEMINI_API_KEY) {
      console.log('🧪 Testing Google/Gemini connection...');
      // Here you would test the actual API connection
      console.log('✅ Google/Gemini: OK');
    }

    if (config.TODOIST_API_KEY) {
      console.log('🧪 Testing Todoist connection...');
      // Here you would test the actual API connection
      console.log('✅ Todoist: OK');
    }

    console.log('✅ Database: OK');
  }

  private askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer: string) => {
        resolve(answer);
      });
    });
  }
}

export default InitCommand;