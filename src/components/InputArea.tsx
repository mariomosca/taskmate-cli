// @ts-ignore
import React, { useState } from 'react';
// @ts-ignore
import { Box, Text, useInput } from 'ink';
// @ts-ignore
import TextInput from 'ink-text-input';
// @ts-ignore
import figures from 'figures';
import { CommandMenu } from './CommandMenu.js';

interface InputAreaProps {
  onSubmit: (input: string) => void;
  onSlashCommand: (command: string, args: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSubmit,
  onSlashCommand,
  placeholder = '',
  disabled = false
}) => {
  const [input, setInput] = useState('');
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  // Available commands (should match CommandMenu.tsx)
  const commands = [
    // General commands (most used first)
    { name: 'help', description: 'Show this help', category: 'general' },
    { name: 'clear', description: 'Clear the chat', category: 'general' },
    { name: 'status', description: 'Show system status', category: 'general' },
    { name: 'exit', description: 'Exit the application', category: 'general' },
    
    // Session commands (session management)
    { name: 'sessions', description: 'List saved sessions', category: 'session' },
    { name: 'new', description: 'Create new session', category: 'session' },
    { name: 'save', description: 'Save current session', category: 'session' },
    { name: 'load', description: 'Load existing session', category: 'session' },
    { name: 'search', description: 'Search in messages', category: 'session' },
    { name: 'delete-session', description: 'Delete session', category: 'session' }
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

  // Handle input changes
  const handleInputChange = (value: string) => {
    setInput(value);
    
    // Show command menu if starts with /
    if (value.startsWith('/')) {
      setShowCommandMenu(true);
    } else {
      setShowCommandMenu(false);
      setSelectedCommandIndex(0);
    }
  };

  // Handle Enter key press
  const handleInputSubmit = (value: string) => {
    if (showCommandMenu) {
      // If command menu is open, select the highlighted command
      const selectedCommand = getSelectedCommand();
      if (selectedCommand) {
        // Add space after command to position cursor at the end
        setInput('/' + selectedCommand + ' ');
        setShowCommandMenu(false);
        setSelectedCommandIndex(0);
        return;
      }
    }
    
    // Normal input submission
    if (value.trim()) {
      handleSubmit(value.trim());
      setInput('');
      setShowCommandMenu(false);
      setSelectedCommandIndex(0);
    }
  };

  // Handle special keys for command menu navigation
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
          // Add space after command to position cursor at the end
          setInput('/' + selectedCommand + ' ');
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
        const commandFilter = input.startsWith('/') ? input.slice(1) : '';
        const filteredCommands = commands.filter((cmd: any) => 
          cmd.name.toLowerCase().includes(commandFilter.toLowerCase()) ||
          cmd.description.toLowerCase().includes(commandFilter.toLowerCase())
        );
        setSelectedCommandIndex((prev: number) => Math.min(filteredCommands.length - 1, prev + 1));
        return;
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
          <TextInput
            value={input}
            placeholder=""
            onChange={handleInputChange}
            onSubmit={handleInputSubmit}
            showCursor={!disabled}
          />
        </Box>
        
        <Box marginTop={0}>
          <Text color="gray" dimColor>
            {figures.info} Press Enter to send, / for commands, Tab for autocomplete
          </Text>
        </Box>
      </Box>
    </Box>
  );
};