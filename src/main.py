#!/usr/bin/env python3
"""
Main entry point for Todoist AI CLI.
"""

import sys
import os
import asyncio
from pathlib import Path

# Add src directory to Python path for development
src_dir = Path(__file__).parent
sys.path.insert(0, str(src_dir))

# Add project root to Python path
project_root = src_dir.parent
sys.path.insert(0, str(project_root))

from src.cli.app import TodoistAICLI


def main():
    """Main entry point for the CLI application."""
    try:
        cli = TodoistAICLI()
        asyncio.run(cli.run())
    except KeyboardInterrupt:
        print("\n👋 Arrivederci!")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Errore critico: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()