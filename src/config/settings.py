"""
Configuration management for Todoist AI CLI.
Uses Pydantic Settings for type-safe configuration with environment variable support.
"""

import os
from pathlib import Path
from typing import Optional, Literal
from pydantic import Field, validator
from pydantic_settings import BaseSettings


class TodoistConfig(BaseSettings):
    """Todoist API configuration."""
    
    api_key: Optional[str] = Field(default=None, description="Todoist API key")
    base_url: str = Field(
        default="https://api.todoist.com/rest/v2",
        env="TODOIST_BASE_URL",
        description="Todoist API base URL"
    )
    timeout: int = Field(
        default=30,
        env="TODOIST_TIMEOUT",
        description="Request timeout in seconds"
    )
    
    class Config:
        env_prefix = "TODOIST_"
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


class ClaudeConfig(BaseSettings):
    """Claude/Anthropic API configuration."""
    
    api_key: Optional[str] = Field(default=None, description="Anthropic API key")
    model: str = Field(
        default="claude-3-sonnet-20240229",
        env="CLAUDE_MODEL",
        description="Claude model to use"
    )
    max_tokens: int = Field(
        default=4096,
        env="CLAUDE_MAX_TOKENS",
        description="Maximum tokens for Claude responses"
    )
    temperature: float = Field(
        default=0.7,
        env="CLAUDE_TEMPERATURE",
        description="Temperature for Claude responses"
    )
    
    class Config:
        env_prefix = "CLAUDE_"
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


class GeminiConfig(BaseSettings):
    """Google Gemini API configuration."""
    
    api_key: Optional[str] = Field(default=None, description="Google API key")
    model: str = Field(
        default="gemini-pro",
        env="GEMINI_MODEL",
        description="Gemini model to use"
    )
    max_tokens: int = Field(
        default=4096,
        env="GEMINI_MAX_TOKENS",
        description="Maximum tokens for Gemini responses"
    )
    temperature: float = Field(
        default=0.7,
        env="GEMINI_TEMPERATURE",
        description="Temperature for Gemini responses"
    )
    
    class Config:
        env_prefix = "GEMINI_"
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


class DatabaseConfig(BaseSettings):
    """Database configuration for session persistence."""
    
    url: str = Field(
        default="sqlite:///data/sessions.db",
        env="DATABASE_URL",
        description="Database URL"
    )
    echo: bool = Field(
        default=False,
        env="DATABASE_ECHO",
        description="Enable SQLAlchemy echo mode"
    )
    pool_size: int = Field(
        default=5,
        env="DATABASE_POOL_SIZE",
        description="Database connection pool size"
    )
    
    class Config:
        env_prefix = "DATABASE_"
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


class UIConfig(BaseSettings):
    """UI and CLI configuration."""
    
    theme: str = Field(
        default="dark",
        env="UI_THEME",
        description="UI theme (dark/light)"
    )
    show_splash: bool = Field(
        default=True,
        env="UI_SHOW_SPLASH",
        description="Show splash screen on startup"
    )
    auto_complete: bool = Field(
        default=True,
        env="UI_AUTO_COMPLETE",
        description="Enable auto-completion"
    )
    history_size: int = Field(
        default=1000,
        env="UI_HISTORY_SIZE",
        description="Command history size"
    )
    
    class Config:
        env_prefix = "UI_"
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


class AppConfig(BaseSettings):
    """Main application configuration."""
    
    # App metadata
    app_name: str = Field(default="Todoist AI CLI", description="Application name")
    version: str = Field(default="1.0.0", description="Application version")
    debug: bool = Field(default=False, env="DEBUG", description="Debug mode")
    
    # Default LLM provider
    default_llm: Literal["claude", "gemini"] = Field(
        default="claude",
        env="DEFAULT_LLM",
        description="Default LLM provider"
    )
    
    # Session settings
    session_autosave: bool = Field(
        default=True,
        env="SESSION_AUTOSAVE",
        description="Auto-save sessions"
    )
    session_timeout: int = Field(
        default=3600,
        env="SESSION_TIMEOUT",
        description="Session timeout in seconds"
    )
    
    # File paths
    data_dir: Path = Field(
        default=Path("data"),
        env="DATA_DIR",
        description="Data directory path"
    )
    log_dir: Path = Field(
        default=Path("logs"),
        env="LOG_DIR",
        description="Log directory path"
    )
    config_dir: Path = Field(
        default=Path.home() / ".todoist-ai-cli",
        env="CONFIG_DIR",
        description="Configuration directory path"
    )
    
    # Nested configurations
    todoist: TodoistConfig = Field(default_factory=TodoistConfig)
    claude: ClaudeConfig = Field(default_factory=ClaudeConfig)
    gemini: GeminiConfig = Field(default_factory=GeminiConfig)
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    ui: UIConfig = Field(default_factory=UIConfig)
    
    @validator("data_dir", "log_dir", "config_dir", pre=True)
    def ensure_path(cls, v):
        """Ensure path is a Path object."""
        if isinstance(v, str):
            return Path(v)
        return v
    
    def create_directories(self) -> None:
        """Create necessary directories if they don't exist."""
        for dir_path in [self.data_dir, self.log_dir, self.config_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
    
    def get_llm_config(self, provider: Optional[str] = None):
        """Get LLM configuration for specified provider."""
        provider = provider or self.default_llm
        if provider == "claude":
            return self.claude
        elif provider == "gemini":
            return self.gemini
        else:
            raise ValueError(f"Unknown LLM provider: {provider}")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from .env
        validate_assignment = True


# Global configuration instance
_config: Optional[AppConfig] = None


def get_config() -> AppConfig:
    """Get the global configuration instance."""
    global _config
    if _config is None:
        _config = AppConfig()
        _config.create_directories()
    return _config


def reload_config() -> AppConfig:
    """Reload configuration from environment/files."""
    global _config
    _config = AppConfig()
    _config.create_directories()
    return _config


def is_configured() -> bool:
    """Check if the application is properly configured."""
    try:
        config = get_config()
        # Check if essential API keys are present
        return bool(config.todoist.api_key and 
                   (config.claude.api_key or config.gemini.api_key))
    except Exception:
        return False