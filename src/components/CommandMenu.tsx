import React from 'react';
// @ts-ignore
import { Box, Text } from 'ink';
// @ts-ignore
import figures from 'figures';

interface Command {
  name: string;
  description: string;
  category: 'general' | 'todoist' | 'session' | 'ai';
}

interface CommandMenuProps {
  isVisible: boolean;
  selectedIndex: number;
  filter: string;
  onTabComplete?: (command: string) => void;
}

const commands: Command[] = [
  // General commands
  { name: 'help', description: 'Mostra questo aiuto', category: 'general' },
  { name: 'clear', description: 'Pulisci la chat', category: 'general' },
  { name: 'exit', description: 'Esci dall\'applicazione', category: 'general' },
  
  // Todoist commands
  { name: 'tasks', description: 'Mostra task da Todoist', category: 'todoist' },
  { name: 'projects', description: 'Mostra progetti da Todoist', category: 'todoist' },
  { name: 'add-task', description: 'Aggiungi nuovo task', category: 'todoist' },
  { name: 'complete', description: 'Completa task', category: 'todoist' },
  
  // Session commands
  { name: 'sessions', description: 'Lista sessioni salvate', category: 'session' },
  { name: 'new', description: 'Crea nuova sessione', category: 'session' },
  { name: 'search', description: 'Cerca nei messaggi', category: 'session' },
  { name: 'save', description: 'Salva sessione corrente', category: 'session' },
  
  // AI commands
  { name: 'analyze', description: 'Analizza task con AI', category: 'ai' },
  { name: 'suggest', description: 'Suggerimenti AI per produttività', category: 'ai' },
  { name: 'summarize', description: 'Riassumi conversazione', category: 'ai' }
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
      case 'todoist': return '✅';
      case 'session': return '💾';
      case 'ai': return '🤖';
      default: return '•';
    }
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          {figures.arrowRight} Comandi disponibili ({filteredCommands.length})
        </Text>
      </Box>
      
      <Box flexDirection="column" height={8}>
        {filteredCommands.slice(0, 8).map((command: Command, index: number) => (
          <Box key={command.name} marginLeft={2}>
            <Text color={index === selectedIndex ? 'black' : getCategoryColor(command.category)}
                  backgroundColor={index === selectedIndex ? 'cyan' : undefined}>
              {index === selectedIndex ? figures.pointer : ' '} 
              {getCategoryIcon(command.category)} /{command.name} - {command.description}
            </Text>
          </Box>
        ))}
        
        {filteredCommands.length > 8 && (
          <Box marginLeft={2}>
            <Text color="gray">
              ... e altri {filteredCommands.length - 8} comandi
            </Text>
          </Box>
        )}
      </Box>
      
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          {figures.arrowUp}{figures.arrowDown} Naviga • Tab Autocompleta • Enter Seleziona • Esc Chiudi
        </Text>
      </Box>
    </Box>
  );
};