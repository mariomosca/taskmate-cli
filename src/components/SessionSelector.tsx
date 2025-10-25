import React from 'react';
import { Box, Text, useInput } from 'ink';
import { UIMessageManager } from '../utils/UIMessages.js';

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
  currentPage?: number;
  totalSessions?: number;
  hasMore?: boolean;
  onNextPage?: () => void;
  onPrevPage?: () => void;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({
  sessions,
  selectedIndex,
  onIndexChange,
  onSessionSelected,
  onCancel,
  loading = false,
  currentPage = 0,
  totalSessions = 0,
  hasMore = false,
  onNextPage,
  onPrevPage
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
    } else if (key.rightArrow && hasMore && onNextPage) {
      onNextPage();
    } else if (key.leftArrow && currentPage > 0 && onPrevPage) {
      onPrevPage();
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="blue">{UIMessageManager.getMessage('loadingSessions')}</Text>
      </Box>
    );
  }

  if (sessions.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">{UIMessageManager.getMessage('noSessionsFound')}</Text>
        <Text color="gray">Press ESC to return to main menu</Text>
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
        {UIMessageManager.getMessage('selectSession')}
      </Text>
      <Text color="gray">
        {UIMessageManager.getMessage('navigationHelp')}
        {(hasMore || currentPage > 0) ? ', ←/→ to change page' : ''}
      </Text>
      {totalSessions > 0 && (
        <Text color="yellow">
          Page {currentPage + 1} - Showing {sessions.length} of {totalSessions} sessions
        </Text>
      )}
      <Text> </Text>

      {sessions.map((session: SessionInfo, index: number) => (
        <Box key={session.id} flexDirection="column" marginY={0}>
          <Box>
            <Text color={index === selectedIndex ? 'black' : 'white'} 
                  backgroundColor={index === selectedIndex ? 'cyan' : undefined}>
              {index === selectedIndex ? '► ' : '  '}
              {session.name}
            </Text>
            <Text color="gray"> - {session.messageCount} messaggi, {formatDate(session.lastActivity)}</Text>
          </Box>
          <Text color="gray" dimColor>
            {'  '}ID: {session.id}
          </Text>
        </Box>
      ))}

      <Text> </Text>
      <Text color="gray" dimColor>
        Selected session: {sessions[selectedIndex]?.name || 'None'}
      </Text>
      {sessions[selectedIndex] && (
        <Text color="blue" dimColor>
          ID completo: {sessions[selectedIndex].id}
        </Text>
      )}
      
      {(hasMore || currentPage > 0) && (
        <Box marginTop={1}>
          <Text color="gray">
            {currentPage > 0 ? '← Previous page' : ''}
            {(currentPage > 0 && hasMore) ? ' | ' : ''}
            {hasMore ? 'Next page →' : ''}
          </Text>
        </Box>
      )}
    </Box>
  );
};