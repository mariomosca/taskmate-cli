import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import figures from 'figures';

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
          text: `Elaborazione ${count || 0} progetti`,
          color: 'blue'
        };
      case 'tasks':
        return {
          icon: '✅',
          text: `Analisi ${count || 0} task`,
          color: 'green'
        };
      case 'ai':
        return {
          icon: '🤖',
          text: message || 'Elaborazione AI in corso',
          color: 'magenta'
        };
      case 'search':
        return {
          icon: '🔍',
          text: `Ricerca in ${count || 0} sessioni`,
          color: 'yellow'
        };
      case 'session':
        return {
          icon: '💾',
          text: message || 'Gestione sessione',
          color: 'cyan'
        };
      default:
        return {
          icon: '⚡',
          text: 'Elaborazione',
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