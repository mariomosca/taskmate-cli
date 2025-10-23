import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import BigText from 'ink-big-text';
import Spinner from 'ink-spinner';
import gradient from 'gradient-string';
import figures from 'figures';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
  keepVisible?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onComplete, 
  duration = 3000,
  keepVisible = false
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const steps = [
    'Inizializzazione Todoist AI CLI...',
    'Caricamento configurazione...',
    'Connessione ai servizi AI...',
    'Pronto!'
  ];

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          setIsCompleted(true);
          if (!keepVisible) {
            setTimeout(() => onComplete?.(), 500);
          } else {
            onComplete?.();
          }
          return prev;
        }
      });
    }, duration / steps.length);

    return () => clearInterval(stepInterval);
  }, [duration, onComplete, steps.length, keepVisible]);

  const titleGradient = gradient(['#FF6B6B', '#4ECDC4', '#45B7D1']);
  const subtitleGradient = gradient(['#96CEB4', '#FFEAA7']);

  return (
    <Box 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center"
      height={keepVisible ? undefined : 10}
      paddingY={2}
    >
      <Box marginBottom={2}>
        <BigText 
          text="TODOIST AI" 
          font="block"
          colors={['#FF6B6B', '#4ECDC4', '#45B7D1']}
        />
      </Box>
      
      <Box marginBottom={1}>
        <Text>
          {subtitleGradient('🤖 Powered by Claude & Gemini 🤖')}
        </Text>
      </Box>
      
      <Box marginBottom={2}>
        <Text color="gray">
          v0.1.0 - Versione Minimal
        </Text>
      </Box>

      {!isCompleted && (
        <Box flexDirection="row" alignItems="center" marginBottom={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Box marginLeft={1}>
            <Text color="white">{steps[currentStep]}</Text>
          </Box>
        </Box>
      )}

      {isCompleted && keepVisible && (
        <Box flexDirection="row" alignItems="center">
          <Text color="green">{figures.tick} </Text>
          <Text color="green">Sistema pronto per l'uso!</Text>
        </Box>
      )}
    </Box>
  );
};