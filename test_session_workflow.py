#!/usr/bin/env python3
"""
Comprehensive test of the session management workflow.
This test demonstrates the complete session lifecycle.
"""

import asyncio
import tempfile
import os
from src.cli.commands import CommandProcessor
from src.config.settings import AppConfig

async def test_session_workflow():
    """Test the complete session management workflow."""
    
    # Create temporary directory for test
    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"🧪 Testing session workflow in: {temp_dir}")
        
        # Create minimal config
        config = AppConfig()
        config.todoist.api_key = "test_key"
        config.claude.api_key = "test_key"
        
        # Create command processor
        from rich.console import Console
        console = Console()
        processor = CommandProcessor(config, console)
        
        # Override database path to use temp directory
        db_path = os.path.join(temp_dir, "test_sessions.db")
        processor.session_service.database_url = f"sqlite:///{db_path}"
        
        print("\n" + "="*60)
        print("🚀 STARTING SESSION WORKFLOW TEST")
        print("="*60)
        
        # 1. Create a new session
        print("\n1️⃣  Creating new session...")
        await processor.process_command("/new my_test_session")
        
        # 2. Show current session
        print("\n2️⃣  Showing current session...")
        await processor.process_command("/current")
        
        # 3. Add some mock conversation
        print("\n3️⃣  Adding mock conversation...")
        await processor.process_ai_message("Hello, this is a test message")
        
        # 4. Save the session
        print("\n4️⃣  Saving session...")
        await processor.process_command("/save my_saved_session")
        
        # 5. Create another session
        print("\n5️⃣  Creating second session...")
        await processor.process_command("/new another_session")
        
        # 6. Add conversation to second session
        print("\n6️⃣  Adding conversation to second session...")
        await processor.process_ai_message("This is the second session")
        
        # 7. List all sessions
        print("\n7️⃣  Listing all sessions...")
        await processor.process_command("/sessions")
        
        # 8. Load the first session
        print("\n8️⃣  Loading first session...")
        await processor.process_command("/load my_saved_session")
        
        # 9. Show conversation history
        print("\n9️⃣  Showing conversation history...")
        await processor.process_command("/history")
        
        # 10. Show current session again
        print("\n🔟 Showing current session after load...")
        await processor.process_command("/current")
        
        print("\n" + "="*60)
        print("✅ SESSION WORKFLOW TEST COMPLETED SUCCESSFULLY!")
        print("="*60)

if __name__ == "__main__":
    asyncio.run(test_session_workflow())