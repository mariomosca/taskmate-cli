"""
Gemini (Google) LLM implementation.
"""

import asyncio
from typing import List, Dict, Any, AsyncGenerator, Optional
import httpx
from .base import (
    BaseLLM, LLMConfig, LLMProvider, Message, LLMResponse, 
    LLMError, RateLimitError, AuthenticationError, ModelNotFoundError,
    MessageRole
)


class GeminiConfig(LLMConfig):
    """Configuration specific to Gemini."""
    provider: LLMProvider = LLMProvider.GEMINI
    model: str = "gemini-1.5-pro"
    max_tokens: int = 4000
    
    class Config:
        extra = "ignore"


class GeminiLLM(BaseLLM):
    """Gemini LLM implementation using Google AI API."""
    
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
    
    AVAILABLE_MODELS = [
        "gemini-1.5-pro",
        "gemini-1.5-flash", 
        "gemini-1.0-pro",
        "gemini-1.0-pro-vision"
    ]
    
    def __init__(self, config: GeminiConfig):
        super().__init__(config)
        self.api_key = config.api_key
    
    async def generate(self, messages: List[Message], **kwargs) -> LLMResponse:
        """Generate response using Gemini API."""
        try:
            formatted_messages = self._format_messages_for_gemini(messages)
            
            payload = {
                "contents": formatted_messages,
                "generationConfig": {
                    "maxOutputTokens": kwargs.get("max_tokens", self.config.max_tokens),
                    "temperature": kwargs.get("temperature", self.config.temperature),
                    "topP": kwargs.get("top_p", 0.8),
                    "topK": kwargs.get("top_k", 40)
                }
            }
            
            # Add system instruction if present
            system_instruction = self._extract_system_instruction(messages)
            if system_instruction:
                payload["systemInstruction"] = {
                    "parts": [{"text": system_instruction}]
                }
            
            url = f"{self.BASE_URL}/models/{self.config.model}:generateContent"
            params = {"key": self.api_key}
            
            async with httpx.AsyncClient(timeout=self.config.timeout) as client:
                response = await client.post(
                    url,
                    params=params,
                    json=payload
                )
                
                await self._handle_response_errors(response)
                result = response.json()
                
                if "candidates" not in result or not result["candidates"]:
                    raise LLMError("No response generated", provider=LLMProvider.GEMINI)
                
                candidate = result["candidates"][0]
                content = candidate["content"]["parts"][0]["text"]
                
                usage = None
                if "usageMetadata" in result:
                    usage = {
                        "prompt_tokens": result["usageMetadata"].get("promptTokenCount", 0),
                        "completion_tokens": result["usageMetadata"].get("candidatesTokenCount", 0),
                        "total_tokens": result["usageMetadata"].get("totalTokenCount", 0)
                    }
                
                return LLMResponse(
                    content=content,
                    model=self.config.model,
                    provider=LLMProvider.GEMINI,
                    usage=usage,
                    metadata={
                        "finish_reason": candidate.get("finishReason"),
                        "safety_ratings": candidate.get("safetyRatings", [])
                    }
                )
                
        except httpx.TimeoutException:
            raise LLMError("Request timeout", provider=LLMProvider.GEMINI)
        except httpx.RequestError as e:
            raise LLMError(f"Request failed: {str(e)}", provider=LLMProvider.GEMINI, original_error=e)
        except Exception as e:
            if isinstance(e, LLMError):
                raise
            raise LLMError(f"Unexpected error: {str(e)}", provider=LLMProvider.GEMINI, original_error=e)
    
    async def generate_stream(self, messages: List[Message], **kwargs) -> AsyncGenerator[str, None]:
        """Generate streaming response using Gemini API."""
        try:
            formatted_messages = self._format_messages_for_gemini(messages)
            
            payload = {
                "contents": formatted_messages,
                "generationConfig": {
                    "maxOutputTokens": kwargs.get("max_tokens", self.config.max_tokens),
                    "temperature": kwargs.get("temperature", self.config.temperature),
                    "topP": kwargs.get("top_p", 0.8),
                    "topK": kwargs.get("top_k", 40)
                }
            }
            
            # Add system instruction if present
            system_instruction = self._extract_system_instruction(messages)
            if system_instruction:
                payload["systemInstruction"] = {
                    "parts": [{"text": system_instruction}]
                }
            
            url = f"{self.BASE_URL}/models/{self.config.model}:streamGenerateContent"
            params = {"key": self.api_key}
            
            async with httpx.AsyncClient(timeout=self.config.timeout) as client:
                async with client.stream(
                    "POST",
                    url,
                    params=params,
                    json=payload
                ) as response:
                    await self._handle_response_errors(response)
                    
                    async for line in response.aiter_lines():
                        if line.strip():
                            try:
                                import json
                                # Remove any potential prefix
                                if line.startswith("data: "):
                                    line = line[6:]
                                
                                chunk = json.loads(line)
                                
                                if "candidates" in chunk and chunk["candidates"]:
                                    candidate = chunk["candidates"][0]
                                    if "content" in candidate and "parts" in candidate["content"]:
                                        for part in candidate["content"]["parts"]:
                                            if "text" in part:
                                                yield part["text"]
                                                
                            except json.JSONDecodeError:
                                continue
                                
        except httpx.TimeoutException:
            raise LLMError("Request timeout", provider=LLMProvider.GEMINI)
        except httpx.RequestError as e:
            raise LLMError(f"Request failed: {str(e)}", provider=LLMProvider.GEMINI, original_error=e)
        except Exception as e:
            if isinstance(e, LLMError):
                raise
            raise LLMError(f"Unexpected error: {str(e)}", provider=LLMProvider.GEMINI, original_error=e)
    
    async def validate_connection(self) -> bool:
        """Validate Gemini API connection."""
        try:
            test_messages = [Message(role=MessageRole.USER, content="Hello")]
            await self.generate(test_messages, max_tokens=10)
            return True
        except Exception:
            return False
    
    def get_available_models(self) -> List[str]:
        """Get available Gemini models."""
        return self.AVAILABLE_MODELS.copy()
    
    def _format_messages_for_gemini(self, messages: List[Message]) -> List[Dict[str, Any]]:
        """Format messages for Gemini API."""
        formatted = []
        
        for message in messages:
            if message.role == MessageRole.SYSTEM:
                # System messages are handled separately in Gemini
                continue
            elif message.role == MessageRole.USER:
                role = "user"
            elif message.role == MessageRole.ASSISTANT:
                role = "model"  # Gemini uses "model" instead of "assistant"
            else:
                continue
            
            formatted.append({
                "role": role,
                "parts": [{"text": message.content}]
            })
        
        return formatted
    
    def _extract_system_instruction(self, messages: List[Message]) -> Optional[str]:
        """Extract system instruction for Gemini API."""
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
            error_code = error_data.get("error", {}).get("code", "unknown")
        except:
            error_message = f"HTTP {response.status_code}: {response.text}"
            error_code = str(response.status_code)
        
        if response.status_code == 401 or response.status_code == 403:
            raise AuthenticationError(
                f"Authentication failed: {error_message}",
                provider=LLMProvider.GEMINI,
                error_code=error_code
            )
        elif response.status_code == 429:
            raise RateLimitError(
                f"Rate limit exceeded: {error_message}",
                provider=LLMProvider.GEMINI,
                error_code=error_code
            )
        elif response.status_code == 404:
            raise ModelNotFoundError(
                f"Model not found: {error_message}",
                provider=LLMProvider.GEMINI,
                error_code=error_code
            )
        else:
            raise LLMError(
                f"API error: {error_message}",
                provider=LLMProvider.GEMINI,
                error_code=error_code
            )


