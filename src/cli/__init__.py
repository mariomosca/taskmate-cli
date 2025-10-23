"""CLI module for Todoist AI CLI.

This module handles the command-line interface components including:
- UI components and Rich rendering
- REPL (Read-Eval-Print Loop) for interactive sessions
- Command handling and processing
- Splash screen and user interactions
"""

from .app import TodoistAICLI
from .repl import TodoistREPL
from .ui import UIManager
from .commands import CommandProcessor
from .splash import show_splash_screen, show_minimal_splash

__all__ = [
    "TodoistAICLI",
    "TodoistREPL", 
    "UIManager",
    "CommandProcessor",
    "show_splash_screen",
    "show_minimal_splash"
]