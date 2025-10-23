"""
Splash screen for Todoist AI CLI.
"""

import time
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.align import Align
from rich.columns import Columns
from rich.rule import Rule

from ..config.settings import AppConfig


def create_logo() -> Text:
    """Create ASCII art logo for the application."""
    logo = Text()
    logo.append("╔══════════════════════════════════════╗\n", style="bold blue")
    logo.append("║                                      ║\n", style="bold blue")
    logo.append("║     🤖 TODOIST AI CLI 📋            ║\n", style="bold blue")
    logo.append("║                                      ║\n", style="bold blue")
    logo.append("║   Intelligent Task Management        ║\n", style="bold blue")
    logo.append("║   Powered by AI                      ║\n", style="bold blue")
    logo.append("║                                      ║\n", style="bold blue")
    logo.append("╚══════════════════════════════════════╝", style="bold blue")
    
    return logo


def create_feature_list() -> Text:
    """Create feature list for splash screen."""
    features = Text()
    features.append("✨ Features:\n\n", style="bold yellow")
    features.append("  🎯 Natural language task creation\n", style="green")
    features.append("  🧠 AI-powered task suggestions\n", style="green")
    features.append("  📊 Intelligent task organization\n", style="green")
    features.append("  💬 Interactive chat interface\n", style="green")
    features.append("  📝 Markdown file integration\n", style="green")
    features.append("  🔄 Session persistence\n", style="green")
    features.append("  ⚡ Slash commands\n", style="green")
    
    return features


def create_quick_start() -> Text:
    """Create quick start guide."""
    guide = Text()
    guide.append("🚀 Quick Start:\n\n", style="bold cyan")
    guide.append("  /help     - Show all commands\n", style="dim")
    guide.append("  /tasks    - List your tasks\n", style="dim")
    guide.append("  /add      - Add a new task\n", style="dim")
    guide.append("  /projects - List projects\n", style="dim")
    guide.append("  /read     - Read markdown file\n", style="dim")
    guide.append("  /config   - Show configuration\n", style="dim")
    guide.append("  exit      - Quit the application\n", style="dim")
    
    return guide


def create_status_info(config: AppConfig) -> Text:
    """Create status information."""
    status = Text()
    status.append("📊 Status:\n\n", style="bold magenta")
    status.append(f"  LLM Provider: {config.default_llm.title()}\n", style="white")
    status.append(f"  Theme: {config.ui.theme.title()}\n", style="white")
    status.append(f"  Autosave: {'On' if config.session_autosave else 'Off'}\n", style="white")
    status.append(f"  Version: {config.version}\n", style="white")
    
    return status


def show_splash_screen(console: Console, config: AppConfig, delay: float = 2.0) -> None:
    """
    Display the splash screen.
    
    Args:
        console: Rich console instance
        config: Application configuration
        delay: Delay in seconds before continuing
    """
    console.clear()
    
    # Create logo
    logo = create_logo()
    
    # Create content columns
    features = create_feature_list()
    quick_start = create_quick_start()
    status = create_status_info(config)
    
    # Create main panel
    main_content = Text()
    main_content.append("\n")
    main_content.extend(logo)
    main_content.append("\n\n")
    
    # Add welcome message
    welcome_msg = Text()
    welcome_msg.append("Welcome to the future of task management! 🎉\n", style="bold green")
    welcome_msg.append("Combine the power of AI with Todoist for smarter productivity.\n", style="dim")
    
    main_content.extend(Align.center(welcome_msg))
    main_content.append("\n")
    
    # Create columns for features and info
    columns = Columns([
        Panel(features, title="Features", border_style="green", padding=(1, 2)),
        Panel(quick_start, title="Quick Start", border_style="cyan", padding=(1, 2)),
        Panel(status, title="Status", border_style="magenta", padding=(1, 2))
    ], equal=True, expand=True)
    
    # Display everything
    console.print(
        Panel(
            main_content,
            title=f"🤖 {config.app_name} v{config.version}",
            subtitle="Press Ctrl+C to exit anytime",
            border_style="bold blue",
            padding=(1, 2)
        )
    )
    
    console.print(columns)
    
    # Add separator
    console.print(Rule(style="dim"))
    
    # Loading animation
    with console.status("[bold green]Initializing AI systems...", spinner="dots"):
        time.sleep(delay)
    
    console.print("✅ Ready! Type your first command or message below.\n", style="bold green")


def show_minimal_splash(console: Console, config: AppConfig) -> None:
    """Show a minimal splash screen for quick startup."""
    console.clear()
    
    title = Text()
    title.append("🤖 ", style="bold blue")
    title.append(config.app_name, style="bold blue")
    title.append(f" v{config.version}", style="bold green")
    
    console.print(
        Panel(
            Align.center(title),
            border_style="blue",
            padding=(0, 2)
        )
    )
    
    console.print("Type /help for commands or start chatting! 💬\n", style="dim")