# Utility functions for Gemini-specific features
def create_gemini_config(api_key: str, model: str = "gemini-1.5-pro", **kwargs) -> GeminiConfig:
    """Create a Gemini configuration with sensible defaults."""
    return GeminiConfig(
        api_key=api_key,
        model=model,
        **kwargs
    )


def get_gemini_model_info(model: str) -> Dict[str, Any]:
    """Get information about a Gemini model."""
    model_info = {
        "gemini-1.5-pro": {
            "name": "Gemini 1.5 Pro",
            "context_window": 2000000,
            "max_output": 8192,
            "description": "Most capable model with large context window"
        },
        "gemini-1.5-flash": {
            "name": "Gemini 1.5 Flash",
            "context_window": 1000000,
            "max_output": 8192,
            "description": "Fast and efficient model"
        },
        "gemini-1.0-pro": {
            "name": "Gemini 1.0 Pro",
            "context_window": 32000,
            "max_output": 2048,
            "description": "Previous generation text model"
        },
        "gemini-1.0-pro-vision": {
            "name": "Gemini 1.0 Pro Vision",
            "context_window": 16000,
            "max_output": 2048,
            "description": "Multimodal model with vision capabilities"
        }
    }
    
    return model_info.get(model, {
        "name": model,
        "context_window": "Unknown",
        "max_output": "Unknown",
        "description": "Model information not available"
    })


def get_safety_settings() -> List[Dict[str, Any]]:
    """Get default safety settings for Gemini."""
    return [
        {
            "category": "HARM_CATEGORY_HARASSMENT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            "category": "HARM_CATEGORY_HATE_SPEECH", 
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        }
    ]