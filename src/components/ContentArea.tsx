import React from 'react';
import { Box, Text } from 'ink';
import { Message } from '../types/index.js';
import { LoadingStep } from '../services/CommandHandler.js';
import { LoadingIndicator } from './LoadingIndicator.js';
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
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const icon = isUser ? figures.arrowRight : '';
    const color = isUser ? 'cyan' : 'green';
    
    return (
      <Box key={message.id} flexDirection="column" marginBottom={1}>
        {isUser && (
          <Box flexDirection="row" alignItems="center" marginBottom={0}>
            <Text color={color}>{icon} </Text>
            <Text color={color} bold>Tu</Text>
          </Box>
        )}
        
        <Box paddingLeft={isUser ? 3 : 0}>
          <Text color={isUser ? 'white' : 'green'}>{message.content}</Text>
        </Box>
        
        {message.metadata && message.metadata.processingTime && (
          <Box paddingLeft={3} marginTop={0}>
            <Text color="gray" dimColor>
              {message.metadata.processingTime}ms
            </Text>
          </Box>
        )}
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
            {figures.info} Nessun messaggio ancora
          </Text>
          <Text color="gray" dimColor>
            Inizia una conversazione o usa / per i comandi
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