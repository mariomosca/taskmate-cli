import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import BigText from 'ink-big-text';
import { Spinner, StatusMessage, Alert, Badge } from '@inkjs/ui';
import gradient from 'gradient-string';
import { UIMessageManager } from '../utils/UIMessages.js';

// Global flag to track if the app has been initialized
let hasBeenInitialized = false;

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
  keepVisible?: boolean;
  currentModel?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, duration = 3000, keepVisible = false, currentModel }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);

  const steps = [
    { message: 'Initializing TaskMate CLI...', variant: 'info' as const },
    { message: UIMessageManager.getMessage('loadingConfiguration'), variant: 'info' as const },
    { message: 'Connecting to AI services...', variant: 'info' as const },
    { message: 'Ready!', variant: 'success' as const }
  ];

  // Check if this is the first time initialization
  useEffect(() => {
    if (hasBeenInitialized) {
      setIsFirstTime(false);
      setIsCompleted(true);
      setCurrentStep(steps.length - 1);
      // Complete immediately without showing completion message
      setTimeout(() => onComplete?.(), 100);
    }
  }, [onComplete, steps.length]);

  useEffect(() => {
    // Only run the initialization animation if it's the first time
    if (!isFirstTime) return;

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          setIsCompleted(true);
          setShowCompletionMessage(true);
          
          // Mark as initialized
          hasBeenInitialized = true;
          
          // Hide completion message after 1.5 seconds
          setTimeout(() => {
            setShowCompletionMessage(false);
            if (!keepVisible) {
              setTimeout(() => onComplete?.(), 200);
            } else {
              onComplete?.();
            }
          }, 1500);
          
          return prev;
        }
      });
    }, duration / steps.length);

    return () => clearInterval(stepInterval);
  }, [duration, onComplete, steps.length, keepVisible, isFirstTime]);

  const titleGradient = gradient(['#FF6B6B', '#4ECDC4', '#45B7D1']);
  const subtitleGradient = gradient(['#96CEB4', '#FFEAA7']);

  return (
    <Box 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="flex-start"
      width="100%"
    >
      <Box>
        <BigText 
          text="TASKMATE" 
          font="block"
          colors={['#FF6B6B', '#4ECDC4', '#45B7D1']}
        />
      </Box>
      
      <Box>
        <Text>
          {subtitleGradient('🤖 Powered by Claude & Gemini 🤖')}
        </Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="gray">
          v0.1.0 - {UIMessageManager.getMessage('version')} {UIMessageManager.getMessage('minimal')}
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="row" alignItems="center">
        <Text color="cyan">🤖 Model: </Text>
        <Badge color="blue">{currentModel}</Badge>
      </Box>

      {!isCompleted && (
        <Box marginTop={1}>
          <StatusMessage variant={steps[currentStep].variant}>
            {steps[currentStep].message}
          </StatusMessage>
        </Box>
      )}

      {isCompleted && showCompletionMessage && (
        <Box marginTop={1}>
          <Alert variant="success">
            {UIMessageManager.getMessage('systemReady')}
          </Alert>
        </Box>
      )}
    </Box>
  );
};