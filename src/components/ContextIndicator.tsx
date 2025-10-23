// @ts-ignore
import React from 'react';
// @ts-ignore
import { Box, Text } from 'ink';

interface ContextIndicatorProps {
  contextInfo: string | null;
  contextDescription: string | null;
  position?: 'top-right' | 'bottom-right' | 'above-input';
}

export const ContextIndicator = ({
  contextInfo,
  contextDescription,
  position = 'above-input'
}: ContextIndicatorProps) => {
  
  // Extract percentage from contextInfo if available
  const getContextPercentage = (info: string | null): number => {
    if (!info) return 0;
    const match = info.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  };

  // Get color based on context fill percentage
  const getContextColor = (percentage: number): string => {
    if (percentage === 0) return 'gray';
    if (percentage <= 30) return 'green';
    if (percentage <= 70) return 'yellow';
    return 'red';
  };

  // Simple display text without icons
  const percentage = getContextPercentage(contextInfo);
  const displayText = contextInfo || `0% (0/8192)`;
  const textColor = getContextColor(percentage);

  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return {
          position: 'absolute' as const,
          top: 0,
          right: 0,
          justifyContent: 'flex-end'
        };
      case 'bottom-right':
        return {
          position: 'absolute' as const,
          bottom: 0,
          right: 0,
          justifyContent: 'flex-end'
        };
      case 'above-input':
      default:
        return {
          justifyContent: 'flex-end',
          marginBottom: -1
        };
    }
  };

  return (
    <Box {...getPositionStyles()}>
      <Text color={textColor} bold>
        {displayText}
      </Text>
    </Box>
  );
};