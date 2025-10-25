import React from 'react';
import { Box, Text } from 'ink';
import { Message } from '../types/index.js';
import { LoadingStep } from '../services/CommandHandler.js';
import { LoadingIndicator } from './LoadingIndicator.js';
import { logger } from '../utils/logger.js';
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
  loadingMessage = 'Elaborazione in corso...',
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
    const icon = isUser ? figures.arrowRight : '';
    const color = isUser ? 'cyan' : 'green';
    
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
          <Box flexDirection="row" alignItems="center" marginBottom={0}>
            <Text color={color}>{icon} </Text>
            <Text color={color} bold>Tu</Text>
          </Box>
        )}
        
        <Box paddingLeft={isUser ? 3 : 0}>
          <Text color={isUser ? 'white' : 'green'}>
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
            <Box key={step.id} flexDirection="row" alignItems="center">
              {step.status === 'loading' && (
                <Text color="blue">{figures.ellipsis} </Text>
              )}
              {step.status === 'completed' && (
                <Text color="green">✓ </Text>
              )}
              {step.status === 'error' && (
                <Text color="red">✗ </Text>
              )}
              {step.status === 'pending' && (
                <Text color="gray">○ </Text>
              )}
              <Text color={
                step.status === 'loading' ? 'blue' : 
                step.status === 'completed' ? 'green' : 
                step.status === 'error' ? 'red' : 'gray'
              }>
                {step.message}
              </Text>
            </Box>
          ))}
        </Box>
      ) : (
        <LoadingIndicator 
          message={loadingMessage}
          type="api"
          showTimer={true}
          showSpinner={true}
          fadeEffect={true}
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
          <Text color="gray" dimColor>
            {figures.info} No messages yet
          </Text>
          <Text color="gray" dimColor>
            Start a conversation or use / for commands
          </Text>
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