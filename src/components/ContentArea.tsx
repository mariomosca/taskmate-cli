import React from 'react';
import { Box, Text } from 'ink';
import { Message } from '../types';
import { LoadingStep } from '../services/CommandHandler.js';
import { ProgressiveLoader } from './ProgressiveLoader.js';
import figures from 'figures';

interface ContentAreaProps {
  messages: Message[];
  isLoading?: boolean;
  loadingMessage?: string;
  loadingSteps?: LoadingStep[];
}

export const ContentArea: React.FC<ContentAreaProps> = ({
  messages,
  isLoading = false,
  loadingMessage = 'Elaborazione in corso...',
  loadingSteps
}) => {
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const icon = isUser ? figures.arrowRight : '🤖';
    const color = isUser ? 'cyan' : 'green';
    
    return (
      <Box key={message.id} flexDirection="column" marginBottom={1}>
        <Box flexDirection="row" alignItems="center" marginBottom={0}>
          <Text color={color}>{icon} </Text>
          <Text color={color} bold>
            {isUser ? 'Tu' : 'AI Assistant'}
          </Text>
          <Text color="gray" dimColor>
            {' '}• {message.timestamp.toLocaleTimeString()}
          </Text>
        </Box>
        
        <Box paddingLeft={3}>
          <Text>{message.content}</Text>
        </Box>
        
        {message.metadata && (
          <Box paddingLeft={3} marginTop={0}>
            <Text color="gray" dimColor>
              {message.metadata.llmProvider && `Provider: ${message.metadata.llmProvider}`}
              {message.metadata.processingTime && ` • ${message.metadata.processingTime}ms`}
            </Text>
          </Box>
        )}
      </Box>
    );
  };

  const renderLoadingIndicator = () => (
    <Box flexDirection="row" alignItems="center" marginBottom={1}>
      {loadingSteps && loadingSteps.length > 0 ? (
        <ProgressiveLoader steps={loadingSteps} />
      ) : (
        <>
          <Text color="yellow">{figures.ellipsis} </Text>
          <Text color="yellow">{loadingMessage}</Text>
        </>
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