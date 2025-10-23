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
  // General commands (più usati per primi)
  { name: 'help', description: 'Mostra questo aiuto', category: 'general' },
  { name: 'clear', description: 'Pulisci la chat', category: 'general' },
  { name: 'status', description: 'Mostra stato sistema', category: 'general' },
  { name: 'exit', description: 'Esci dall\'applicazione', category: 'general' },
  
  // Session commands (gestione sessioni)
  { name: 'sessions', description: 'Lista sessioni salvate', category: 'session' },
  { name: 'new', description: 'Crea nuova sessione', category: 'session' },
  { name: 'save', description: 'Salva sessione corrente', category: 'session' },
  { name: 'load', description: 'Carica sessione esistente', category: 'session' },
  { name: 'search', description: 'Cerca nei messaggi', category: 'session' },
  { name: 'delete-session', description: 'Elimina sessione', category: 'session' }
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
          {figures.arrowRight} Comandi disponibili ({filteredCommands.length})
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
          {figures.arrowUp}{figures.arrowDown} Naviga • Tab Autocompleta • Enter Seleziona • Esc Chiudi
        </Text>
      </Box>
    </Box>
  );
};