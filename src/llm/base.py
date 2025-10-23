"""
Base interface and abstract classes for LLM implementations.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, AsyncGenerator, Union
from enum import Enum
from pydantic import BaseModel, Field
from dataclasses import dataclass


class LLMProvider(str, Enum):
    """Supported LLM providers."""
    CLAUDE = "claude"
    GEMINI = "gemini"


class MessageRole(str, Enum):
    """Message roles in conversation."""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class Message(BaseModel):
    """Represents a message in the conversation."""
    role: MessageRole
    content: str
    metadata: Optional[Dict[str, Any]] = None


class LLMConfig(BaseModel):
    """Base configuration for LLM providers."""
    provider: LLMProvider
    api_key: str
    model: str
    max_tokens: int = Field(default=4000, ge=1, le=100000)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    timeout: int = Field(default=30, ge=1, le=300)


class LLMResponse(BaseModel):
    """Response from LLM provider."""
    content: str
    model: str
    provider: LLMProvider
    usage: Optional[Dict[str, int]] = None
    metadata: Optional[Dict[str, Any]] = None


class LLMError(Exception):
    """Base exception for LLM-related errors."""
    
    def __init__(self, message: str, provider: Optional[LLMProvider] = None, 
                 error_code: Optional[str] = None, original_error: Optional[Exception] = None):
        super().__init__(message)
        self.provider = provider
        self.error_code = error_code
        self.original_error = original_error


class RateLimitError(LLMError):
    """Raised when API rate limit is exceeded."""
    pass


class AuthenticationError(LLMError):
    """Raised when API authentication fails."""
    pass


class ModelNotFoundError(LLMError):
    """Raised when specified model is not available."""
    pass


class BaseLLM(ABC):
    """Abstract base class for LLM implementations."""
    
    def __init__(self, config: LLMConfig):
        self.config = config
        self.provider = config.provider
    
    @abstractmethod
    async def generate(self, messages: List[Message], **kwargs) -> LLMResponse:
        """
        Generate a response from the LLM.
        
        Args:
            messages: List of conversation messages
            **kwargs: Additional provider-specific parameters
            
        Returns:
            LLMResponse object with generated content
            
        Raises:
            LLMError: If generation fails
        """
        pass
    
    @abstractmethod
    async def generate_stream(self, messages: List[Message], **kwargs) -> AsyncGenerator[str, None]:
        """
        Generate a streaming response from the LLM.
        
        Args:
            messages: List of conversation messages
            **kwargs: Additional provider-specific parameters
            
        Yields:
            Chunks of generated text
            
        Raises:
            LLMError: If generation fails
        """
        pass
    
    @abstractmethod
    async def validate_connection(self) -> bool:
        """
        Validate that the LLM connection is working.
        
        Returns:
            True if connection is valid, False otherwise
        """
        pass
    
    @abstractmethod
    def get_available_models(self) -> List[str]:
        """
        Get list of available models for this provider.
        
        Returns:
            List of model names
        """
        pass
    
    def format_messages(self, messages: List[Message]) -> List[Dict[str, Any]]:
        """
        Format messages for the specific provider.
        Default implementation returns messages as-is.
        
        Args:
            messages: List of Message objects
            
        Returns:
            List of formatted message dictionaries
        """
        return [{"role": msg.role.value, "content": msg.content} for msg in messages]
    
    def create_system_message(self, content: str) -> Message:
        """Create a system message."""
        return Message(role=MessageRole.SYSTEM, content=content)
    
    def create_user_message(self, content: str) -> Message:
        """Create a user message."""
        return Message(role=MessageRole.USER, content=content)
    
    def create_assistant_message(self, content: str) -> Message:
        """Create an assistant message."""
        return Message(role=MessageRole.ASSISTANT, content=content)


class LLMFactory:
    """Factory class for creating LLM instances."""
    
    _providers: Dict[LLMProvider, type] = {}
    
    @classmethod
    def register_provider(cls, provider: LLMProvider, llm_class: type):
        """Register a new LLM provider implementation."""
        cls._providers[provider] = llm_class
    
    @classmethod
    def create_llm(cls, config: LLMConfig) -> BaseLLM:
        """
        Create an LLM instance based on the provider.
        
        Args:
            config: LLM configuration
            
        Returns:
            BaseLLM instance
            
        Raises:
            ValueError: If provider is not supported
        """
        if config.provider not in cls._providers:
            raise ValueError(f"Unsupported LLM provider: {config.provider}")
        
        llm_class = cls._providers[config.provider]
        return llm_class(config)
    
    @classmethod
    def get_supported_providers(cls) -> List[LLMProvider]:
        """Get list of supported providers."""
        return list(cls._providers.keys())


@dataclass
class ConversationContext:
    """Context for managing conversation state."""
    messages: List[Message]
    max_history: int = 50
    system_prompt: Optional[str] = None
    
    def add_message(self, message: Message):
        """Add a message to the conversation."""
        self.messages.append(message)
        
        # Keep only the most recent messages
        if len(self.messages) > self.max_history:
            # Always keep system message if it exists
            system_messages = [msg for msg in self.messages if msg.role == MessageRole.SYSTEM]
            other_messages = [msg for msg in self.messages if msg.role != MessageRole.SYSTEM]
            
            # Keep the most recent non-system messages
            recent_messages = other_messages[-(self.max_history - len(system_messages)):]
            self.messages = system_messages + recent_messages
    
    def get_messages(self) -> List[Message]:
        """Get all messages in the conversation."""
        return self.messages.copy()
    
    def clear(self):
        """Clear all messages except system prompt."""
        if self.system_prompt:
            self.messages = [Message(role=MessageRole.SYSTEM, content=self.system_prompt)]
        else:
            self.messages = []
    
    def set_system_prompt(self, prompt: str):
        """Set or update the system prompt."""
        self.system_prompt = prompt
        
        # Remove existing system messages
        self.messages = [msg for msg in self.messages if msg.role != MessageRole.SYSTEM]
        
        # Add new system message at the beginning
        if prompt:
            self.messages.insert(0, Message(role=MessageRole.SYSTEM, content=prompt))