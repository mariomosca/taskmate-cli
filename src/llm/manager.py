"""
LLM Manager for handling multiple providers and conversation management.
"""

import asyncio
from typing import Dict, List, Optional, Any, Union
from .base import (
    BaseLLM, LLMConfig, LLMProvider, Message, LLMResponse, 
    LLMFactory, ConversationContext, MessageRole, LLMError
)
from .claude import ClaudeLLM, ClaudeConfig
from .gemini import GeminiLLM, GeminiConfig


class LLMManager:
    """Manager for handling multiple LLM providers and conversations."""
    
    def __init__(self):
        self._llms: Dict[LLMProvider, BaseLLM] = {}
        self._default_provider: Optional[LLMProvider] = None
        self._conversation_context = ConversationContext(messages=[])
        
        # Register providers
        self._register_providers()
    
    def _register_providers(self):
        """Register all available LLM providers."""
        LLMFactory.register_provider(LLMProvider.CLAUDE, ClaudeLLM)
        LLMFactory.register_provider(LLMProvider.GEMINI, GeminiLLM)
    
    def add_provider(self, config: LLMConfig) -> None:
        """Add an LLM provider."""
        llm = LLMFactory.create_llm(config)
        self._llms[config.provider] = llm
        
        # Set as default if it's the first provider
        if self._default_provider is None:
            self._default_provider = config.provider
    
    def set_default_provider(self, provider: LLMProvider) -> None:
        """Set the default LLM provider."""
        if provider not in self._llms:
            raise ValueError(f"Provider {provider} not configured")
        self._default_provider = provider
    
    def get_provider(self, provider: Optional[LLMProvider] = None) -> BaseLLM:
        """Get an LLM provider instance."""
        target_provider = provider or self._default_provider
        
        if target_provider is None:
            raise ValueError("No default provider set")
        
        if target_provider not in self._llms:
            raise ValueError(f"Provider {target_provider} not configured")
        
        return self._llms[target_provider]
    
    def get_available_providers(self) -> List[LLMProvider]:
        """Get list of configured providers."""
        return list(self._llms.keys())
    
    def is_provider_available(self, provider: LLMProvider) -> bool:
        """Check if a provider is configured."""
        return provider in self._llms
    
    async def validate_providers(self) -> Dict[LLMProvider, bool]:
        """Validate all configured providers."""
        results = {}
        
        for provider, llm in self._llms.items():
            try:
                results[provider] = await llm.validate_connection()
            except Exception:
                results[provider] = False
        
        return results
    
    # Conversation management
    def set_system_prompt(self, prompt: str) -> None:
        """Set the system prompt for conversations."""
        self._conversation_context.set_system_prompt(prompt)
    
    def add_message(self, role: MessageRole, content: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Add a message to the conversation."""
        message = Message(role=role, content=content, metadata=metadata)
        self._conversation_context.add_message(message)
    
    def add_user_message(self, content: str) -> None:
        """Add a user message to the conversation."""
        self.add_message(MessageRole.USER, content)
    
    def add_assistant_message(self, content: str) -> None:
        """Add an assistant message to the conversation."""
        self.add_message(MessageRole.ASSISTANT, content)
    
    def get_conversation_history(self) -> List[Message]:
        """Get the current conversation history."""
        return self._conversation_context.get_messages()
    
    def clear_conversation(self) -> None:
        """Clear the conversation history."""
        self._conversation_context.clear()
    
    def set_max_history(self, max_history: int) -> None:
        """Set the maximum number of messages to keep in history."""
        self._conversation_context.max_history = max_history
    
    # Generation methods
    async def generate(self, 
                      content: str, 
                      provider: Optional[LLMProvider] = None,
                      add_to_history: bool = True,
                      **kwargs) -> LLMResponse:
        """
        Generate a response from the LLM.
        
        Args:
            content: User message content
            provider: LLM provider to use (defaults to default provider)
            add_to_history: Whether to add messages to conversation history
            **kwargs: Additional generation parameters
            
        Returns:
            LLMResponse object
        """
        llm = self.get_provider(provider)
        
        # Add user message to conversation
        if add_to_history:
            self.add_user_message(content)
        
        # Get current conversation messages
        messages = self._conversation_context.get_messages()
        
        # If not adding to history, create temporary messages
        if not add_to_history:
            messages = messages + [Message(role=MessageRole.USER, content=content)]
        
        # Generate response
        response = await llm.generate(messages, **kwargs)
        
        # Add assistant response to conversation
        if add_to_history:
            self.add_assistant_message(response.content)
        
        return response
    
    async def generate_stream(self, 
                             content: str,
                             provider: Optional[LLMProvider] = None,
                             add_to_history: bool = True,
                             **kwargs):
        """
        Generate a streaming response from the LLM.
        
        Args:
            content: User message content
            provider: LLM provider to use (defaults to default provider)
            add_to_history: Whether to add messages to conversation history
            **kwargs: Additional generation parameters
            
        Yields:
            Chunks of generated text
        """
        llm = self.get_provider(provider)
        
        # Add user message to conversation
        if add_to_history:
            self.add_user_message(content)
        
        # Get current conversation messages
        messages = self._conversation_context.get_messages()
        
        # If not adding to history, create temporary messages
        if not add_to_history:
            messages = messages + [Message(role=MessageRole.USER, content=content)]
        
        # Generate streaming response
        full_response = ""
        async for chunk in llm.generate_stream(messages, **kwargs):
            full_response += chunk
            yield chunk
        
        # Add complete assistant response to conversation
        if add_to_history:
            self.add_assistant_message(full_response)
    
    async def chat(self, 
                   content: str,
                   provider: Optional[LLMProvider] = None,
                   **kwargs) -> str:
        """
        Simple chat interface that returns just the response content.
        
        Args:
            content: User message
            provider: LLM provider to use
            **kwargs: Additional generation parameters
            
        Returns:
            Response content as string
        """
        response = await self.generate(content, provider=provider, **kwargs)
        return response.content
    
    # Utility methods
    def get_model_info(self, provider: Optional[LLMProvider] = None) -> Dict[str, Any]:
        """Get information about the current model."""
        llm = self.get_provider(provider)
        
        return {
            "provider": llm.provider.value,
            "model": llm.config.model,
            "max_tokens": llm.config.max_tokens,
            "temperature": llm.config.temperature,
            "available_models": llm.get_available_models()
        }
    
    def get_conversation_stats(self) -> Dict[str, Any]:
        """Get statistics about the current conversation."""
        messages = self._conversation_context.get_messages()
        
        stats = {
            "total_messages": len(messages),
            "user_messages": len([m for m in messages if m.role == MessageRole.USER]),
            "assistant_messages": len([m for m in messages if m.role == MessageRole.ASSISTANT]),
            "system_messages": len([m for m in messages if m.role == MessageRole.SYSTEM]),
            "total_characters": sum(len(m.content) for m in messages),
            "max_history": self._conversation_context.max_history
        }
        
        return stats
    
    def export_conversation(self) -> List[Dict[str, Any]]:
        """Export conversation history as a list of dictionaries."""
        messages = self._conversation_context.get_messages()
        return [
            {
                "role": msg.role.value,
                "content": msg.content,
                "metadata": msg.metadata
            }
            for msg in messages
        ]
    
    def import_conversation(self, messages: List[Dict[str, Any]]) -> None:
        """Import conversation history from a list of dictionaries."""
        self._conversation_context.messages = []
        
        for msg_data in messages:
            role = MessageRole(msg_data["role"])
            content = msg_data["content"]
            metadata = msg_data.get("metadata")
            
            message = Message(role=role, content=content, metadata=metadata)
            self._conversation_context.add_message(message)


# Convenience functions for creating configurations
def create_llm_manager_from_config(configs: List[LLMConfig], 
                                  default_provider: Optional[LLMProvider] = None) -> LLMManager:
    """Create an LLM manager from a list of configurations."""
    manager = LLMManager()
    
    for config in configs:
        manager.add_provider(config)
    
    if default_provider:
        manager.set_default_provider(default_provider)
    
    return manager


def create_claude_manager(api_key: str, model: str = "claude-3-sonnet-20240229", **kwargs) -> LLMManager:
    """Create an LLM manager with only Claude configured."""
    config = ClaudeConfig(api_key=api_key, model=model, **kwargs)
    manager = LLMManager()
    manager.add_provider(config)
    return manager


def create_gemini_manager(api_key: str, model: str = "gemini-1.5-pro", **kwargs) -> LLMManager:
    """Create an LLM manager with only Gemini configured."""
    config = GeminiConfig(api_key=api_key, model=model, **kwargs)
    manager = LLMManager()
    manager.add_provider(config)
    return manager


def create_multi_provider_manager(claude_api_key: Optional[str] = None,
                                 gemini_api_key: Optional[str] = None,
                                 default_provider: Optional[LLMProvider] = None,
                                 **kwargs) -> LLMManager:
    """Create an LLM manager with multiple providers."""
    manager = LLMManager()
    
    if claude_api_key:
        claude_config = ClaudeConfig(api_key=claude_api_key, **kwargs)
        manager.add_provider(claude_config)
    
    if gemini_api_key:
        gemini_config = GeminiConfig(api_key=gemini_api_key, **kwargs)
        manager.add_provider(gemini_config)
    
    if default_provider:
        manager.set_default_provider(default_provider)
    
    return manager