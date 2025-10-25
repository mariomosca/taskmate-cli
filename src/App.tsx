import { useState, useEffect } from 'react';
import { Box, useApp } from 'ink';
import { ThemeProvider, defaultTheme } from '@inkjs/ui';
import { SplashScreen } from './components/SplashScreen.js';
import { InputArea } from './components/InputArea.js';
import { ContentArea } from './components/ContentArea.js';
import { SessionSelector } from './components/SessionSelector.js';
import { ContextIndicator } from './components/ContextIndicator.js';
import { SessionManager } from './services/SessionManager.js';
import { CostMonitor } from './services/CostMonitor.js';
import { ContextManager } from './services/ContextManager.js';
import { llmService } from './services/LLMService.js';
import { TodoistService } from './services/TodoistService.js';
import { TodoistAIService } from './services/TodoistAIService.js';
import { DatabaseService } from './services/DatabaseService.js';
import { EnhancedUserContextService } from './services/EnhancedUserContextService.js';
import { CommandHandler, CommandContext, LoadingStep } from './services/CommandHandler.js';
import { Message } from './types/index.js';
import { logger } from './utils/logger.js';
import { UIMessageManager } from './utils/UIMessages.js';
import { CLIArgs } from './utils/cli.js';

interface AppProps {
  cliArgs: CLIArgs;
}

