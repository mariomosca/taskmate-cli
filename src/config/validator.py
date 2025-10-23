"""
Configuration validation utilities for Todoist AI CLI.
"""

import os
from pathlib import Path
from typing import List, Tuple, Optional
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

from .settings import get_config, AppConfig
from .exceptions import MissingAPIKeyError, InvalidConfigurationError


def validate_api_keys(config: AppConfig) -> List[str]:
    """Validate that required API keys are present."""
    errors = []
    
    # Check Todoist API key
    if not config.todoist.api_key:
        errors.append("TODOIST_API_KEY is required")
    
    # Check that at least one LLM API key is present
    has_claude = bool(config.claude.api_key)
    has_gemini = bool(config.gemini.api_key)
    
    if not (has_claude or has_gemini):
        errors.append("At least one LLM API key is required (CLAUDE_API_KEY or GEMINI_API_KEY)")
    
    # Warn if default LLM doesn't have API key
    if config.default_llm == "claude" and not has_claude:
        errors.append("DEFAULT_LLM is set to 'claude' but CLAUDE_API_KEY is missing")
    elif config.default_llm == "gemini" and not has_gemini:
        errors.append("DEFAULT_LLM is set to 'gemini' but GEMINI_API_KEY is missing")
    
    return errors


def validate_directories(config: AppConfig) -> List[str]:
    """Validate that required directories can be created."""
    errors = []
    
    for dir_name, dir_path in [
        ("data", config.data_dir),
        ("log", config.log_dir),
        ("config", config.config_dir),
    ]:
        try:
            # Try to create the directory
            dir_path.mkdir(parents=True, exist_ok=True)
            
            # Check if it's writable
            test_file = dir_path / ".test_write"
            try:
                test_file.write_text("test")
                test_file.unlink()
            except Exception as e:
                errors.append(f"{dir_name} directory '{dir_path}' is not writable: {e}")
                
        except Exception as e:
            errors.append(f"Cannot create {dir_name} directory '{dir_path}': {e}")
    
    return errors


def validate_database_config(config: AppConfig) -> List[str]:
    """Validate database configuration."""
    errors = []
    
    db_url = config.database.url
    
    # For SQLite, check if the directory exists
    if db_url.startswith("sqlite:///"):
        db_path = Path(db_url.replace("sqlite:///", ""))
        db_dir = db_path.parent
        
        if not db_dir.exists():
            try:
                db_dir.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                errors.append(f"Cannot create database directory '{db_dir}': {e}")
    
    return errors


def validate_configuration(config: Optional[AppConfig] = None) -> Tuple[bool, List[str]]:
    """
    Validate the entire configuration.
    
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    if config is None:
        try:
            config = get_config()
        except Exception as e:
            return False, [f"Failed to load configuration: {e}"]
    
    all_errors = []
    
    # Validate API keys
    all_errors.extend(validate_api_keys(config))
    
    # Validate directories
    all_errors.extend(validate_directories(config))
    
    # Validate database config
    all_errors.extend(validate_database_config(config))
    
    return len(all_errors) == 0, all_errors


def print_configuration_status(console: Optional[Console] = None) -> bool:
    """
    Print configuration status to console.
    
    Returns:
        True if configuration is valid, False otherwise
    """
    if console is None:
        console = Console()
    
    is_valid, errors = validate_configuration()
    
    if is_valid:
        console.print(
            Panel(
                Text("✅ Configuration is valid!", style="bold green"),
                title="Configuration Status",
                border_style="green"
            )
        )
        return True
    else:
        error_text = Text()
        error_text.append("❌ Configuration errors found:\n\n", style="bold red")
        
        for i, error in enumerate(errors, 1):
            error_text.append(f"{i}. {error}\n", style="red")
        
        error_text.append("\n💡 Please check your .env file and fix the above issues.", style="yellow")
        
        console.print(
            Panel(
                error_text,
                title="Configuration Status",
                border_style="red"
            )
        )
        return False


def check_env_file() -> bool:
    """Check if .env file exists and suggest creating it."""
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists():
        console = Console()
        
        if env_example.exists():
            console.print(
                Panel(
                    Text.from_markup(
                        "⚠️  [yellow].env file not found![/yellow]\n\n"
                        "To get started:\n"
                        "1. Copy .env.example to .env\n"
                        "2. Fill in your API keys\n\n"
                        "[dim]cp .env.example .env[/dim]"
                    ),
                    title="Environment Setup",
                    border_style="yellow"
                )
            )
        else:
            console.print(
                Panel(
                    Text.from_markup(
                        "⚠️  [yellow].env file not found![/yellow]\n\n"
                        "Please create a .env file with your API keys:\n\n"
                        "[dim]TODOIST_API_KEY=your_todoist_key\n"
                        "ANTHROPIC_API_KEY=your_claude_key\n"
                        "# or\n"
                        "GOOGLE_API_KEY=your_gemini_key[/dim]"
                    ),
                    title="Environment Setup",
                    border_style="yellow"
                )
            )
        
        return False
    
    return True