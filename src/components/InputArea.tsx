// @ts-ignore
import React, { useState } from 'react';
// @ts-ignore
import { Box, Text, useInput } from 'ink';
// @ts-ignore
import figures from 'figures';
import { CommandMenu } from './CommandMenu';

interface InputAreaProps {
  onSubmit: (input: string) => void;
  onSlashCommand: (command: string, args: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSubmit,
  onSlashCommand,
  placeholder = 'Scrivi un messaggio o usa / per i comandi...',
  disabled = false
}) => {
  const [input, setInput] = useState('');
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  // Available commands (should match CommandMenu.tsx)
  const commands = [
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

  // Get the currently selected command for tab completion
  const getSelectedCommand = () => {
    const commandFilter = input.startsWith('/') ? input.slice(1) : '';
    const filteredCommands = commands.filter((cmd: any) => 
      cmd.name.toLowerCase().includes(commandFilter.toLowerCase()) ||
      cmd.description.toLowerCase().includes(commandFilter.toLowerCase())
    );
    
    if (filteredCommands.length > 0 && selectedCommandIndex >= 0 && selectedCommandIndex < filteredCommands.length) {
      return filteredCommands[selectedCommandIndex].name;
    }
    return null;
  };

  useInput((inputChar: string, key: any) => {
    if (disabled) return;

    // Handle command menu navigation
    if (showCommandMenu) {
      if (key.escape) {
        setShowCommandMenu(false);
        setSelectedCommandIndex(0);
        return;
      }
      
      if (key.tab) {
        // Tab autocompletion
        const selectedCommand = getSelectedCommand();
        if (selectedCommand) {
          setInput('/' + selectedCommand);
          setShowCommandMenu(false);
          setSelectedCommandIndex(0);
        }
        return;
      }
      
      if (key.upArrow) {
        setSelectedCommandIndex((prev: number) => Math.max(0, prev - 1));
        return;
      }
      
      if (key.downArrow) {
        setSelectedCommandIndex((prev: number) => prev + 1); // Will be clamped by CommandMenu
        return;
      }
    }

    if (key.return) {
      // If command menu is open, select the highlighted command
      if (showCommandMenu) {
        const selectedCommand = getSelectedCommand();
        if (selectedCommand) {
          setInput('/' + selectedCommand);
          setShowCommandMenu(false);
          setSelectedCommandIndex(0);
        }
        return;
      }
      
      // Normal input submission
      if (input.trim()) {
        handleSubmit(input.trim());
        setInput('');
        setShowCommandMenu(false);
        setSelectedCommandIndex(0);
      }
      return;
    }

    if (key.backspace || key.delete) {
      const newInput = input.slice(0, -1);
      setInput(newInput);
      
      // Hide command menu if no longer starts with /
      if (!newInput.startsWith('/')) {
        setShowCommandMenu(false);
        setSelectedCommandIndex(0);
      }
      return;
    }

    if (inputChar && !key.ctrl && !key.meta) {
      const newInput = input + inputChar;
      setInput(newInput);
      
      // Show command menu if starts with /
      if (newInput.startsWith('/')) {
        setShowCommandMenu(true);
      } else if (!newInput.startsWith('/') && newInput.length > 0) {
        setShowCommandMenu(false);
        setSelectedCommandIndex(0);
      }
    }
  });

  const handleSubmit = (value: string) => {
    if (value.startsWith('/')) {
      // Parse slash command
      const parts = value.slice(1).split(' ');
      const command = parts[0];
      const args = parts.slice(1);
      onSlashCommand(command, args);
    } else {
      onSubmit(value);
    }
  };

  const displayInput = input + (!disabled ? '│' : '');

  const commandFilter = input.startsWith('/') ? input.slice(1) : '';

  return (
    <Box flexDirection="column">
      {/* Command Menu */}
      <CommandMenu 
        isVisible={showCommandMenu}
        selectedIndex={selectedCommandIndex}
        filter={commandFilter}
      />
      
      {/* Input Area */}
      <Box 
        flexDirection="column" 
        borderStyle="round" 
        borderColor={disabled ? "gray" : "cyan"}
        paddingX={1}
        marginTop={1}
      >
        <Box flexDirection="row" alignItems="center">
          <Text color={disabled ? "gray" : "cyan"}>
            {figures.arrowRight} 
          </Text>
          <Text color={disabled ? "gray" : "white"}>
            {displayInput || (
              <Text color="gray" dimColor>
                {placeholder}
              </Text>
            )}
          </Text>
        </Box>
        
        <Box marginTop={0}>
          <Text color="gray" dimColor>
            {figures.info} Premi Enter per inviare, / per comandi, Tab per autocompletamento
          </Text>
        </Box>
      </Box>
    </Box>
  );
};