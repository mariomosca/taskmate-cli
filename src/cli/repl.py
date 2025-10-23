"""
REPL (Read-Eval-Print Loop) for Todoist AI CLI.
"""

import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime

from prompt_toolkit import PromptSession
from prompt_toolkit.completion import WordCompleter
from prompt_toolkit.history import InMemoryHistory
from prompt_toolkit.shortcuts import confirm
from prompt_toolkit.formatted_text import HTML
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.markdown import Markdown

from ..config.settings import AppConfig
from .commands import CommandProcessor
from .ui import UIManager


class TodoistREPL:
    """Main REPL class for interactive CLI."""
    
    def __init__(self, config: AppConfig, console: Console):
        self.config = config
        self.console = console
        self.session_active = True
        
        # Initialize components
        self.ui_manager = UIManager(console, config)
        self.command_processor = CommandProcessor(config, console)
        
        # Setup prompt session
        self.history = InMemoryHistory()
        self.setup_prompt_session()
        
        # Session state
        self.session_start = datetime.now()
        self.command_count = 0
    
    def setup_prompt_session(self) -> None:
        """Setup the prompt session with completion and history."""
        # Create completer with slash commands
        slash_commands = [
            "/help", "/tasks", "/add", "/projects", "/labels",
            "/today", "/upcoming", "/overdue", "/completed",
            "/read", "/context", "/clear", "/save", "/load",
            "/config", "/status", "/stats", "/export",
            "/ai", "/suggest", "/organize", "/analyze"
        ]
        
        completer = WordCompleter(
            slash_commands,
            ignore_case=True,
            match_middle=True
        )
        
        self.prompt_session = PromptSession(
            history=self.history,
            completer=completer if self.config.ui.auto_complete else None,
            complete_style="multi-column",
            mouse_support=True,
        )
    
    def get_prompt_text(self) -> HTML:
        """Get the prompt text with styling."""
        timestamp = datetime.now().strftime("%H:%M")
        
        if self.config.ui.theme == "dark":
            return HTML(f'<ansiblue>[{timestamp}]</ansiblue> <ansigreen>todoist-ai</ansigreen> <ansiyellow>❯</ansiyellow> ')
        else:
            return HTML(f'<blue>[{timestamp}]</blue> <green>todoist-ai</green> <yellow>❯</yellow> ')
    
    async def handle_input(self, user_input: str) -> bool:
        """
        Handle user input and return whether to continue.
        
        Args:
            user_input: The user's input string
            
        Returns:
            True to continue REPL, False to exit
        """
        user_input = user_input.strip()
        
        # Handle empty input
        if not user_input:
            return True
        
        # Handle exit commands
        if user_input.lower() in ["exit", "quit", "bye", "q"]:
            return await self.handle_exit()
        
        # Increment command counter
        self.command_count += 1
        
        try:
            # Check if it's a slash command
            if user_input.startswith("/"):
                await self.command_processor.process_command(user_input)
            else:
                # Handle as AI conversation
                await self.command_processor.process_ai_message(user_input)
                
        except KeyboardInterrupt:
            self.console.print("\n⚠️  Command interrupted", style="yellow")
        except Exception as e:
            self.ui_manager.show_error(f"Error processing input: {e}")
        
        return True
    
    async def handle_exit(self) -> bool:
        """Handle exit command with confirmation."""
        # Show session summary
        duration = datetime.now() - self.session_start
        duration_str = str(duration).split('.')[0]  # Remove microseconds
        
        summary = Text()
        summary.append("📊 Session Summary:\n\n", style="bold blue")
        summary.append(f"  Duration: {duration_str}\n", style="dim")
        summary.append(f"  Commands executed: {self.command_count}\n", style="dim")
        summary.append(f"  Started: {self.session_start.strftime('%Y-%m-%d %H:%M:%S')}\n", style="dim")
        
        self.console.print(
            Panel(
                summary,
                title="Session Complete",
                border_style="blue"
            )
        )
        
        # Ask for confirmation if session has been active
        if self.command_count > 0:
            try:
                should_exit = confirm("Are you sure you want to exit?")
                if not should_exit:
                    self.console.print("Continuing session...", style="green")
                    return True
            except KeyboardInterrupt:
                pass
        
        # Save session if autosave is enabled
        if self.config.session_autosave:
            try:
                await self.command_processor.save_session()
                self.console.print("✅ Session saved automatically", style="green")
            except Exception as e:
                self.console.print(f"⚠️  Failed to save session: {e}", style="yellow")
        
        self.console.print("👋 Thank you for using Todoist AI CLI!", style="bold blue")
        return False
    
    async def run(self) -> None:
        """Run the main REPL loop."""
        self.console.print("🎯 Ready for your commands! Type /help for assistance.\n", style="bold green")
        
        while self.session_active:
            try:
                # Get user input
                user_input = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.prompt_session.prompt(self.get_prompt_text())
                )
                
                # Process input
                should_continue = await self.handle_input(user_input)
                if not should_continue:
                    break
                    
            except KeyboardInterrupt:
                # Handle Ctrl+C gracefully
                self.console.print("\n")
                should_exit = await self.handle_exit()
                if not should_exit:
                    continue
                else:
                    break
            except EOFError:
                # Handle Ctrl+D
                break
            except Exception as e:
                self.ui_manager.show_error(f"Unexpected error in REPL: {e}")
                
                # Ask if user wants to continue
                try:
                    should_continue = confirm("An error occurred. Continue?")
                    if not should_continue:
                        break
                except KeyboardInterrupt:
                    break
        
        self.session_active = False