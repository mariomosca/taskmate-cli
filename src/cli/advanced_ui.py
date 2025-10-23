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
        
        # Output buffer for chat history (now handled by prompt_toolkit Buffer)
        
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
        
        # Output area (top, scrollable) - usando Buffer per scroll corretto
        self.output_buffer = Buffer(
            read_only=True,
            multiline=True
        )
        
        self.output_control = BufferControl(
            buffer=self.output_buffer,
            focusable=True,  # Focusabile per permettere lo scroll
            include_default_input_processors=False
        )
        
        self.output_area = Window(
            content=self.output_control,
            wrap_lines=True,
            scrollbar=True,
            scroll_offsets=ScrollOffsets(bottom=1),
            always_hide_cursor=True  # Nascondi sempre il cursore nell'area di output
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
        
        @self.kb.add('escape')
        def _(event):
            """Toggle focus between input and output areas."""
            if self.output_focused:
                # Switch to input area
                self.output_focused = False
                event.app.layout.focus(self.input_area)
                self.auto_scroll = True  # Re-enable auto-scroll when returning to input
            else:
                # Switch to output area for scrolling
                self.output_focused = True
                event.app.layout.focus(self.output_area)
                self.auto_scroll = False  # Disable auto-scroll when manually scrolling
        
        @self.kb.add('pageup')
        def _(event):
            """Scroll up in output area."""
            if self.output_focused:
                # Disable auto-scroll when user manually scrolls
                self.auto_scroll = False
                # Move cursor up by page (approximately 10 lines)
                lines = self.output_buffer.text.split('\n')
                current_line = self.output_buffer.document.cursor_position_row
                new_line = max(0, current_line - 10)
                self.output_buffer.cursor_position = self.output_buffer.document.translate_row_col_to_index(new_line, 0)
        
        @self.kb.add('pagedown')
        def _(event):
            """Scroll down in output area."""
            if self.output_focused:
                # Disable auto-scroll when user manually scrolls
                self.auto_scroll = False
                # Move cursor down by page (approximately 10 lines)
                lines = self.output_buffer.text.split('\n')
                current_line = self.output_buffer.document.cursor_position_row
                new_line = min(len(lines) - 1, current_line + 10)
                self.output_buffer.cursor_position = self.output_buffer.document.translate_row_col_to_index(new_line, 0)
        
        @self.kb.add('up')
        def _(event):
            """Handle up arrow - scroll up if in output area, otherwise history."""
            if self.output_focused:
                # Disable auto-scroll when user manually scrolls
                self.auto_scroll = False
                # Let prompt_toolkit handle default scrolling (move cursor up)
                pass
            # If not in output area, let input area handle history
        
        @self.kb.add('down')
        def _(event):
            """Handle down arrow - scroll down if in output area, otherwise history."""
            if self.output_focused:
                # Disable auto-scroll when user manually scrolls
                self.auto_scroll = False
                # Let prompt_toolkit handle default scrolling (move cursor down)
                pass
            # If not in output area, let input area handle history
        
        @self.kb.add('home')
        def _(event):
            """Go to top of output when in output area."""
            if self.output_focused:
                # Disable auto-scroll when user manually scrolls
                self.auto_scroll = False
                # Move cursor to beginning of buffer
                self.output_buffer.cursor_position = 0
        
        @self.kb.add('end')
        def _(event):
            """Go to bottom of output when in output area."""
            if self.output_focused:
                # Re-enable auto-scroll when user goes to bottom
                self.auto_scroll = True
                # Scroll to bottom
                self.scroll_to_bottom()
    
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
        focus_indicator = "🎯" if not self.output_focused else "📜"
        scroll_indicator = "" if self.auto_scroll else " 📌"
        return HTML(f'<class:timestamp>[{timestamp}]</class:timestamp> <class:prompt>{focus_indicator} todoist-ai{scroll_indicator} ❯</class:prompt> ')
    
    def scroll_to_bottom(self) -> None:
        """Scroll the output area to the bottom."""
        try:
            if hasattr(self, 'app') and self.app and hasattr(self, 'output_buffer'):
                # Move cursor to end of buffer to scroll to bottom
                self.output_buffer.cursor_position = len(self.output_buffer.text)
                self.app.invalidate()
        except:
            pass  # Ignore errors if app is not ready
    
    def add_output_line(self, text: str, style: str = "") -> None:
        """Add a line to the output area."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        # Format the line as plain text for the buffer
        formatted_text = f"[{timestamp}] {text}\n"
        
        # Add to buffer
        self.output_buffer.text += formatted_text
        
        # Keep only last 1000 lines to prevent memory issues
        lines = self.output_buffer.text.split('\n')
        if len(lines) > 1000:
            self.output_buffer.text = '\n'.join(lines[-1000:])
        
        # Auto-scroll to bottom only if auto_scroll is enabled
        if self.auto_scroll:
            self.scroll_to_bottom()
        
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