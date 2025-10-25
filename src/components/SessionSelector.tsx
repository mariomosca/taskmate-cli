import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Select } from '@inkjs/ui';
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
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>();

  // Update selected session when selectedIndex changes
  useEffect(() => {
    if (sessions[selectedIndex]) {
      setSelectedSessionId(sessions[selectedIndex].id);
    }
  }, [selectedIndex, sessions]);

  // Handle pagination navigation
  useInput((input, key) => {
    if (loading) return;

    if (key.escape || input === 'q') {
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

  // Convert sessions to Select options
  const options = sessions.map(session => ({
    label: `${session.name} (${session.messageCount} messages, ${session.lastActivity.toLocaleDateString()})`,
    value: session.id
  }));

  const handleSessionChange = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex !== -1) {
      onIndexChange(sessionIndex);
      onSessionSelected(sessionId);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="green" bold>
        {UIMessageManager.getMessage('selectSession')}
      </Text>
      
      <Box marginTop={1}>
        <Select
          options={options}
          defaultValue={selectedSessionId}
          onChange={handleSessionChange}
          visibleOptionCount={5}
        />
      </Box>
      
      <Box marginTop={1}>
        <Text color="gray">
          Use arrow keys to navigate, Enter to select, Escape to cancel
        </Text>
      </Box>
      
      {(hasMore || currentPage > 0) && (
        <Box marginTop={1}>
          <Text color="gray">
            Page {currentPage + 1} of {Math.ceil(totalSessions / sessions.length)} | 
            {currentPage > 0 && ' ← Previous'} 
            {hasMore && ' Next →'}
          </Text>
        </Box>
      )}
    </Box>
  );
};