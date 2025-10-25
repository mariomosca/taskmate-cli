import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface LoadingIndicatorProps {
  message?: string;
  type?: 'tasks' | 'projects' | 'sync' | 'api' | 'general';
  showTimer?: boolean;
  showSpinner?: boolean;
  fadeEffect?: boolean;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message, 
  type = 'general', 
  showTimer = true,
  showSpinner = true,
  fadeEffect = true
}) => {
  const [seconds, setSeconds] = useState<number>(0);
  const [messageIndex, setMessageIndex] = useState<number>(0);
  const [fadeOpacity, setFadeOpacity] = useState<number>(1);

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

  // Message change and fade effect
  useEffect(() => {
    if (!fadeEffect || message) return; // Don't change message if explicitly provided
    
    const interval = setInterval(() => {
      // Fade out
      setFadeOpacity(0.3);
      
      setTimeout(() => {
        setMessageIndex((prev: number) => (prev + 1) % currentMessages.length);
        // Fade in
        setFadeOpacity(1);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [fadeEffect, message, currentMessages.length]);

  // Colori per il fade effect
  const getTextColor = () => {
    if (!fadeEffect) return 'cyan';
    
    // Simula fade usando diversi livelli di luminosità
    if (fadeOpacity > 0.8) return 'cyan';
    if (fadeOpacity > 0.6) return 'blue';
    if (fadeOpacity > 0.4) return 'blueBright';
    return 'gray';
  };

  const getTimerColor = () => {
    // Cambia colore del timer in base ai secondi
    if (seconds < 5) return 'green';
    if (seconds < 15) return 'yellow';
    if (seconds < 30) return 'orange';
    return 'red';
  };

  return (
    <Box flexDirection="row" alignItems="center" marginY={1}>
      {/* Spinner */}
      {showSpinner && (
        <Box marginRight={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
        </Box>
      )}
      
      {/* Messaggio con 3 puntini fissi */}
      <Box marginRight={2}>
        <Text color={getTextColor()}>
          {displayMessage}...
        </Text>
      </Box>
      
      {/* Timer */}
      {showTimer && (
        <Box>
          <Text color={getTimerColor()} dimColor={seconds < 5}>
            {seconds}s
          </Text>
        </Box>
      )}
    </Box>
  );
};