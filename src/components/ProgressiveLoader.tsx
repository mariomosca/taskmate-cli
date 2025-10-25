import React from 'react';
import { Box, Text } from 'ink';
import { Spinner, StatusMessage, Badge } from '@inkjs/ui';

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
        <Box key={step.id} marginBottom={(step.status === 'completed' && step.result) ? 1 : 0}>
          <Box flexDirection="row" alignItems="center">
            <Box marginRight={1}>
              {step.status === 'loading' && (
                <Badge color="blue">
                  <Spinner />
                </Badge>
              )}
              {step.status === 'completed' && (
                <Badge color="green">✓</Badge>
              )}
              {step.status === 'error' && (
                <Badge color="red">✗</Badge>
              )}
              {step.status === 'pending' && (
                <Badge color="gray">○</Badge>
              )}
            </Box>
            <StatusMessage 
              variant={
                step.status === 'loading' ? 'info' : 
                step.status === 'completed' ? 'success' : 
                step.status === 'error' ? 'error' : 'info'
              }
            >
              {step.message}
            </StatusMessage>
          </Box>
          {step.status === 'completed' && step.result && (
            <Box paddingLeft={2} marginTop={1}>
              <Text color="gray">{step.result}</Text>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};