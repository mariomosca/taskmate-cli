"""
Claude (Anthropic) LLM implementation.
"""

import asyncio
from typing import List, Dict, Any, AsyncGenerator, Optional
import httpx
from .base import (
    BaseLLM, LLMConfig, LLMProvider, Message, LLMResponse, 
    LLMError, RateLimitError, AuthenticationError, ModelNotFoundError,
    MessageRole
)


class ClaudeConfig(LLMConfig):
    """Configuration specific to Claude."""
    provider: LLMProvider = LLMProvider.CLAUDE
    model: str = "claude-3-sonnet-20240229"
    max_tokens: int = 4000
    
    class Config:
        extra = "ignore"


class ClaudeLLM(BaseLLM):
    """Claude LLM implementation using Anthropic API."""
    
    BASE_URL = "https://api.anthropic.com/v1"
    
    AVAILABLE_MODELS = [
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229", 
        "claude-3-haiku-20240307",
        "claude-2.1",
        "claude-2.0",
        "claude-instant-1.2"
    ]
    
    def __init__(self, config: ClaudeConfig):
        super().__init__(config)
        self.headers = {
            "x-api-key": config.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
    
    async def generate(self, messages: List[Message], **kwargs) -> LLMResponse:
        """Generate response using Claude API."""
        try:
            formatted_messages = self._format_messages_for_claude(messages)
            
            payload = {
                "model": self.config.model,
                "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
                "temperature": kwargs.get("temperature", self.config.temperature),
                "messages": formatted_messages
            }
            
            # Add system message if present
            system_message = self._extract_system_message(messages)
            if system_message:
                payload["system"] = system_message
            
            async with httpx.AsyncClient(timeout=self.config.timeout) as client:
                response = await client.post(
                    f"{self.BASE_URL}/messages",
                    headers=self.headers,
                    json=payload
                )
                
                await self._handle_response_errors(response)
                result = response.json()
                
                return LLMResponse(
                    content=result["content"][0]["text"],
                    model=result["model"],
                    provider=LLMProvider.CLAUDE,
                    usage=result.get("usage"),
                    metadata={"stop_reason": result.get("stop_reason")}
                )
                
        except httpx.TimeoutException:
            raise LLMError("Request timeout", provider=LLMProvider.CLAUDE)
        except httpx.RequestError as e:
            raise LLMError(f"Request failed: {str(e)}", provider=LLMProvider.CLAUDE, original_error=e)
        except Exception as e:
            if isinstance(e, LLMError):
                raise
            raise LLMError(f"Unexpected error: {str(e)}", provider=LLMProvider.CLAUDE, original_error=e)
    
    async def generate_stream(self, messages: List[Message], **kwargs) -> AsyncGenerator[str, None]:
        """Generate streaming response using Claude API."""
        try:
            formatted_messages = self._format_messages_for_claude(messages)
            
            payload = {
                "model": self.config.model,
                "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
                "temperature": kwargs.get("temperature", self.config.temperature),
                "messages": formatted_messages,
                "stream": True
            }
            
            # Add system message if present
            system_message = self._extract_system_message(messages)
            if system_message:
                payload["system"] = system_message
            
            async with httpx.AsyncClient(timeout=self.config.timeout) as client:
                async with client.stream(
                    "POST",
                    f"{self.BASE_URL}/messages",
                    headers=self.headers,
                    json=payload
                ) as response:
                    await self._handle_response_errors(response)
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]  # Remove "data: " prefix
                            
                            if data == "[DONE]":
                                break
                            
                            try:
                                import json
                                event = json.loads(data)
                                
                                if event["type"] == "content_block_delta":
                                    if "text" in event["delta"]:
                                        yield event["delta"]["text"]
                                        
                            except json.JSONDecodeError:
                                continue
                                
        except httpx.TimeoutException:
            raise LLMError("Request timeout", provider=LLMProvider.CLAUDE)
        except httpx.RequestError as e:
            raise LLMError(f"Request failed: {str(e)}", provider=LLMProvider.CLAUDE, original_error=e)
        except Exception as e:
            if isinstance(e, LLMError):
                raise
            raise LLMError(f"Unexpected error: {str(e)}", provider=LLMProvider.CLAUDE, original_error=e)
    
    async def validate_connection(self) -> bool:
        """Validate Claude API connection."""
        try:
            test_messages = [Message(role=MessageRole.USER, content="Hello")]
            await self.generate(test_messages, max_tokens=10)
            return True
        except Exception:
            return False
    
    def get_available_models(self) -> List[str]:
        """Get available Claude models."""
        return self.AVAILABLE_MODELS.copy()
    
    def _format_messages_for_claude(self, messages: List[Message]) -> List[Dict[str, Any]]:
        """Format messages for Claude API (excluding system messages)."""
        formatted = []
        
        for message in messages:
            if message.role != MessageRole.SYSTEM:
                formatted.append({
                    "role": message.role.value,
                    "content": message.content
                })
        
        return formatted
    
    def _extract_system_message(self, messages: List[Message]) -> Optional[str]:
        """Extract system message content for Claude API."""
        for message in messages:
            if message.role == MessageRole.SYSTEM:
                return message.content
        return None
    
    async def _handle_response_errors(self, response: httpx.Response):
        """Handle HTTP response errors."""
        if response.status_code == 200:
            return
        
        try:
            error_data = response.json()
            error_message = error_data.get("error", {}).get("message", "Unknown error")
            error_type = error_data.get("error", {}).get("type", "unknown")
        except:
            error_message = f"HTTP {response.status_code}: {response.text}"
            error_type = "http_error"
        
        if response.status_code == 401:
            raise AuthenticationError(
                f"Authentication failed: {error_message}",
                provider=LLMProvider.CLAUDE,
                error_code=error_type
            )
        elif response.status_code == 429:
            raise RateLimitError(
                f"Rate limit exceeded: {error_message}",
                provider=LLMProvider.CLAUDE,
                error_code=error_type
            )
        elif response.status_code == 404 and "model" in error_message.lower():
            raise ModelNotFoundError(
                f"Model not found: {error_message}",
                provider=LLMProvider.CLAUDE,
                error_code=error_type
            )
        else:
            raise LLMError(
                f"API error: {error_message}",
                provider=LLMProvider.CLAUDE,
                error_code=error_type
            )


