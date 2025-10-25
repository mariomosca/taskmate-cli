import React from 'react';
import { Box, Text, useInput } from 'ink';
import { StatusMessage, Alert, Badge } from '@inkjs/ui';
import { SessionManager } from '../services/SessionManager.js';
import { llmService } from '../services/LLMService.js';
import { Message } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { UIMessageManager } from '../utils/UIMessages.js';

interface ChatInterfaceProps {
  sessionManager: SessionManager;
  sessionContext?: string;
  onExit: () => void;
}

interface ChatState {
  messages: Message[];
  currentInput: string;
  isLoading: boolean;
  error?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  sessionManager,
  sessionContext,
  onExit
}) => {
  const [state, setState] = React.useState<ChatState>({
    messages: sessionManager.getCurrentSession()?.messages || [],
    currentInput: '',
    isLoading: false
  });

  const sendMessage = async (content: string) => {
    logger.debug('ChatInterface.sendMessage called', { content: content.trim() });
    
    if (!content.trim() || state.isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      metadata: {}
    };

    logger.debug('User message created', { messageId: userMessage.id });

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      currentInput: '',
      isLoading: true,
      error: undefined
    }));

    try {
      logger.debug('Adding message to session...');
      // Add message to session
      await sessionManager.addMessage(userMessage);

      // Prepara i messaggi per l'LLM
      const llmMessages = state.messages.concat(userMessage).map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      logger.debug('LLM messages prepared', { messageCount: llmMessages.length });

      // Add session context if available
      if (sessionContext && state.messages.length === 0) {
        llmMessages.unshift({
          role: 'system' as const,
          content: UIMessageManager.getMessage('sessionContext', { context: sessionContext })
        });
        logger.debug('Session context added to messages');
      }

      // Ottieni la risposta dall'LLM
      logger.debug('Calling llmService.chat...');
      const response = await llmService.chat(llmMessages);
      
      logger.debug('LLM response received', { contentLength: response.content.length });

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        metadata: {
          usage: response.usage
        }
      };

      // Add response to session
      await sessionManager.addMessage(assistantMessage);

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : UIMessageManager.getMessage('unknownError')
      }));
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      onExit();
    } else if (key.return) {
      sendMessage(state.currentInput);
    } else if (key.backspace || key.delete) {
      setState(prev => ({
        ...prev,
        currentInput: prev.currentInput.slice(0, -1)
      }));
    } else if (input && !key.ctrl && !key.meta) {
      setState(prev => ({
        ...prev,
        currentInput: prev.currentInput + input
      }));
    }
  });

  const currentSession = sessionManager.getCurrentSession();

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      {/* Header */}
      <Box borderStyle="single" borderColor="cyan" padding={1} marginBottom={1} flexDirection="row" alignItems="center">
        <Text color="cyan" bold>
          💬 {currentSession?.name || UIMessageManager.getMessage('newChat', { name: 'New Chat' })} 
        </Text>
        <Box marginLeft={2}>
          <Badge color="gray">ESC to exit</Badge>
        </Box>
      </Box>

      {/* Context info */}
      {sessionContext && state.messages.length === 0 && (
        <Box marginBottom={1}>
          <Alert variant="warning">
            {UIMessageManager.getMessage('sessionResumed')}
          </Alert>
        </Box>
      )}

      {/* Messages */}
      <Box flexDirection="column" flexGrow={1} marginBottom={1}>
        {state.messages.map((message) => (
          <Box key={message.id} marginBottom={1}>
            {message.role === 'user' && (
              <Box flexDirection="row" alignItems="center" marginBottom={1}>
                <Badge color="green">👤 Tu</Badge>
              </Box>
            )}
            {message.role === 'assistant' && (
              <Box flexDirection="row" alignItems="center" marginBottom={1}>
                <Badge color="blue">🤖 Assistant</Badge>
              </Box>
            )}
            <Text color={message.role === 'user' ? 'white' : 'blue'}>
              {message.content}
            </Text>
          </Box>
        ))}
        
        {state.isLoading && (
          <Box marginBottom={1}>
            <StatusMessage variant="info">
              {UIMessageManager.getMessage('thinking')}
            </StatusMessage>
          </Box>
        )}
      </Box>

      {/* Error */}
      {state.error && (
        <Box marginBottom={1}>
          <Alert variant="error">
            {UIMessageManager.getMessage('systemError', { error: state.error })}
          </Alert>
        </Box>
      )}

      {/* Input */}
      <Box borderStyle="single" borderColor="green" padding={1} flexDirection="row" alignItems="center">
        <Badge color="green">💬 Message</Badge>
        <Box marginLeft={1}>
          <Text>{state.currentInput}</Text>
          <Text color="gray">█</Text>
        </Box>
      </Box>
    </Box>
  );
};