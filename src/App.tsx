import React, { useState, useEffect } from 'react';
import { Box, useApp } from 'ink';
import { SplashScreen } from './components/SplashScreen.js';
import { InputArea } from './components/InputArea.js';
import { ContentArea } from './components/ContentArea.js';
import { SessionSelector } from './components/SessionSelector.js';
import { SessionManager } from './services/SessionManager.js';
import { llmService } from './services/LLMService.js';
import { Message } from './types/index.js';

export const App: React.FC = () => {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  const [splashCompleted, setSplashCompleted] = useState(false);
  const [sessionManager] = useState(() => new SessionManager());
  
  // Session resume states
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);
  const [sessionContext, setSessionContext] = useState<string>('');

  // Check CLI arguments for session resume
  useEffect(() => {
    const args = process.argv.slice(2);
    const resumeIndex = args.indexOf('--resume');
    
    if (resumeIndex !== -1) {
      const sessionId = args[resumeIndex + 1];
      
      if (sessionId && !sessionId.startsWith('--')) {
        // Resume specific session directly - hide splash and load session
        setShowSplash(false);
        handleResumeSpecificSession(sessionId);
      } else {
        // Show session selector after splash completes
        setShowSessionSelector(true);
      }
    } else {
      // Normal startup - create new session after splash completes
      // Don't hide splash, just wait for it to complete
    }
  }, []);

  const handleResumeSpecificSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      setLoadingMessage('Caricamento sessione...');
      
      const result = await sessionManager.resumeSessionWithContext(sessionId);
      if (result) {
        setSessionContext(result.context);
        setMessages(result.session.messages || []);
        if (result.context) {
          addSystemMessage(`📝 Sessione ripresa con contesto: ${result.context.substring(0, 100)}...`);
        }
      } else {
        addSystemMessage(`❌ Sessione ${sessionId} non trovata`);
      }
    } catch (error) {
      addSystemMessage(`❌ Errore nel caricamento della sessione: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionsForSelection = async () => {
    try {
      const sessionList = await sessionManager.getSessionsForSelection();
      setSessions(sessionList);
      setShowSessionSelector(true);
    } catch (error) {
      addSystemMessage(`❌ Errore nel caricamento delle sessioni: ${error}`);
    }
  };

  const handleSessionSelected = async (sessionId: string) => {
    setShowSessionSelector(false);
    await handleResumeSpecificSession(sessionId);
  };

  const handleSessionSelectorCancel = () => {
    setShowSessionSelector(false);
    // Create new session instead
    sessionManager.createSession(
      `Sessione ${new Date().toLocaleDateString()}`,
      'claude'
    );
  };

  // Handle splash completion
  useEffect(() => {
    if (splashCompleted && !showSessionSelector && messages.length === 0) {
      // Create new session when splash completes in normal mode
      const createNewSession = async () => {
        await sessionManager.createSession(
          `Sessione ${new Date().toLocaleDateString()}`,
          'claude'
        );
      };
      createNewSession();
    }
  }, [splashCompleted, showSessionSelector, messages.length, sessionManager]);

  // Handle session selector after splash completion
  useEffect(() => {
    if (splashCompleted && showSessionSelector) {
      loadSessionsForSelection();
    }
  }, [splashCompleted, showSessionSelector]);

  const addSystemMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      role: 'system',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const handleSubmit = async (input: string) => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Show loading
    setIsLoading(true);
    setLoadingMessage('Elaborazione risposta...');

    try {
      // Send to LLM
      const response = await llmService.sendMessage(input, sessionContext);
      
      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        metadata: {
          llmProvider: response.provider,
          processingTime: response.processingTime
        }
      };
      setMessages(prev => [...prev, aiMessage]);

      // Save to session
      await sessionManager.addMessage(userMessage);
      await sessionManager.addMessage(aiMessage);

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `❌ Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlashCommand = async (command: string, args: string[]) => {
    switch (command) {
      case 'help':
        addSystemMessage('📋 Comandi disponibili:\n/help - Mostra aiuto\n/clear - Pulisci chat\n/exit - Esci\n/sessions - Lista sessioni\n/new - Nuova sessione');
        break;
      case 'clear':
        setMessages([]);
        break;
      case 'exit':
        exit();
        break;
      case 'sessions':
        await loadSessionsForSelection();
        break;
      case 'new':
        setMessages([]);
        await sessionManager.createSession(
          `Sessione ${new Date().toLocaleDateString()}`,
          'claude'
        );
        addSystemMessage('✅ Nuova sessione creata');
        break;
      default:
        addSystemMessage(`❌ Comando sconosciuto: /${command}`);
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Content Area - shows splash with session selector or messages */}
      <Box flexGrow={1}>
        <Box flexDirection="column">
          <SplashScreen 
            keepVisible={true}
            onComplete={() => setSplashCompleted(true)}
          />
          {showSessionSelector && splashCompleted && (
            <SessionSelector
              sessions={sessions}
              selectedIndex={selectedSessionIndex}
              onIndexChange={setSelectedSessionIndex}
              onSessionSelected={handleSessionSelected}
              onCancel={handleSessionSelectorCancel}
              loading={false}
            />
          )}
          {!showSessionSelector && (
            <ContentArea 
              messages={messages}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
            />
          )}
        </Box>
      </Box>

      {/* Input Area - always at bottom */}
      <InputArea
        onSubmit={handleSubmit}
        onSlashCommand={handleSlashCommand}
        disabled={isLoading || !splashCompleted || showSessionSelector}
      />
    </Box>
  );
};