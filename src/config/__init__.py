"""Configuration module for Todoist AI CLI.

This module handles application settings, environment variables, and configuration
management using Pydantic Settings for type-safe configuration.
"""

from .settings import (
    AppConfig,
    TodoistConfig,
    ClaudeConfig,
    GeminiConfig,
    DatabaseConfig,
    UIConfig,
    get_config,
    reload_config,
    is_configured,
)
from .exceptions import (
    ConfigurationError,
    MissingAPIKeyError,
    InvalidConfigurationError,
    ConfigurationFileError,
)

__all__ = [
    "AppConfig",
    "TodoistConfig", 
    "ClaudeConfig",
    "GeminiConfig",
    "DatabaseConfig",
    "UIConfig",
    "get_config",
    "reload_config",
    "is_configured",
    "ConfigurationError",
    "MissingAPIKeyError",
    "InvalidConfigurationError",
    "ConfigurationFileError",
]