#!/usr/bin/env python3
"""
Simple and robust CLI interface using rich for output and prompt_toolkit for input.
This approach avoids complex layouts and focuses on simplicity and reliability.
"""

import os
import sys
from datetime import datetime
from typing import List, Dict, Any
from prompt_toolkit import prompt
from prompt_toolkit.history import InMemoryHistory
from prompt_toolkit.auto_suggest import AutoSuggestFromHistory
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.layout import Layout
from rich.live import Live
from rich import box

class RichCLI:
    def __init__(self):
        self.console = Console()
        self.history = InMemoryHistory()
        self.messages: List[Dict[str, Any]] = []
        self.running = True
        
        # Status info
        self.status = {
            "provider": "Claude",
            "theme": "Rich",
            "autosave": "On",
            "version": "1.0.0"
        }
    
    def clear_screen(self):
        """Clear the terminal screen"""
        os.system('clear' if os.name == 'posix' else 'cls')
    
    def get_header(self) -> Panel:
        """Create the header panel with status information"""
        header_text = Text()
        header_text.append("🤖 Todoist AI CLI", style="bold cyan")
        header_text.append(" | ", style="dim")
        header_text.append(f"Provider: {self.status['provider']}", style="green")
        header_text.append(" | ", style="dim")
        header_text.append(f"Theme: {self.status['theme']}", style="blue")
        header_text.append(" | ", style="dim")
        header_text.append(f"Autosave: {self.status['autosave']}", style="yellow")
        header_text.append(" | ", style="dim")
        header_text.append(f"v{self.status['version']}", style="magenta")
        
        return Panel(
            header_text,
            box=box.ROUNDED,
            style="bright_blue"
        )
    
    def add_message(self, role: str, content: str):
        """Add a message to the conversation history"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.messages.append({
            "role": role,
            "content": content,
            "timestamp": timestamp
        })
    
    def display_messages(self):
        """Display the conversation history"""
        if not self.messages:
            self.console.print("\n[dim]No messages yet. Type a command to get started![/dim]\n")
            return
        
        # Show last 10 messages to avoid overwhelming the screen
        recent_messages = self.messages[-10:]
        
        for msg in recent_messages:
            timestamp = f"[dim]{msg['timestamp']}[/dim]"
            
            if msg['role'] == 'user':
                self.console.print(f"{timestamp} [bold cyan]You:[/bold cyan] {msg['content']}")
            elif msg['role'] == 'assistant':
                self.console.print(f"{timestamp} [bold green]AI:[/bold green] {msg['content']}")
            elif msg['role'] == 'system':
                self.console.print(f"{timestamp} [bold yellow]System:[/bold yellow] {msg['content']}")
        
        self.console.print()  # Add spacing
    
    def process_command(self, user_input: str) -> str:
        """Process user command and return AI response"""
        user_input = user_input.strip()
        
        if not user_input:
            return "Please enter a command."
        
        # Handle special commands
        if user_input.lower() in ['exit', 'quit', 'q']:
            self.running = False
            return "Goodbye! 👋"
        
        if user_input.lower() in ['help', 'h']:
            return """Available commands:
• help, h - Show this help message
• clear - Clear the conversation history
• status - Show current status
• exit, quit, q - Exit the application
• Any other text - Send to AI for processing"""
        
        if user_input.lower() == 'clear':
            self.messages.clear()
            return "Conversation history cleared."
        
        if user_input.lower() == 'status':
            return f"""Current Status:
• Provider: {self.status['provider']}
• Theme: {self.status['theme']}
• Autosave: {self.status['autosave']}
• Version: {self.status['version']}
• Messages: {len(self.messages)}"""
        
        # Simulate AI processing
        return f"AI response to: '{user_input}' (This is a placeholder - integrate with your AI service here)"
    
    def show_welcome(self):
        """Display welcome message"""
        welcome_panel = Panel(
            Text.from_markup("""[bold cyan]Welcome to Todoist AI CLI![/bold cyan]

[green]✓[/green] AI Assistant ready
[green]✓[/green] Natural language processing enabled
[green]✓[/green] Task management integration active

[dim]Type 'help' for available commands or start chatting with the AI![/dim]"""),
            title="🚀 Getting Started",
            box=box.ROUNDED,
            style="green"
        )
        self.console.print(welcome_panel)
        self.console.print()
    
    def run(self):
        """Main application loop"""
        try:
            # Initial setup
            self.clear_screen()
            self.console.print(self.get_header())
            self.console.print()
            self.show_welcome()
            
            # Add welcome message to history
            self.add_message("system", "Welcome to Todoist AI CLI! Type 'help' for available commands.")
            
            while self.running:
                try:
                    # Display conversation history
                    self.display_messages()
                    
                    # Get user input
                    current_time = datetime.now().strftime("%H:%M")
                    user_input = prompt(
                        f"[{current_time}] todoist-ai ❯ ",
                        history=self.history,
                        auto_suggest=AutoSuggestFromHistory(),
                    )
                    
                    if not user_input.strip():
                        continue
                    
                    # Add user message
                    self.add_message("user", user_input)
                    
                    # Process command and get response
                    response = self.process_command(user_input)
                    
                    # Add AI response
                    self.add_message("assistant", response)
                    
                    # Clear screen and refresh display
                    self.clear_screen()
                    self.console.print(self.get_header())
                    self.console.print()
                    
                except KeyboardInterrupt:
                    self.console.print("\n[yellow]Use 'exit' or 'quit' to close the application.[/yellow]")
                    continue
                except EOFError:
                    break
        
        except Exception as e:
            self.console.print(f"\n[red]Error: {e}[/red]")
            return 1
        
        return 0

def main():
    """Entry point for the Rich CLI"""
    cli = RichCLI()
    return cli.run()

if __name__ == "__main__":
    sys.exit(main())