"""
Main CLI application class for Todoist AI CLI.
"""

import sys
import asyncio
from typing import Optional
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.traceback import install as install_rich_traceback

from ..config import get_config, is_configured
from ..config.validator import print_configuration_status, check_env_file
from .splash import show_splash_screen
from .repl import TodoistREPL
from ..utils.logging import setup_logging


class TodoistAICLI:
    """Main CLI application class."""
    
    def __init__(self):
        self.console = Console()
        self.config = None
        self.repl = None
        
        # Install rich traceback for better error display
        install_rich_traceback(show_locals=True)
    
    def initialize(self) -> bool:
        """
        Initialize the CLI application.
        
        Returns:
            True if initialization successful, False otherwise
        """
        try:
            # Check for .env file
            if not check_env_file():
                return False
            
            # Load configuration
            self.config = get_config()
            
            # Setup logging
            setup_logging(
                level="DEBUG" if self.config.debug else "INFO",
                log_file=self.config.log_dir / "todoist-ai.log"
            )
            
            # Validate configuration
            if not print_configuration_status(self.console):
                return False
            
            # Initialize REPL
            self.repl = TodoistREPL(self.config, self.console)
            
            return True
            
        except Exception as e:
            self.console.print(
                Panel(
                    Text(f"❌ Failed to initialize application: {e}", style="bold red"),
                    title="Initialization Error",
                    border_style="red"
                )
            )
            return False
    
    def run(self) -> None:
        """Run the main CLI application."""
        if not self.initialize():
            sys.exit(1)
        
        try:
            # Show splash screen if enabled
            if self.config.ui.show_splash:
                show_splash_screen(self.console, self.config)
            
            # Start the REPL
            asyncio.run(self.repl.run())
            
        except KeyboardInterrupt:
            self.console.print("\n👋 Goodbye!", style="bold blue")
        except Exception as e:
            self.console.print(
                Panel(
                    Text(f"❌ Unexpected error: {e}", style="bold red"),
                    title="Runtime Error",
                    border_style="red"
                )
            )
            sys.exit(1)


# Create the main typer app
app = typer.Typer(
    name="todoist-ai",
    help="AI-powered CLI for intelligent Todoist task management",
    add_completion=False,
    rich_markup_mode="rich",
)


@app.command()
def main(
    config_check: bool = typer.Option(
        False, 
        "--config-check", 
        help="Check configuration and exit"
    ),
    debug: bool = typer.Option(
        False,
        "--debug",
        help="Enable debug mode"
    ),
    no_splash: bool = typer.Option(
        False,
        "--no-splash",
        help="Skip splash screen"
    ),
) -> None:
    """Start the Todoist AI CLI."""
    
    # Create CLI instance
    cli = TodoistAICLI()
    
    # Handle config check mode
    if config_check:
        if not check_env_file():
            sys.exit(1)
        
        try:
            config = get_config()
            if print_configuration_status(cli.console):
                cli.console.print("✅ Configuration is valid!", style="bold green")
                sys.exit(0)
            else:
                sys.exit(1)
        except Exception as e:
            cli.console.print(f"❌ Configuration error: {e}", style="bold red")
            sys.exit(1)
    
    # Override config with CLI options
    if not cli.initialize():
        sys.exit(1)
    
    if debug:
        cli.config.debug = True
    
    if no_splash:
        cli.config.ui.show_splash = False
    
    # Run the application
    cli.run()


@app.command()
def version() -> None:
    """Show version information."""
    console = Console()
    try:
        config = get_config()
        version_text = Text()
        version_text.append(f"{config.app_name} ", style="bold blue")
        version_text.append(f"v{config.version}", style="bold green")
        
        console.print(
            Panel(
                version_text,
                title="Version",
                border_style="blue"
            )
        )
    except Exception:
        console.print("Todoist AI CLI v1.0.0", style="bold blue")


@app.command()
def config() -> None:
    """Show current configuration."""
    console = Console()
    
    if not check_env_file():
        sys.exit(1)
    
    try:
        config = get_config()
        print_configuration_status(console)
        
        # Show configuration summary
        config_text = Text()
        config_text.append("Configuration Summary:\n\n", style="bold")
        config_text.append(f"• Default LLM: {config.default_llm}\n", style="dim")
        config_text.append(f"• Data Directory: {config.data_dir}\n", style="dim")
        config_text.append(f"• Session Autosave: {config.session_autosave}\n", style="dim")
        config_text.append(f"• UI Theme: {config.ui.theme}\n", style="dim")
        
        console.print(
            Panel(
                config_text,
                title="Current Configuration",
                border_style="blue"
            )
        )
        
    except Exception as e:
        console.print(f"❌ Error loading configuration: {e}", style="bold red")
        sys.exit(1)


if __name__ == "__main__":
    app()