export const App: React.FC<AppProps> = ({ cliArgs }) => {
  logger.debug('App component initializing...');
  
  const { exit } = useApp();
  
  // Show verbose CLI info if requested
  if (cliArgs.verbose) {
    console.log('🔍 CLI Arguments:', JSON.stringify(cliArgs, null, 2));
  }
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([]);
  const [showSplash, setShowSplash] = useState(true);
  const [splashCompleted, setSplashCompleted] = useState(false);
  
  logger.debug('Creating DatabaseService...');
  const [databaseService] = useState(() => new DatabaseService());
  
  logger.debug('Creating TodoistService...');
  const [todoistService] = useState(() => new TodoistService({
    apiKey: process.env.TODOIST_API_KEY || '',
    baseUrl: 'https://api.todoist.com/rest/v2'
  }));
  
  logger.debug('Creating TodoistAIService...');
  const [todoistAIService] = useState(() => new TodoistAIService(todoistService));
  
  logger.debug('Creating SessionManager...');
  const [sessionManager] = useState(() => {
    const manager = new SessionManager(undefined, databaseService);
    // Configure LLMService and ContextManager with TodoistAIService
    logger.debug('Configuring LLMService with TodoistAIService...');
    llmService.setTodoistAIService(todoistAIService);
    manager.getContextManager().setTodoistAIService(todoistAIService);
    return manager;
  });

  logger.debug('Creating EnhancedUserContextService...');
  const [userContextService] = useState(() => new EnhancedUserContextService(
    databaseService,
    llmService
  ));

  const addSystemMessage = async (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      role: 'system',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
    
    // Also save to current session
    try {
      await sessionManager.addMessage(message);
    } catch (error) {
      logger.error('Errore nel salvare il messaggio di sistema nella sessione:', error);
    }
  };

  const [commandHandler] = useState(() => {
    const context: CommandContext = {
      todoistService,
      sessionManager,
      databaseService,
      llmService,
      onOutput: (message: string) => { addSystemMessage(message); },
      onError: (error: string) => { addSystemMessage(`❌ ${error}`); },
      onProgressUpdate: (steps: LoadingStep[]) => setLoadingSteps(steps)
    };
    return new CommandHandler(context);
  });
  
  // Session resume states
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);
  const [sessionContext, setSessionContext] = useState<string>('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [prioritySessionId, setPrioritySessionId] = useState<string | undefined>();
  
  // Context states
  const [contextInfo, setContextInfo] = useState<string | null>(null);
  const [contextDescription, setContextDescription] = useState<string | null>(null);
  const [costInfo, setCostInfo] = useState<string | null>(null);

  // Check CLI arguments for session resume and initial message
  useEffect(() => {
    if (cliArgs.resume) {
      if (cliArgs.sessionId) {
        // Resume specific session directly - hide splash and load session
        setShowSplash(false);
        setPrioritySessionId(cliArgs.sessionId);
        handleResumeSpecificSession(cliArgs.sessionId);
      } else {
        // Show session selector after splash completes
        setShowSessionSelector(true);
      }
    } else {
      // Normal startup - create new session after splash completes
      // Don't hide splash, just wait for it to complete
    }
  }, [cliArgs]);

  const handleResumeSpecificSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      setLoadingMessage(UIMessageManager.getMessage('loadingSession'));
      
      const result = await sessionManager.resumeSessionWithContext(sessionId);
      if (result) {
        setSessionContext(result.context);
        setMessages(result.session.messages || []);
        if (result.context) {
          await addSystemMessage(UIMessageManager.getMessage('sessionResumed') + `: ${result.context.substring(0, 100)}...`);
        }
      } else {
        await addSystemMessage(UIMessageManager.getMessage('sessionLoadError', { id: sessionId }));
      }
    } catch (error) {
      await addSystemMessage(UIMessageManager.getMessage('sessionLoadingError', { error: String(error) }));
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionsForSelection = async (page: number = 0) => {
    try {
      const result = await sessionManager.getSessionsForSelection(page, 5, prioritySessionId);
      setSessions(result.sessions);
      setCurrentPage(result.currentPage);
      setTotalSessions(result.totalSessions);
      setHasMore(result.hasMore);
      setShowSessionSelector(true);
    } catch (error) {
      await addSystemMessage(UIMessageManager.getMessage('sessionLoadingError', { error: String(error) }));
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      setSelectedSessionIndex(0); // Reset selection to first element
      loadSessionsForSelection(nextPage);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      setSelectedSessionIndex(0); // Reset selection to first element
      loadSessionsForSelection(prevPage);
    }
  };

  const handleSessionSelected = async (sessionId: string) => {
    setShowSessionSelector(false);
    await handleResumeSpecificSession(sessionId);
  };

  const handleSessionSelectorCancel = async () => {
    setShowSessionSelector(false);
    // Create new session instead
    const newSession = await sessionManager.createSession(
      `Session ${new Date().toLocaleDateString()}`,
      'claude'
    );
    
    // Update the interface to show the new session
    setMessages([]);
    await addSystemMessage(UIMessageManager.getMessage('newSessionCreated', { name: newSession.name, id: newSession.id }));
  };

  // Update context information from session manager
  const updateContextInfo = async () => {
    try {
      const info = await sessionManager.getContextInfo();
      const description = await sessionManager.getContextDescription();
      
      // If info is null (no messages), calculate default value using ModelManager
      if (!info) {
        const modelManager = sessionManager.getContextManager().getModelManager();
        const currentModel = modelManager.getCurrentModel();
        const modelConfig = modelManager.getModelConfig(currentModel);
        const defaultInfo = `0% (0/${modelConfig.contextWindow})`;
        setContextInfo(defaultInfo);
      } else {
        setContextInfo(info);
      }
      
      setContextDescription(description);
      
      // Get cost information from LLMService
      try {
        const currentCost = await llmService.getCurrentSessionCost();
        if (currentCost > 0) {
          setCostInfo(`$${currentCost.toFixed(4)}`);
        } else {
          setCostInfo('$0.0000');
        }
      } catch (costError) {
        logger.error('Error getting cost info:', costError);
        setCostInfo('$0.0000');
      }
    } catch (error) {
      logger.error('Error updating context info:', error);
    }
  };

  // Handle splash completion
  useEffect(() => {
    if (splashCompleted && !showSessionSelector && messages.length === 0) {
      // Create new session when splash completes in normal mode
      const createNewSession = async () => {
        try {
          // Create the session first
          await sessionManager.createSession(
            `Session ${new Date().toLocaleDateString()}`,
            'claude'
          );

          // Generate and add initial user context
          logger.debug('Generating initial user context...');
          // Use fewer sessions for faster startup, allow async refresh
          const enhancedContext = await userContextService.generateEnhancedContext();
        const userContext = userContextService.getFormattedContext(enhancedContext);
          
          if (userContext) {
            logger.debug('Adding user context to new session');
            await addSystemMessage(userContext);
          } else {
            logger.debug('No user context generated - starting fresh session');
          }
        } catch (error) {
          logger.error('Error creating session with user context:', error);
          // Fallback: create session without context
          await sessionManager.createSession(
            `Session ${new Date().toLocaleDateString()}`,
            'claude'
          );
        }
      };
      createNewSession();
    }
  }, [splashCompleted, showSessionSelector, messages.length, sessionManager, userContextService]);

  // Handle session selector after splash completion
  useEffect(() => {
    if (splashCompleted && showSessionSelector) {
      loadSessionsForSelection();
    }
  }, [splashCompleted, showSessionSelector]);

  // Handle initial message from CLI args
  useEffect(() => {
    logger.debug('CLI message effect triggered:', {
      hasMessage: !!cliArgs.message,
      message: cliArgs.message,
      splashCompleted,
      showSessionSelector,
      isLoading,
      messagesLength: messages.length
    });
    
    if (cliArgs.message && splashCompleted && !showSessionSelector && !isLoading && messages.length === 0) {
      logger.info('Sending initial CLI message:', cliArgs.message);
      // Send the initial message automatically
      handleSubmit(cliArgs.message);
    }
  }, [cliArgs.message, splashCompleted, showSessionSelector, isLoading, messages.length]);

  // Update context info when messages change or when splash/session selector state changes
  useEffect(() => {
    // Only update context info when app is fully loaded (no splash, no session selector)
    if (!showSplash && !showSessionSelector) {
      updateContextInfo();
    }
  }, [messages.length, showSplash, showSessionSelector]);

  // Initial context info update when component mounts
  useEffect(() => {
    updateContextInfo();
  }, []);

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
      // Send to LLM - Include all current conversation messages
      const llmMessages = [
        ...(sessionContext ? [{
          role: 'system' as const,
          content: UIMessageManager.getMessage('sessionContext', { context: sessionContext })
        }] : []),
        // Include all messages from current conversation
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        })),
        {
          role: 'user' as const,
          content: input
        }
      ];
      
      const response = await llmService.chatWithTools(llmMessages);
      
      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        metadata: {
          llmProvider: 'claude',
          processingTime: 0
        }
      };
      setMessages(prev => [...prev, aiMessage]);

      // Save to session
      await sessionManager.addMessage(userMessage);
      await sessionManager.addMessage(aiMessage);
      
      // Update context info
      updateContextInfo();

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
    // Handle special UI commands that don't go through CommandHandler
    switch (command) {
      case 'clear':
        setMessages([]);
        return;
      case 'exit':
        exit();
        return;
      case 'sessions':
        await loadSessionsForSelection();
        return;
    }

    try {
      // Set loading state for progressive commands
      setIsLoading(true);
      setLoadingSteps([]);

      // Use CommandHandler for all other commands
      const fullCommand = `/${command} ${args.join(' ')}`.trim();
      const result = await commandHandler.executeCommand(fullCommand);
      
      if (!result.success) {
        await addSystemMessage(result.message);
      } else if (result.message) {
        // Show success message if provided
        await addSystemMessage(result.message);
      }
    } finally {
      // Clear loading state
      setIsLoading(false);
      setLoadingSteps([]);
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Box flexDirection="column" height="100%">
        {/* Content Area - shows splash with session selector or messages */}
        <Box flexGrow={1}>
          <Box flexDirection="column">
            <SplashScreen 
              keepVisible={true}
              onComplete={() => setSplashCompleted(true)}
              currentModel={llmService.getCurrentModel()}
            />
            {showSessionSelector && splashCompleted && (
              <SessionSelector
                sessions={sessions}
                selectedIndex={selectedSessionIndex}
                onIndexChange={setSelectedSessionIndex}
                onSessionSelected={handleSessionSelected}
                onCancel={handleSessionSelectorCancel}
                loading={false}
                currentPage={currentPage}
                totalSessions={totalSessions}
                hasMore={hasMore}
                onNextPage={handleNextPage}
                onPrevPage={handlePrevPage}
              />
            )}
            {!showSessionSelector && (
              <ContentArea 
                messages={messages}
                isLoading={isLoading}
                loadingMessage={loadingMessage}
                loadingSteps={loadingSteps}
              />
            )}
          </Box>
        </Box>

        {/* Context Indicator - above input */}
        {!showSessionSelector && (
          <ContextIndicator
            contextInfo={contextInfo}
            contextDescription={contextDescription}
            costInfo={costInfo}
            position="above-input"
          />
        )}

        {/* Input Area - always at bottom */}
        <InputArea
          onSubmit={handleSubmit}
          onSlashCommand={handleSlashCommand}
          disabled={isLoading || !splashCompleted || showSessionSelector}
        />
      </Box>
    </ThemeProvider>
  );
};