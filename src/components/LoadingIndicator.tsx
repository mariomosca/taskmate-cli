import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface LoadingIndicatorProps {
  message?: string;
  type?: 'tasks' | 'projects' | 'sync' | 'api' | 'general';
  showTimer?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message, type = 'general', showTimer = true }) => {
  const [dots, setDots] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  const loadingMessages = {
    tasks: [
      'Recuperando i tuoi task',
      'Sincronizzando con Todoist',
      'Organizzando le attività',
      'Quasi pronto'
    ],
    projects: [
      'Caricando i progetti',
      'Sincronizzando i dati',
      'Preparando la vista',
      'Finalizzando'
    ],
    sync: [
      'Sincronizzazione in corso',
      'Aggiornando i dati locali',
      'Verificando le modifiche',
      'Completando la sync'
    ],
    api: [
      'Connessione al server',
      'Elaborando la richiesta',
      'Ricevendo i dati',
      'Processando la risposta'
    ],
    general: [
      'Caricamento in corso',
      'Elaborando',
      'Quasi fatto',
      'Completando'
    ]
  };

  const currentMessages = loadingMessages[type];
  const displayMessage = message || currentMessages[messageIndex];

  // Animazione dei puntini
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev: string) => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Timer dei secondi
  useEffect(() => {
    if (!showTimer) return;
    
    const interval = setInterval(() => {
      setSeconds((prev: number) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimer]);

  // Rotazione dei messaggi
  useEffect(() => {
    if (message) return; // Non ruotare se c'è un messaggio custom
    
    const interval = setInterval(() => {
      setMessageIndex((prev: number) => (prev + 1) % currentMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [message, currentMessages.length]);

  const getLoadingIcon = () => {
    const icons = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    return icons[seconds % icons.length];
  };

  return (
    <Box flexDirection="column" alignItems="flex-start" marginY={1}>
      <Box marginBottom={1}>
        <Text color="cyan">
          {getLoadingIcon()} {displayMessage}{dots}
        </Text>
      </Box>
      
      {showTimer && (
        <Box>
          <Text color="gray" dimColor>
            {seconds}s
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default LoadingIndicator;