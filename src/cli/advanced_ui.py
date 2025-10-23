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
from prompt_toolkit.layout.containers import HSplit, Window
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
        
        # Output buffer for chat history (now handled by prompt_toolkit Buffer)
        
        # UI state - focus rimosso per evitare scroll automatico
        
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
        
        self.input_area = Window(
            content=BufferControl(
                buffer=self.input_buffer,
                include_default_input_processors=True
            ),
            height=1,
            wrap_lines=False
        )
        
        # Output area (top, scrollable) - usando Buffer per scroll corretto
        self.output_buffer = Buffer(
            read_only=True,
            multiline=True
        )
        
        self.output_control = BufferControl(
            buffer=self.output_buffer,
            focusable=True,  # Abilitato per permettere scroll naturale
            include_default_input_processors=False
        )
        
        self.output_area = Window(
            content=self.output_control,
            wrap_lines=False,  # Disabilitato per testare scroll issue
            always_hide_cursor=True,  # Nasconde il cursore per evitare interferenze
        )
        
        # Separator line (like Claude Code)
        self.separator = Window(
            content=FormattedTextControl(
                text=lambda: "─" * (self.app.output.get_size().columns if hasattr(self, 'app') and self.app else 80)
            ),
            height=1,
            style="class:separator"
        )
        
        # Main layout
        self.root_container = HSplit([
            # Output area (scrollable)
            self.output_area,
            # Separator line
            self.separator,
            # Input area (fixed at bottom)
            self.input_area
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
        
        # Escape key rimosso - non più necessario senza focus sull'output area
        
        # PageUp/PageDown keybindings rimossi - lasciamo che prompt_toolkit gestisca lo scroll naturalmente
        # Questo dovrebbe evitare conflitti di focus e permettere scroll fluido
        
        @self.kb.add('escape')
        def _(event):
            """Toggle focus between input and output areas."""
            try:
                current_focus = event.app.layout.current_window
                if current_focus == self.input_area:
                    # Switch to output area for scrolling
                    event.app.layout.focus(self.output_area)
                else:
                    # Switch back to input area for typing
                    event.app.layout.focus(self.input_area)
            except Exception:
                # Fallback: always focus input
                event.app.layout.focus(self.input_area)
        
        # Keybindings up, down, home, end rimossi - non più necessari senza focus sull'output area
        # Lo scroll è ora gestito solo tramite PageUp/PageDown
        

    
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
            'separator': '#888888',
        })
        
        self.app = Application(
            layout=self.layout,
            key_bindings=self.kb,
            style=style,
            full_screen=True,
            mouse_support=False  # Disabilitato per testare scroll issue
        )
    
    def get_prompt_text(self) -> HTML:
        """Get the prompt text with styling."""
        timestamp = datetime.now().strftime("%H:%M")
        return HTML(f'<class:prompt>></class:prompt> ')
    
    def ensure_input_focus(self) -> None:
        """Ensure the input area has focus to prevent scroll issues."""
        if hasattr(self, 'app') and self.app.is_running:
            try:
                from prompt_toolkit.application import get_app
                get_app().layout.focus(self.input_area)
            except Exception:
                # Fallback: focus the input buffer directly
                pass
    

    
    def add_output_line(self, text: str, style: str = "") -> None:
        """Add a line to the output area."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        # Format the line as plain text for the buffer
        formatted_text = f"[{timestamp}] {text}\n"
        
        # Preserve cursor position to avoid auto-scroll
        old_cursor_pos = self.output_buffer.cursor_position
        
        # Add to buffer
        self.output_buffer.text += formatted_text
        
        # Keep only last 1000 lines to prevent memory issues
        lines = self.output_buffer.text.split('\n')
        if len(lines) > 1000:
            self.output_buffer.text = '\n'.join(lines[-1000:])
            # Adjust cursor position after trimming
            old_cursor_pos = max(0, old_cursor_pos - (len(formatted_text) * (len(lines) - 1000)))
        
        # Restore cursor position to prevent auto-scroll
        self.output_buffer.cursor_position = min(old_cursor_pos, len(self.output_buffer.text))
        
        # Refresh the output area
        if hasattr(self, 'app') and self.app.is_running:
            self.app.invalidate()
    
    def handle_input_accept(self, buffer: Buffer) -> bool:
        """Handle when user presses Enter."""
        user_input = buffer.text.strip()
        
        if user_input:
            # Show the command in output
            self.add_output_line(f"❯ {user_input}", "command")
            
            # Process the command asynchronously
            asyncio.create_task(self.process_input(user_input))
            
            # Clear the buffer AFTER processing to avoid overwriting
            buffer.reset()
            
            # Ensure input area maintains focus after processing user input
            self.ensure_input_focus()
        
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
        self.add_output_line("📜 Scroll Controls:", "info")
        self.add_output_line("  • ESC: Toggle focus between input/output", "info")
        self.add_output_line("  • Page Up/Down: Scroll by page", "info")
        self.add_output_line("  • Up/Down arrows: Scroll line by line", "info")
        self.add_output_line("  • Home/End: Jump to top/bottom", "info")
        self.add_output_line("", "")
        
        # Initialize services
        try:
            await self.command_processor.initialize()
            self.add_output_line("✅ Services initialized successfully", "success")
        except Exception as e:
            self.add_output_line(f"⚠️  Some services failed to initialize: {e}", "error")
        
        # Run the application
        await self.app.run_async()