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
      'Recuperando i tuoi task',
      'Sincronizzando con il task manager',
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
      'Elaborazione risposta',
      'Elaborando',
      'Quasi fatto',
      'Completando'
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

  // Cambio messaggio e fade effect
  useEffect(() => {
    if (!fadeEffect || message) return; // Non cambiare messaggio se è fornito esplicitamente
    
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