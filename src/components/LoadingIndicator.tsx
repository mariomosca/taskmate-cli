import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Spinner, StatusMessage } from '@inkjs/ui';

interface LoadingIndicatorProps {
  message?: string;
  type?: 'tasks' | 'projects' | 'sync' | 'api' | 'general';
  showTimer?: boolean;
  showSpinner?: boolean;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message, 
  type = 'general', 
  showTimer = true,
  showSpinner = true,
  variant = 'info'
}) => {
  const [seconds, setSeconds] = useState<number>(0);
  const [messageIndex, setMessageIndex] = useState<number>(0);

  const loadingMessages = {
    tasks: [
      'Retrieving your tasks',
      'Syncing with task manager',
      'Organizing activities',
      'Almost ready'
    ],
    projects: [
      'Loading projects',
      'Syncing data',
      'Preparing view',
      'Finalizing'
    ],
    sync: [
      'Synchronization in progress',
      'Updating local data',
      'Verifying changes',
      'Completing sync'
    ],
    api: [
      'Connecting to server',
      'Processing request',
      'Receiving data',
      'Processing response'
    ],
    general: [
      'Processing response',
      'Processing',
      'Almost done',
      'Completing'
    ]
  };

  const currentMessages = loadingMessages[type];
  const displayMessage = message || currentMessages[messageIndex];

  // Timer dei secondi
  useEffect(() => {
    if (!showTimer) return;
    
    const interval = setInterval(() => {
      setSeconds((prev: number) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimer]);

  // Message rotation
  useEffect(() => {
    if (message) return; // Don't change message if explicitly provided
    
    const interval = setInterval(() => {
      setMessageIndex((prev: number) => (prev + 1) % currentMessages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [message, currentMessages.length]);

  const getTimerColor = () => {
    // Cambia colore del timer in base ai secondi
    if (seconds < 5) return 'green';
    if (seconds < 15) return 'yellow';
    if (seconds < 30) return 'orange';
    return 'red';
  };

  // Se showSpinner è false, usa StatusMessage per un messaggio più pulito
  if (!showSpinner) {
    return (
      <Box flexDirection="row" alignItems="center" marginY={1}>
        <StatusMessage variant={variant}>
          {displayMessage}
        </StatusMessage>
        {showTimer && (
          <Box marginLeft={2}>
            <Text color={getTimerColor()} dimColor={seconds < 5}>
              {seconds}s
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="row" alignItems="center" marginY={1}>
      {/* Spinner di @inkjs/ui */}
      <Box marginRight={1}>
        <Spinner label={displayMessage} />
      </Box>
      
      {/* Timer */}
      {showTimer && (
        <Box marginLeft={2}>
          <Text color={getTimerColor()} dimColor={seconds < 5}>
            {seconds}s
          </Text>
        </Box>
      )}
    </Box>
  );
};