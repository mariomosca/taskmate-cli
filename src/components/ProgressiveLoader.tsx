import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

export interface LoadingStep {
  id: string;
  message: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  result?: string;
}

interface ProgressiveLoaderProps {
  steps: LoadingStep[];
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({ steps }) => {
  return (
    <Box flexDirection="column">
      {steps.map((step, index) => (
        <Box key={step.id} marginBottom={step.status === 'completed' && step.result ? 1 : 0}>
          <Box>
            {step.status === 'loading' && (
              <Box marginRight={1}>
                <Text color="blue">
                  <Spinner type="dots" />
                </Text>
              </Box>
            )}
            {step.status === 'completed' && (
              <Box marginRight={1}>
                <Text color="green">✓</Text>
              </Box>
            )}
            {step.status === 'error' && (
              <Box marginRight={1}>
                <Text color="red">✗</Text>
              </Box>
            )}
            {step.status === 'pending' && (
              <Box marginRight={1}>
                <Text color="gray">○</Text>
              </Box>
            )}
            <Text color={
              step.status === 'loading' ? 'blue' : 
              step.status === 'completed' ? 'green' : 
              step.status === 'error' ? 'red' : 'gray'
            }>
              {step.message}
            </Text>
          </Box>
          {step.status === 'completed' && step.result && (
            <Box marginTop={1} marginLeft={2}>
              <Text>{step.result}</Text>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};