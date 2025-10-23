#!/usr/bin/env python3
"""
Test script per verificare l'integrazione completa di Todoist API
"""

import asyncio
import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.config.settings import get_config
from src.cli.commands import CommandProcessor
from rich.console import Console

async def test_todoist_integration():
    """Test completo dell'integrazione Todoist"""
    
    print("🧪 Testing Todoist Integration...")
    
    # Load configuration
    config = get_config()
    console = Console()
    
    # Create command processor
    processor = CommandProcessor(config, console)
    
    # Test cases
    test_cases = [
        ("Configuration display", "/config"),
        ("Task listing", "/tasks"),
        ("Today's tasks", "/today"),
        ("Project listing", "/projects"),
        ("Help menu", "/help"),
        ("Add task test", "/add Buy groceries for dinner tonight"),
        ("Complete task search", "/complete groceries"),
    ]
    
    for test_name, command in test_cases:
        print(f"\n📋 Testing {test_name}...")
        print(f"Command: {command}")
        print("-" * 50)
        
        try:
            await processor.process_command(command)
            print(f"✅ {test_name} completed successfully")
        except Exception as e:
            print(f"❌ {test_name} failed: {e}")
        
        print()
    
    print("🎯 Todoist integration test completed!")
    print("\n💡 Note: If you see 'API not available' errors, set TODOIST_API_TOKEN in your .env file")

if __name__ == "__main__":
    asyncio.run(test_todoist_integration())