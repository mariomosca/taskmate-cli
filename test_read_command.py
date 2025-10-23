#!/usr/bin/env python3
"""
Test script per il comando /read del markdown parser
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.config.settings import get_config
from src.cli.commands import CommandProcessor
from src.cli.ui import UIManager
from rich.console import Console

def test_read_command():
    """Test del comando /read"""
    print("🧪 Testing /read command...")
    
    # Inizializza configurazione
    config = get_config()
    console = Console()
    ui_manager = UIManager(console)
    
    # Crea processor dei comandi
    processor = CommandProcessor(config, ui_manager)
    
    # Test del comando /read
    print("\n📖 Testing /read test_document.md")
    processor.cmd_read_file("test_document.md")
    
    print("\n✅ Test completed!")

if __name__ == "__main__":
    test_read_command()