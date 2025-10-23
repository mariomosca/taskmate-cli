import React from 'react';
import { Box, Text, useInput } from 'ink';
import { SessionManager } from '../services/SessionManager.js';
import { llmService } from '../services/LLMService.js';
import { Message } from '../types/index.js';

interface ChatInterfaceProps {
  sessionManager: SessionManager;
  sessionContext?: string;
  onExit: () => void;
}

interface ChatState {
  messages: Message[];
  currentInput: string;
  isLoading: boolean;
  error?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  sessionManager,
  sessionContext,
  onExit
}) => {
  const [state, setState] = React.useState<ChatState>({
    messages: sessionManager.getCurrentSession()?.messages || [],
    currentInput: '',
    isLoading: false
  });

  const sendMessage = async (content: string) => {
    if (!content.trim() || state.isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      metadata: {}
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      currentInput: '',
      isLoading: true,
      error: undefined
    }));

    try {
      // Aggiungi il messaggio alla sessione
      await sessionManager.addMessage(userMessage);

      // Prepara i messaggi per l'LLM
      const llmMessages = state.messages.concat(userMessage).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      // Aggiungi il contesto della sessione se disponibile
      if (sessionContext && state.messages.length === 0) {
        llmMessages.unshift({
          role: 'system' as const,
          content: `Contesto della sessione precedente: ${sessionContext}`
        });
      }

      // Ottieni la risposta dall'LLM
      const response = await llmService.chat(llmMessages);

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        metadata: {
          usage: response.usage
        }
      };

      // Aggiungi la risposta alla sessione
      await sessionManager.addMessage(assistantMessage);

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      }));
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      onExit();
    } else if (key.return) {
      sendMessage(state.currentInput);
    } else if (key.backspace || key.delete) {
      setState(prev => ({
        ...prev,
        currentInput: prev.currentInput.slice(0, -1)
      }));
    } else if (input && !key.ctrl && !key.meta) {
      setState(prev => ({
        ...prev,
        currentInput: prev.currentInput + input
      }));
    }
  });

  const currentSession = sessionManager.getCurrentSession();

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      {/* Header */}
      <Box borderStyle="single" borderColor="cyan" padding={1} marginBottom={1}>
        <Text color="cyan" bold>
          💬 {currentSession?.name || 'Nuova Chat'} 
        </Text>
        <Text color="gray"> | Provider: {currentSession?.llmProvider || 'claude'}</Text>
        <Text color="gray"> | ESC per uscire</Text>
      </Box>

      {/* Context info */}
      {sessionContext && state.messages.length === 0 && (
        <Box borderStyle="single" borderColor="yellow" padding={1} marginBottom={1}>
          <Text color="yellow">📝 Sessione ripresa con contesto precedente</Text>
        </Box>
      )}

      {/* Messages */}
      <Box flexDirection="column" flexGrow={1} marginBottom={1}>
        {state.messages.map((message) => (
          <Box key={message.id} marginBottom={1}>
            <Text color={message.role === 'user' ? 'green' : 'blue'} bold>
              {message.role === 'user' ? '👤 Tu' : '🤖 Assistente'}:
            </Text>
            <Text> {message.content}</Text>
          </Box>
        ))}
        
        {state.isLoading && (
          <Box>
            <Text color="blue">🤖 Assistente: </Text>
            <Text color="gray">Sto pensando...</Text>
          </Box>
        )}
      </Box>

      {/* Error */}
      {state.error && (
        <Box borderStyle="single" borderColor="red" padding={1} marginBottom={1}>
          <Text color="red">❌ Errore: {state.error}</Text>
        </Box>
      )}

      {/* Input */}
      <Box borderStyle="single" borderColor="green" padding={1}>
        <Text color="green">💬 Messaggio: </Text>
        <Text>{state.currentInput}</Text>
        <Text color="gray">█</Text>
      </Box>
    </Box>
  );
};