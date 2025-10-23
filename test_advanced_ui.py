#!/usr/bin/env python3
"""
Test file for advanced UI without relative imports.
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


class TestAdvancedTerminalUI:
    """Advanced terminal UI with chat-like interface - Test version."""
    
    def __init__(self):
        self.console = Console()
        self.messages: List[Dict[str, Any]] = []
        self.app: Optional[Application] = None
        self.output_buffer: Optional[Buffer] = None
        self.input_buffer: Optional[Buffer] = None
        self.output_area: Optional[Window] = None
        self.input_area: Optional[Window] = None
        self.focused_on_output = False
        
        # Add some test messages
        self.messages = [
            {"timestamp": "10:30", "content": "Benvenuto nella CLI evoluta!", "style": "info"},
            {"timestamp": "10:31", "content": "Questa è una versione di test per verificare lo scrolling.", "style": ""},
            {"timestamp": "10:32", "content": "Prova a usare PageUp/PageDown per scorrere.", "style": ""},
            {"timestamp": "10:33", "content": "Usa le frecce su/giù per scorrere riga per riga.", "style": ""},
            {"timestamp": "10:34", "content": "Premi Escape per cambiare focus tra input e output.", "style": ""},
        ]
        
        self.setup_components()
        self.setup_key_bindings()
        self.setup_application()
        
    def setup_components(self) -> None:
        """Setup UI components."""
        # Output buffer (writable for updates)
        self.output_buffer = Buffer(
            document=None,
            read_only=False,  # Allow writing for updates
            multiline=True
        )
        
        # Input buffer
        self.input_buffer = Buffer(
            history=InMemoryHistory(),
            multiline=False,
            accept_handler=self.handle_input_accept
        )
        
        # Output area with scrolling
        self.output_area = Window(
            content=BufferControl(
                buffer=self.output_buffer,
                focusable=True,
                search_buffer_control=None,
            ),
            height=None,  # Take available space
            scroll_offsets=ScrollOffsets(top=0, bottom=0),
            always_hide_cursor=True,
            wrap_lines=True,
        )
        
        # Input area
        self.input_area = Window(
            content=BufferControl(
                buffer=self.input_buffer,
                focusable=True,
            ),
            height=1,
            dont_extend_height=True,
        )
        
        # Populate output buffer with existing messages
        self.refresh_output()
        
    def setup_key_bindings(self) -> None:
        """Setup key bindings for navigation."""
        self.kb = KeyBindings()
        
        @self.kb.add('c-c')
        def _(event):
            """Exit application."""
            event.app.exit()
            
        @self.kb.add('c-d')
        def _(event):
            """Exit application."""
            event.app.exit()
            
        @self.kb.add('escape')
        def _(event):
            """Toggle focus between input and output."""
            self.focused_on_output = not self.focused_on_output
            if self.focused_on_output:
                event.app.layout.focus(self.output_area)
            else:
                event.app.layout.focus(self.input_area)
                
        @self.kb.add('pageup')
        def _(event):
            """Scroll up by page."""
            if self.output_buffer and self.output_area:
                # Calculate page size (approximate)
                page_size = max(1, event.app.output.get_size().rows - 5)
                current_line = self.output_buffer.cursor_position_row
                new_line = max(0, current_line - page_size)
                
                try:
                    # Move cursor to new position
                    self.output_buffer.cursor_position = self.output_buffer.document.translate_row_col_to_index(new_line, 0)
                except:
                    # Fallback to beginning if error
                    self.output_buffer.cursor_position = 0
                    
        @self.kb.add('pagedown')
        def _(event):
            """Scroll down by page."""
            if self.output_buffer and self.output_area:
                # Calculate page size (approximate)
                page_size = max(1, event.app.output.get_size().rows - 5)
                current_line = self.output_buffer.cursor_position_row
                max_line = self.output_buffer.document.line_count - 1
                new_line = min(max_line, current_line + page_size)
                
                try:
                    # Move cursor to new position
                    self.output_buffer.cursor_position = self.output_buffer.document.translate_row_col_to_index(new_line, 0)
                except:
                    # Fallback to end if error
                    self.output_buffer.cursor_position = len(self.output_buffer.text)
                    
        @self.kb.add('up')
        def _(event):
            """Scroll up by line when output is focused."""
            if self.focused_on_output and self.output_buffer:
                current_line = self.output_buffer.cursor_position_row
                if current_line > 0:
                    new_line = current_line - 1
                    try:
                        self.output_buffer.cursor_position = self.output_buffer.document.translate_row_col_to_index(new_line, 0)
                    except:
                        pass
            else:
                # Default behavior for input area
                event.app.key_processor.feed_key(event.key_sequence[0])
                
        @self.kb.add('down')
        def _(event):
            """Scroll down by line when output is focused."""
            if self.focused_on_output and self.output_buffer:
                current_line = self.output_buffer.cursor_position_row
                max_line = self.output_buffer.document.line_count - 1
                if current_line < max_line:
                    new_line = current_line + 1
                    try:
                        self.output_buffer.cursor_position = self.output_buffer.document.translate_row_col_to_index(new_line, 0)
                    except:
                        pass
            else:
                # Default behavior for input area
                event.app.key_processor.feed_key(event.key_sequence[0])
                
        @self.kb.add('home')
        def _(event):
            """Go to beginning."""
            if self.focused_on_output and self.output_buffer:
                self.output_buffer.cursor_position = 0
            else:
                # Default behavior for input area
                event.app.key_processor.feed_key(event.key_sequence[0])
                
        @self.kb.add('end')
        def _(event):
            """Go to end."""
            if self.focused_on_output and self.output_buffer:
                self.output_buffer.cursor_position = len(self.output_buffer.text)
            else:
                # Default behavior for input area
                event.app.key_processor.feed_key(event.key_sequence[0])
                
    def setup_application(self) -> None:
        """Setup the prompt_toolkit application."""
        # Header
        header = Window(
            content=FormattedTextControl(
                text=HTML('<b>🤖 Todoist AI CLI - Test Evoluto</b> | <i>Escape: toggle focus | PageUp/Down: scroll | Ctrl+C: exit</i>')
            ),
            height=1,
            style='class:header'
        )
        
        # Separator
        separator = Window(
            content=FormattedTextControl(text='─' * 80),
            height=1,
            style='class:separator'
        )
        
        # Main layout
        layout = Layout(
            HSplit([
                header,
                self.output_area,
                separator,
                self.input_area,
            ])
        )
        
        # Style
        style = Style.from_dict({
            'header': 'bg:#2d2d2d fg:#ffffff bold',
            'separator': 'fg:#666666',
        })
        
        self.app = Application(
            layout=layout,
            key_bindings=self.kb,
            style=style,
            full_screen=True,
            mouse_support=True,
        )
        
    def get_prompt_text(self) -> HTML:
        """Get dynamic prompt text."""
        focus_indicator = ">" if not self.focused_on_output else "📖"
        return HTML(f'<b>{focus_indicator}</b> ')
        
    def refresh_output(self) -> None:
        """Refresh the output buffer with current messages."""
        if not self.output_buffer:
            return
            
        lines = []
        for msg in self.messages:
            timestamp = msg.get('timestamp', '')
            content = msg.get('content', '')
            lines.append(f"[{timestamp}] {content}")
            
        # Add some padding lines to test scrolling
        for i in range(10):
            lines.append(f"Linea di test {i+1} per verificare lo scrolling...")
            
        self.output_buffer.text = '\n'.join(lines)
        
        # Scroll to bottom
        if self.output_buffer.text:
            self.output_buffer.cursor_position = len(self.output_buffer.text)
            
    def add_output_line(self, text: str, style: str = "") -> None:
        """Add a new line to output."""
        timestamp = datetime.now().strftime("%H:%M")
        new_message = {
            "timestamp": timestamp,
            "content": text,
            "style": style
        }
        self.messages.append(new_message)
        
        # Keep only last 1000 messages
        if len(self.messages) > 1000:
            self.messages = self.messages[-1000:]
            
        self.refresh_output()
        
    def handle_input_accept(self, buffer: Buffer) -> bool:
        """Handle input submission."""
        user_input = buffer.text.strip()
        if not user_input:
            return True
            
        # Add user input to output
        self.add_output_line(f"Tu: {user_input}", "user")
        
        # Process commands
        if user_input.lower() in ['exit', 'quit', 'q']:
            self.app.exit()
            return True
        elif user_input.lower() == 'test':
            self.add_output_line("Test completato! Lo scrolling funziona?", "info")
        elif user_input.lower() == 'help':
            self.add_output_line("Comandi: test, help, exit", "info")
        else:
            self.add_output_line(f"Hai scritto: {user_input}", "response")
            
        # Clear input
        buffer.text = ""
        return True
        
    async def run(self) -> None:
        """Run the application."""
        if self.app:
            await self.app.run_async()


async def main():
    """Main function."""
    ui = TestAdvancedTerminalUI()
    await ui.run()


if __name__ == "__main__":
    asyncio.run(main())