# Utility functions for Claude-specific features
def create_claude_config(api_key: str, model: str = "claude-3-sonnet-20240229", **kwargs) -> ClaudeConfig:
    """Create a Claude configuration with sensible defaults."""
    return ClaudeConfig(
        api_key=api_key,
        model=model,
        **kwargs
    )


def get_claude_model_info(model: str) -> Dict[str, Any]:
    """Get information about a Claude model."""
    model_info = {
        "claude-3-opus-20240229": {
            "name": "Claude 3 Opus",
            "context_window": 200000,
            "max_output": 4096,
            "description": "Most capable model, best for complex tasks"
        },
        "claude-3-sonnet-20240229": {
            "name": "Claude 3 Sonnet", 
            "context_window": 200000,
            "max_output": 4096,
            "description": "Balanced performance and speed"
        },
        "claude-3-haiku-20240307": {
            "name": "Claude 3 Haiku",
            "context_window": 200000,
            "max_output": 4096,
            "description": "Fastest model, good for simple tasks"
        },
        "claude-2.1": {
            "name": "Claude 2.1",
            "context_window": 200000,
            "max_output": 4096,
            "description": "Previous generation, reliable"
        },
        "claude-2.0": {
            "name": "Claude 2.0",
            "context_window": 100000,
            "max_output": 4096,
            "description": "Previous generation"
        },
        "claude-instant-1.2": {
            "name": "Claude Instant",
            "context_window": 100000,
            "max_output": 4096,
            "description": "Fast and cost-effective"
        }
    }
    
    return model_info.get(model, {
        "name": model,
        "context_window": "Unknown",
        "max_output": "Unknown", 
        "description": "Model information not available"
    })