#!/usr/bin/env python3
"""
Test script for session management commands.
This script tests the session management functionality without requiring API keys.
"""

import asyncio
import tempfile
import os
from pathlib import Path

# Add src to path
import sys
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.cli.commands import CommandProcessor
from src.config.settings import AppConfig
from rich.console import Console


async def test_session_commands():
    """Test the session management commands."""
    
    # Create a temporary directory for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create a minimal config for testing
        config = AppConfig()
        config.data_dir = Path(temp_dir)
        config.todoist.api_key = "test_key"  # Dummy key for testing
        config.claude.api_key = "test_key"  # Dummy key for testing
        
        console = Console()
        processor = CommandProcessor(config, console)
        
        print("🧪 Testing Session Management Commands\n")
        
        # Test help command
        print("1. Testing /help command:")
        await processor.cmd_help([])
        print()
        
        # Test new session
        print("2. Testing /new command:")
        await processor.cmd_new_session([])
        print()
        
        # Test current session
        print("3. Testing /current command:")
        await processor.cmd_current_session([])
        print()
        
        # Test save session
        print("4. Testing /save command:")
        await processor.cmd_save_session(["test_session"])
        print()
        
        # Test list sessions
        print("5. Testing /sessions command:")
        await processor.cmd_list_sessions([])
        print()
        
        # Test load session
        print("6. Testing /load command:")
        await processor.cmd_load_session(["test_session"])
        print()
        
        # Test conversation history
        print("7. Testing /history command:")
        await processor.cmd_conversation_history([])
        print()
        
        print("✅ All session management commands tested successfully!")


if __name__ == "__main__":
    asyncio.run(test_session_commands())