#!/usr/bin/env python3
"""
Test script for LLM integration in Todoist AI CLI.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from rich.console import Console
from src.config.settings import AppConfig
from src.cli.commands import CommandProcessor


async def test_llm_integration():
    """Test the LLM integration."""
    console = Console()
    
    # Create config
    config = AppConfig()
    config.create_directories()
    
    # Initialize command processor
    processor = CommandProcessor(config, console)
    
    console.print("[bold blue]Testing LLM Integration[/bold blue]")
    console.print("=" * 50)
    
    # Test 1: Check configuration
    console.print("\n[yellow]1. Testing configuration display...[/yellow]")
    await processor.cmd_show_config([])
    
    # Test 2: Test AI chat (will show error if no API keys)
    console.print("\n[yellow]2. Testing AI chat...[/yellow]")
    await processor.process_ai_message("Hello, can you help me with task management?")
    
    # Test 3: Test AI suggestions
    console.print("\n[yellow]3. Testing AI suggestions...[/yellow]")
    await processor.cmd_ai_suggest([])
    
    # Test 4: Test AI organize
    console.print("\n[yellow]4. Testing AI organize...[/yellow]")
    await processor.cmd_ai_organize(["productivity"])
    
    # Test 5: Test AI analyze
    console.print("\n[yellow]5. Testing AI analyze...[/yellow]")
    await processor.cmd_ai_analyze(["weekly"])
    
    console.print("\n[bold green]✅ LLM Integration test completed![/bold green]")
    console.print("\n[dim]Note: If you see error messages about API keys, that's expected.")
    console.print("[dim]Set CLAUDE_API_KEY or GEMINI_API_KEY environment variables to test with real AI.[/dim]")


if __name__ == "__main__":
    asyncio.run(test_llm_integration())