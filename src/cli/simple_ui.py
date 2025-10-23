"""
Simple CLI interface with clean layout:
- Fixed header at top
- Scrollable output area in middle  
- Fixed input at bottom
"""

import asyncio
from datetime import datetime
from typing import List

from prompt_toolkit import Application
from prompt_toolkit.buffer import Buffer
from prompt_toolkit.key_binding import KeyBindings
from prompt_toolkit.layout.containers import HSplit, Window
from prompt_toolkit.layout.controls import BufferControl, FormattedTextControl
from prompt_toolkit.layout.layout import Layout
from prompt_toolkit.widgets import TextArea
from prompt_toolkit.formatted_text import HTML


class SimpleCLI:
    def __init__(self):
        self.output_buffer = Buffer(read_only=True, multiline=True)
        self.setup_layout()
        self.setup_key_bindings()
        
    def setup_layout(self):
        """Setup the simple 3-section layout"""
        
        # Header fisso
        header = Window(
            content=FormattedTextControl(
                text=HTML('<b>🤖 Simple Todoist CLI</b> | Press Ctrl+C to exit | Type "help" for commands')
            ),
            height=1,
            style="class:header"
        )
        
        # Area di output scrollabile
        output_area = Window(
            content=BufferControl(buffer=self.output_buffer),
            wrap_lines=True,
            style="class:output"
        )
        
        # Input fisso in basso
        input_area = TextArea(
            height=1,
            prompt="❯ ",
            style="class:input",
            wrap_lines=False,
            accept_handler=self.handle_input
        )
        
        # Layout principale
        self.layout = Layout(
            HSplit([
                header,
                output_area,
                input_area
            ])
        )
        
    def setup_key_bindings(self):
        """Setup key bindings"""
        kb = KeyBindings()
        
        @kb.add('c-c')
        def _(event):
            """Exit on Ctrl+C"""
            event.app.exit()
            
        self.key_bindings = kb
        
    def handle_input(self, buffer):
        """Gestisce l'input dell'utente"""
        text = buffer.text.strip()
        if text:
            # Aggiungi il comando all'output
            self.add_output(f"❯ {text}")
            
            # Processa il comando
            if text.lower() in ['exit', 'quit']:
                self.app.exit()
            elif text.lower() == 'clear':
                self.output_buffer.text = ""
            elif text.lower() == 'help':
                self.add_output("Comandi disponibili:")
                self.add_output("  help  - Mostra questo aiuto")
                self.add_output("  clear - Pulisce l'output")
                self.add_output("  exit  - Esce dall'applicazione")
            else:
                self.add_output(f"Comando ricevuto: {text}")
                self.add_output("Usa 'help' per vedere i comandi disponibili")
        
        # Pulisci l'input
        buffer.text = ""
        
    def add_output(self, text: str):
        """Add text to output buffer"""
        if self.output_buffer.text:
            self.output_buffer.text += '\n' + text
        else:
            self.output_buffer.text = text
            
        # Mantieni solo le ultime 100 righe per performance
        lines = self.output_buffer.text.split('\n')
        if len(lines) > 100:
            self.output_buffer.text = '\n'.join(lines[-100:])
            
        # Scroll automatico alla fine
        self.output_buffer.cursor_position = len(self.output_buffer.text)
        
    def run(self):
        """Run the application"""
        # Welcome message
        self.add_output("🎯 Welcome to Simple Todoist CLI!")
        self.add_output("Type 'help' to see available commands.")
        self.add_output("")
        
        # Create application
        self.app = Application(
            layout=self.layout,
            key_bindings=self.key_bindings,
            full_screen=True,
            mouse_support=True
        )
        
        # Run application
        self.app.run()


if __name__ == "__main__":
    cli = SimpleCLI()
    cli.run()