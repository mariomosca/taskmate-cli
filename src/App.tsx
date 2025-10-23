import React, { useState, useEffect } from 'react';
import { Box, useApp } from 'ink';
import { SplashScreen } from './components/SplashScreen';
import { ContentArea } from './components/ContentArea';
import { InputArea } from './components/InputArea';
import Transform from './components/Transform';
import { Message, Session } from './types';
import { SessionManager } from './services/SessionManager.js';

export const App: React.FC = () => {
  const { exit } = useApp();
  const [showSplash, setShowSplash] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [activeTransforms, setActiveTransforms] = useState<{
    type: 'projects' | 'tasks' | 'ai' | 'search' | 'session';
    count?: number;
    message?: string;
  }[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessionManager] = useState(() => new SessionManager());

  // Initialize session on startup
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Try to resume last session
        const lastSession = await sessionManager.resumeLastSession();
        if (lastSession) {
          setCurrentSession(lastSession);
          setMessages(lastSession.messages);
        } else {
          // Create new session if none exists
          const newSession = await sessionManager.createSession();
          setCurrentSession(newSession);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        // Fallback: create new session
        const newSession = await sessionManager.createSession();
        setCurrentSession(newSession);
      }
    };

    if (!showSplash) {
      initializeSession();
    }
  }, [showSplash, sessionManager]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleUserInput = async (input: string) => {
    if (!currentSession) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    await sessionManager.addMessage(userMessage);
    
    setIsLoading(true);
    setLoadingMessage('Elaborazione con AI...');

    // Mock AI response
    setTimeout(async () => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Hai scritto: "${input}". Questa è una risposta mock dell'AI. In futuro qui ci sarà l'integrazione con Claude/Gemini.`,
        timestamp: new Date(),
        metadata: { 
          llmProvider: 'claude',
          processingTime: 1500
        }
      };
      
      setMessages(prev => [...prev, aiMessage]);
      await sessionManager.addMessage(aiMessage);
      setIsLoading(false);
      setLoadingMessage('');
    }, 2000);
  };

  const handleSlashCommand = async (command: string, args: string[]) => {
    // Add command message
    const commandMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `/${command} ${args.join(' ')}`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, commandMessage]);

    // Handle specific commands
    switch (command) {
      case 'help':
        const helpMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: 'Comandi disponibili:\n/help - Mostra questo aiuto\n/clear - Pulisci la chat\n/exit - Esci dall\'applicazione\n/tasks - Mostra task (mock)\n/projects - Mostra progetti (mock)\n/sessions - Lista sessioni\n/new - Nuova sessione\n/search <query> - Cerca nei messaggi',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, helpMessage]);
        await sessionManager.addMessage(helpMessage);
        break;
        
      case 'clear':
        setMessages([]);
        break;
        
      case 'exit':
        exit();
        break;
        
      case 'tasks':
        // Show transform indicator
        setActiveTransforms([{ type: 'tasks', count: 15, message: 'Caricamento task' }]);
        
        setTimeout(async () => {
          const tasksMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'system',
            content: 'Task Mock:\n• Completare il CLI Todoist AI\n• Implementare integrazione API\n• Testare interfaccia utente',
            timestamp: new Date(),
            metadata: { llmProvider: 'todoist-api' }
          };
          setMessages(prev => [...prev, tasksMessage]);
          await sessionManager.addMessage(tasksMessage);
          setActiveTransforms([]);
        }, 1500);
        break;
        
      case 'projects':
        const projectsMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: 'Progetti mock:\n• Progetto A (5 task)\n• Progetto B (3 task)\n• Progetto C (8 task)',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, projectsMessage]);
        await sessionManager.addMessage(projectsMessage);
        break;
        
      case 'sessions':
        const sessions = await sessionManager.listSessions();
        const sessionsMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: `Sessioni disponibili:\n${sessions.map(s => `• ${s.name} (${s.messageCount} messaggi) - ${s.lastActivity.toLocaleDateString()}`).join('\n')}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, sessionsMessage]);
        await sessionManager.addMessage(sessionsMessage);
        break;
        
      case 'new':
        const newSession = await sessionManager.createSession();
        setCurrentSession(newSession);
        setMessages([]);
        const newSessionMessage: Message = {
          id: Date.now().toString(),
          role: 'system',
          content: `Nuova sessione creata: ${newSession.name}`,
          timestamp: new Date()
        };
        setMessages([newSessionMessage]);
        await sessionManager.addMessage(newSessionMessage);
        break;
        
      case 'search':
        const query = args.join(' ');
        if (query.trim()) {
          const searchResults = await sessionManager.searchMessages(query);
          const searchMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'system',
            content: searchResults.length > 0 
              ? `Risultati ricerca per "${query}":\n${searchResults.map(r => `• [${r.metadata?.sessionName || 'Sessione'}] ${r.content.substring(0, 100)}...`).join('\n')}`
              : `Nessun risultato trovato per "${query}"`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, searchMessage]);
          await sessionManager.addMessage(searchMessage);
        } else {
          const searchHelpMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'system',
            content: 'Uso: /search <query> - Cerca nei messaggi delle sessioni',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, searchHelpMessage]);
          await sessionManager.addMessage(searchHelpMessage);
        }
        break;
        
      default:
        const unknownMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: `Comando sconosciuto: /${command}. Usa /help per vedere i comandi disponibili.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, unknownMessage]);
        await sessionManager.addMessage(unknownMessage);
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      {showSplash && (
        <SplashScreen 
          onComplete={handleSplashComplete} 
          keepVisible={true}
        />
      )}
      
      {!showSplash && (
        <>
          <ContentArea 
            messages={messages}
            isLoading={isLoading}
            loadingMessage={loadingMessage}
          />
          
          {/* Transform indicators */}
          {activeTransforms.map((transform, index) => (
            <Transform
              key={index}
              type={transform.type}
              count={transform.count}
              message={transform.message}
              isActive={true}
            />
          ))}
          
          <InputArea 
            onSubmit={handleUserInput}
            onSlashCommand={handleSlashCommand}
            disabled={isLoading}
          />
        </>
      )}
    </Box>
  );
};