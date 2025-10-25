import React from 'react';
import { Box, Text } from 'ink';
import { StatusMessage, Alert, Badge } from '@inkjs/ui';
import { Message } from '../types/index.js';
import { LoadingStep } from '../services/CommandHandler.js';
import { LoadingIndicator } from './LoadingIndicator.js';
import { logger } from '../utils/logger.js';
import { UIMessageManager } from '../utils/UIMessages.js';
import figures from 'figures';

interface ContentAreaProps {
  messages: Message[];
  isLoading?: boolean;
  loadingMessage?: string;
  loadingSteps?: LoadingStep[];
}

export const ContentArea = ({
  messages,
  isLoading = false,
  loadingMessage = UIMessageManager.getMessage('processing'),
  loadingSteps
}: ContentAreaProps) => {
  // Log dettagliato ogni volta che il componente viene renderizzato
  logger.debug('ContentArea render', {
    messagesCount: messages.length,
    isLoading,
    loadingMessage,
    loadingStepsCount: loadingSteps?.length || 0,
    messages: messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      contentLength: msg.content?.length || 0,
      contentPreview: msg.content?.substring(0, 50) || '(empty)',
      hasMetadata: !!msg.metadata,
      timestamp: msg.timestamp
    }))
  });

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    
    // Detailed log for each rendered message
    logger.debug('Rendering message', {
      messageId: message.id,
      role: message.role,
      isUser,
      contentType: typeof message.content,
      contentLength: message.content?.length || 0,
      contentIsEmpty: !message.content || message.content === '',
      contentValue: message.content,
      hasMetadata: !!message.metadata,
      processingTime: message.metadata?.processingTime
    });
    
    return (
      <Box key={message.id} flexDirection="column" marginBottom={1}>
        {isUser && (
          <Box flexDirection="row" alignItems="center" marginBottom={1}>
            <Badge color="green">👤 Tu</Badge>
          </Box>
        )}
        
        {message.role === 'assistant' && (
          <Box flexDirection="row" alignItems="center" marginBottom={1}>
            <Badge color="blue">🤖 Assistant</Badge>
          </Box>
        )}
        
        <Box paddingLeft={isUser ? 1 : 0}>
          <Text color={isUser ? 'white' : 'blue'}>
            {message.content || '(empty message)'}
          </Text>
        </Box>
        
      </Box>
    );
  };

  const renderLoadingIndicator = () => (
    <Box flexDirection="column" marginBottom={1}>
      {loadingSteps && loadingSteps.length > 0 ? (
        <Box flexDirection="column">
          {loadingSteps.map((step) => (
            <Box key={step.id} flexDirection="row" alignItems="center" marginBottom={1}>
              <Box marginRight={1}>
                {step.status === 'loading' && (
                  <Badge color="blue">⏳</Badge>
                )}
                {step.status === 'completed' && (
                  <Badge color="green">✓</Badge>
                )}
                {step.status === 'error' && (
                  <Badge color="red">✗</Badge>
                )}
                {step.status === 'pending' && (
                  <Badge color="gray">○</Badge>
                )}
              </Box>
              <StatusMessage 
                variant={
                  step.status === 'loading' ? 'info' : 
                  step.status === 'completed' ? 'success' : 
                  step.status === 'error' ? 'error' : 'info'
                }
              >
                {step.message}
              </StatusMessage>
            </Box>
          ))}
        </Box>
      ) : (
        <LoadingIndicator 
          message={loadingMessage}
          type="api"
          showTimer={true}
          showSpinner={true}
        />
      )}
    </Box>
  );

  return (
    <Box 
      flexDirection="column" 
      flexGrow={1}
      paddingX={1}
      paddingY={1}
    >
      {messages.length === 0 && !isLoading ? (
        <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
          <Alert variant="info">
            No messages yet
          </Alert>
          <Box marginTop={1}>
            <StatusMessage variant="info">
              Start a conversation or use / for commands
            </StatusMessage>
          </Box>
        </Box>
      ) : (
        <>
          {messages.map(renderMessage)}
          {isLoading && renderLoadingIndicator()}
        </>
      )}
    </Box>
  );
};