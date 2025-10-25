import React from 'react';
// @ts-ignore
import { Box, Text } from 'ink';
// @ts-ignore
import figures from 'figures';

interface Command {
  name: string;
  description: string;
  category: 'general' | 'session';
}

interface CommandMenuProps {
  isVisible: boolean;
  selectedIndex: number;
  filter: string;
  onTabComplete?: (command: string) => void;
}

const commands: Command[] = [
  // General commands
  { name: 'help', description: 'Show this help', category: 'general' },
  { name: 'clear', description: 'Clear the chat', category: 'general' },
  { name: 'status', description: 'Show system status', category: 'general' },
  { name: 'exit', description: 'Exit the application', category: 'general' },
  
  // Session commands
  { name: 'sessions', description: 'List saved sessions', category: 'session' },
  { name: 'new', description: 'Create new session', category: 'session' },
  { name: 'save', description: 'Save current session', category: 'session' },
  { name: 'load', description: 'Load existing session', category: 'session' },
  { name: 'search', description: 'Search in messages', category: 'session' },
  { name: 'delete-session', description: 'Delete session', category: 'session' }
];

export const CommandMenu = ({ isVisible, selectedIndex, filter, onTabComplete }: CommandMenuProps) => {
  if (!isVisible) return null;

  const filteredCommands = commands.filter((cmd: Command) => 
    cmd.name.toLowerCase().includes(filter.toLowerCase()) ||
    cmd.description.toLowerCase().includes(filter.toLowerCase())
  );

  // Get the currently selected command for tab completion
  const getSelectedCommand = () => {
    if (filteredCommands.length > 0 && selectedIndex >= 0 && selectedIndex < filteredCommands.length) {
      return filteredCommands[selectedIndex];
    }
    return null;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'general': return 'white';
      case 'todoist': return 'green';
      case 'session': return 'blue';
      case 'ai': return 'magenta';
      default: return 'white';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'general': return '⚙️';
      case 'session': return '💾';
      default: return '📝';
    }
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          {figures.arrowRight} Available commands ({filteredCommands.length})
        </Text>
      </Box>
      
      <Box flexDirection="column">
        {filteredCommands.map((command: Command, index: number) => (
          <Box key={command.name} marginLeft={2}>
            <Text color={index === selectedIndex ? 'black' : getCategoryColor(command.category)}
                  backgroundColor={index === selectedIndex ? 'cyan' : undefined}>
              {index === selectedIndex ? figures.pointer : ' '} 
              {getCategoryIcon(command.category)} /{command.name} - {command.description}
            </Text>
          </Box>
        ))}
      </Box>
      
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          {figures.arrowUp}{figures.arrowDown} Navigate • Tab Autocomplete • Enter Select • Esc Close
        </Text>
      </Box>
    </Box>
  );
};