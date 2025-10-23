#!/usr/bin/env python3
"""
Debug script to check configuration loading.
"""

import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from config.settings import get_config


def debug_env_vars():
    """Debug environment variables."""
    print("🔍 Environment Variables Debug:")
    print(f"  Current working directory: {os.getcwd()}")
    print(f"  .env file exists: {Path('.env').exists()}")
    
    # Check specific environment variables
    env_vars = [
        "TODOIST_API_KEY",
        "CLAUDE_API_KEY", 
        "GEMINI_API_KEY",
        "DEFAULT_LLM"
    ]
    
    print(f"\n📋 Environment Variables:")
    for var in env_vars:
        value = os.getenv(var)
        if value:
            # Mask API keys for security
            if "API_KEY" in var:
                masked_value = value[:10] + "..." + value[-10:] if len(value) > 20 else "***"
                print(f"  {var}: {masked_value}")
            else:
                print(f"  {var}: {value}")
        else:
            print(f"  {var}: ❌ NOT SET")


def debug_config():
    """Debug configuration loading."""
    print(f"\n🔧 Configuration Debug:")
    
    try:
        config = get_config()
        
        print(f"  Todoist API Key: {'✅ SET' if config.todoist.api_key else '❌ NOT SET'}")
        print(f"  Claude API Key: {'✅ SET' if config.claude.api_key else '❌ NOT SET'}")
        print(f"  Gemini API Key: {'✅ SET' if config.gemini.api_key else '❌ NOT SET'}")
        print(f"  Default LLM: {config.default_llm}")
        
        # Show actual values (masked)
        if config.todoist.api_key:
            masked = config.todoist.api_key[:10] + "..." + config.todoist.api_key[-10:]
            print(f"  Todoist API Key value: {masked}")
        
        if config.claude.api_key:
            masked = config.claude.api_key[:10] + "..." + config.claude.api_key[-10:]
            print(f"  Claude API Key value: {masked}")
            
        if config.gemini.api_key:
            masked = config.gemini.api_key[:10] + "..." + config.gemini.api_key[-10:]
            print(f"  Gemini API Key value: {masked}")
        
    except Exception as e:
        print(f"  ❌ Error loading config: {e}")


def main():
    """Run debug checks."""
    print("🚀 Configuration Debug Script\n")
    
    debug_env_vars()
    debug_config()
    
    print(f"\n✅ Debug completed!")


if __name__ == "__main__":
    main()