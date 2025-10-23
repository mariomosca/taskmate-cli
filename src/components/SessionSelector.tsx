import React from 'react';
import { Box, Text, useInput } from 'ink';

interface SessionInfo {
  id: string;
  name: string;
  lastActivity: Date;
  messageCount: number;
}

interface SessionSelectorProps {
  sessions: SessionInfo[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  onSessionSelected: (sessionId: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({
  sessions,
  selectedIndex,
  onIndexChange,
  onSessionSelected,
  onCancel,
  loading = false
}) => {
  useInput((input, key) => {
    if (loading) return;

    if (key.upArrow && selectedIndex > 0) {
      onIndexChange(selectedIndex - 1);
    } else if (key.downArrow && selectedIndex < sessions.length - 1) {
      onIndexChange(selectedIndex + 1);
    } else if (key.return) {
      if (sessions[selectedIndex]) {
        onSessionSelected(sessions[selectedIndex].id);
      }
    } else if (key.escape || input === 'q') {
      onCancel();
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="blue">🔍 Caricamento sessioni...</Text>
      </Box>
    );
  }

  if (sessions.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">⚠️  Nessuna sessione trovata</Text>
        <Text color="gray">Premi ESC per tornare al menu principale</Text>
      </Box>
    );
  }

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `oggi alle ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return 'ieri';
    } else if (diffDays < 7) {
      return `${diffDays} giorni fa`;
    } else {
      return date.toLocaleDateString('it-IT');
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="cyan" bold>
        📋 Seleziona una sessione da riprendere
      </Text>
      <Text color="gray">
        Usa ↑/↓ per navigare, INVIO per selezionare, ESC per annullare
      </Text>
      <Text> </Text>

      {sessions.map((session: SessionInfo, index: number) => (
        <Box key={session.id} marginY={0}>
          <Text color={index === selectedIndex ? 'black' : 'white'} 
                backgroundColor={index === selectedIndex ? 'cyan' : undefined}>
            {index === selectedIndex ? '► ' : '  '}
            {session.name}
          </Text>
          <Text color="gray"> - {session.messageCount} messaggi, {formatDate(session.lastActivity)}</Text>
        </Box>
      ))}

      <Text> </Text>
      <Text color="gray" dimColor>
        ID sessione selezionata: {sessions[selectedIndex]?.id.substring(0, 12)}...
      </Text>
    </Box>
  );
};