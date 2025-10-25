import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import figures from 'figures';
import { UIMessageManager } from '../utils/UIMessages.js';

interface TransformProps {
  type: 'projects' | 'tasks' | 'ai' | 'search' | 'session';
  count?: number;
  message?: string;
  isActive: boolean;
}

const Transform: React.FC<TransformProps> = ({ type, count, message, isActive }) => {
  const [frame, setFrame] = useState(0);
  const [dots, setDots] = useState('');

  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setFrame(prev => (prev + 1) % spinnerFrames.length);
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, spinnerFrames.length]);

  if (!isActive) return null;

  const getTypeInfo = () => {
    switch (type) {
      case 'projects':
        return {
          icon: '📁',
          text: `Processing ${count || 0} projects`,
          color: 'blue'
        };
      case 'tasks':
        return {
          icon: '✅',
          text: `Analyzing ${count || 0} tasks`,
          color: 'green'
        };
      case 'ai':
        return {
          icon: '🤖',
          text: message || 'AI processing in progress',
          color: 'magenta'
        };
      case 'search':
        return {
          icon: '🔍',
          text: `Searching in ${count || 0} sessions`,
          color: 'yellow'
        };
      case 'session':
        return {
          icon: '💾',
          text: message || 'Session management',
          color: 'cyan'
        };
      default:
        return {
          icon: '⚡',
          text: 'Processing',
          color: 'white'
        };
    }
  };

  const { icon, text, color } = getTypeInfo();

  return (
    <Box marginY={1}>
      <Text color={color}>
        {spinnerFrames[frame]} {icon} {text}{dots}
      </Text>
    </Box>
  );
};

export default Transform;