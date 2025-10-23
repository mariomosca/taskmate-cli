"""
Advanced UI module for chat-like terminal interface.
Provides a fixed input at the bottom with scrollable output above.
"""

import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime

from prompt_toolkit import Application
from prompt_toolkit.buffer import Buffer
from prompt_toolkit.completion import WordCompleter
from prompt_toolkit.history import InMemoryHistory
from prompt_toolkit.key_binding import KeyBindings
from prompt_toolkit.layout.containers import HSplit, Window, ScrollOffsets
from prompt_toolkit.layout.controls import BufferControl, FormattedTextControl
from prompt_toolkit.layout.layout import Layout
from prompt_toolkit.widgets import TextArea, Frame
from prompt_toolkit.formatted_text import HTML, FormattedText
from prompt_toolkit.styles import Style
from rich.console import Console
from rich.text import Text

from ..config.settings import AppConfig
from .commands import CommandProcessor
from .ui import UIManager


class AdvancedTerminalUI:
    """Advanced terminal UI with chat-like interface."""
    
    def __init__(self, config: AppConfig, console: Console):
        self.config = config
        self.console = console
        self.command_processor = CommandProcessor(config, console)
        self.ui_manager = UIManager(console, config)
        
        # Session state
        self.session_start = datetime.now()
        self.command_count = 0
        self.session_active = True
        
        # Output buffer for chat history
        self.output_lines: List[FormattedText] = []
        
        # Scroll state
        self.output_focused = False
        self.auto_scroll = True  # Auto-scroll to bottom when new content is added
        
        # Setup components
        self.setup_components()
        self.setup_key_bindings()
        self.setup_application()
    
    def setup_components(self) -> None:
        """Setup UI components."""
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
        
        # Input area (bottom)
        self.input_buffer = Buffer(
            completer=completer if self.config.ui.auto_complete else None,
            history=InMemoryHistory(),
            multiline=False,
            accept_handler=self.handle_input_accept
        )
        
        self.input_area = TextArea(
            buffer=self.input_buffer,
            prompt=self.get_prompt_text,
            multiline=False,
            wrap_lines=False,
            scrollbar=False,
            height=1
        )
        
        # Output area (top, scrollable)
        self.output_control = FormattedTextControl(
            text=self.get_output_text,
            focusable=False,
            show_cursor=False
        )
        
        self.output_area = Window(
            content=self.output_control,
            wrap_lines=True,
            scrollbar=True,
            scroll_offsets=ScrollOffsets(bottom=1)
        )
        
        # Main layout
        self.root_container = HSplit([
            Frame(
                self.output_area,
                title="Todoist AI CLI - Output"
            ),
            Frame(
                self.input_area,
                title="Input"
            )
        ])
        
        self.layout = Layout(self.root_container)
    
    def setup_key_bindings(self) -> None:
        """Setup key bindings."""
        self.kb = KeyBindings()
        
        @self.kb.add('c-c')
        def _(event):
            """Handle Ctrl+C."""
            event.app.exit()
        
        @self.kb.add('c-d')
        def _(event):
            """Handle Ctrl+D."""
            event.app.exit()
    
    def setup_application(self) -> None:
        """Setup the prompt_toolkit application."""
        # Style for the interface
        style = Style.from_dict({
            'frame.border': '#888888',
            'frame.title': '#00aa00 bold',
            'input': '#ffffff',
            'prompt': '#00aa00 bold',
            'timestamp': '#0088ff',
            'command': '#ffaa00',
            'error': '#ff0000',
            'success': '#00ff00',
            'info': '#00aaff',
        })
        
        self.app = Application(
            layout=self.layout,
            key_bindings=self.kb,
            style=style,
            full_screen=True,
            mouse_support=True
        )
    
    def get_prompt_text(self) -> HTML:
        """Get the prompt text with styling."""
        timestamp = datetime.now().strftime("%H:%M")
        return HTML(f'<class:timestamp>[{timestamp}]</class:timestamp> <class:prompt>todoist-ai ❯</class:prompt> ')
    
    def get_output_text(self) -> FormattedText:
        """Get the formatted output text."""
        return FormattedText(self.output_lines)
    
    def add_output_line(self, text: str, style: str = "") -> None:
        """Add a line to the output area."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        if style:
            formatted_line = [
                ("class:timestamp", f"[{timestamp}] "),
                (f"class:{style}", text),
                ("", "\n")
            ]
        else:
            formatted_line = [
                ("class:timestamp", f"[{timestamp}] "),
                ("", text),
                ("", "\n")
            ]
        
        self.output_lines.extend(formatted_line)
        
        # Keep only last 1000 lines to prevent memory issues
        if len(self.output_lines) > 3000:  # 3 elements per line on average
            self.output_lines = self.output_lines[-3000:]
        
        # Refresh the output area
        if hasattr(self, 'app') and self.app.is_running:
            self.app.invalidate()
    
    def handle_input_accept(self, buffer: Buffer) -> bool:
        """Handle when user presses Enter."""
        user_input = buffer.text.strip()
        buffer.reset()
        
        if user_input:
            # Show the command in output
            self.add_output_line(f"❯ {user_input}", "command")
            
            # Process the command asynchronously
            asyncio.create_task(self.process_input(user_input))
        
        return True
    
    async def process_input(self, user_input: str) -> None:
        """Process user input asynchronously."""
        # Handle exit commands
        if user_input.lower() in ["exit", "quit", "bye", "q"]:
            self.add_output_line("👋 Goodbye!", "info")
            self.app.exit()
            return
        
        # Increment command counter
        self.command_count += 1
        
        try:
            # Redirect console output to our output area
            original_print = self.console.print
            
            def custom_print(*args, **kwargs):
                # Convert rich output to plain text for now
                # In a more advanced implementation, we could preserve rich formatting
                if args:
                    text = " ".join(str(arg) for arg in args)
                    style_name = kwargs.get('style', '')
                    if 'error' in style_name or 'red' in style_name:
                        self.add_output_line(text, "error")
                    elif 'green' in style_name or 'success' in style_name:
                        self.add_output_line(text, "success")
                    elif 'yellow' in style_name or 'warning' in style_name:
                        self.add_output_line(text, "info")
                    else:
                        self.add_output_line(text)
            
            # Temporarily replace console.print
            self.console.print = custom_print
            
            try:
                # Check if it's a slash command
                if user_input.startswith("/"):
                    await self.command_processor.process_command(user_input)
                else:
                    # Handle as AI conversation
                    await self.command_processor.process_ai_message(user_input)
            finally:
                # Restore original print
                self.console.print = original_print
                
        except KeyboardInterrupt:
            self.add_output_line("⚠️  Command interrupted", "info")
        except Exception as e:
            self.add_output_line(f"❌ Error processing input: {e}", "error")
    
    async def run(self) -> None:
        """Run the advanced terminal UI."""
        # Add welcome message
        self.add_output_line("🎯 Welcome to Todoist AI CLI!", "success")
        self.add_output_line("Type /help for assistance or start chatting with AI", "info")
        self.add_output_line("Press Ctrl+C or type 'exit' to quit", "info")
        self.add_output_line("", "")
        
        # Initialize services
        try:
            await self.command_processor.initialize()
            self.add_output_line("✅ Services initialized successfully", "success")
        except Exception as e:
            self.add_output_line(f"⚠️  Some services failed to initialize: {e}", "error")
        
        # Run the application
        await self.app.run_async()