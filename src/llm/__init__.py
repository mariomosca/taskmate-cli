"""LLM (Large Language Model) integration module.
"""

# Base classes and interfaces
from .base import (
    BaseLLM, LLMConfig, LLMProvider, Message, LLMResponse,
    LLMError, RateLimitError, AuthenticationError, ModelNotFoundError,
    MessageRole, LLMFactory, ConversationContext
)

# Provider implementations
from .claude import ClaudeLLM, ClaudeConfig, create_claude_config, get_claude_model_info
from .gemini import GeminiLLM, GeminiConfig, create_gemini_config, get_gemini_model_info

# Manager and utilities
from .manager import (
    LLMManager, create_llm_manager_from_config, create_claude_manager,
    create_gemini_manager, create_multi_provider_manager
)

__all__ = [
    # Base classes
    "BaseLLM",
    "LLMConfig", 
    "LLMProvider",
    "Message",
    "LLMResponse",
    "MessageRole",
    "LLMFactory",
    "ConversationContext",
    
    # Exceptions
    "LLMError",
    "RateLimitError", 
    "AuthenticationError",
    "ModelNotFoundError",
    
    # Claude
    "ClaudeLLM",
    "ClaudeConfig",
    "create_claude_config",
    "get_claude_model_info",
    
    # Gemini
    "GeminiLLM", 
    "GeminiConfig",
    "create_gemini_config",
    "get_gemini_model_info",
    
    # Manager
    "LLMManager",
    "create_llm_manager_from_config",
    "create_claude_manager",
    "create_gemini_manager", 
    "create_multi_provider_manager"
]