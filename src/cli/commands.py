"""
Command processor for handling slash commands and AI interactions.
"""

import asyncio
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime
import shlex
import os

from rich.console import Console

from ..config.settings import AppConfig
from .ui import UIManager
from ..session.service import SessionService


class CommandProcessor:
    """Processes slash commands and AI interactions."""
    
    def __init__(self, config: AppConfig, console: Console):
        self.config = config
        self.console = console
        self.ui_manager = UIManager(console, config)
        
        # Initialize session service
        db_path = config.data_dir / "sessions.db"
        database_url = f"sqlite:///{db_path}"
        self.session_service = SessionService(database_url)
        self.current_session_id: Optional[str] = None
        self.context_data: Dict[str, Any] = {}
        
        # Command registry
        self.commands: Dict[str, Callable] = {
            "/help": self.cmd_help,
            "/tasks": self.cmd_tasks,
            "/add": self.cmd_add_task,
            "/projects": self.cmd_projects,
            "/labels": self.cmd_labels,
            "/today": self.cmd_today,
            "/upcoming": self.cmd_upcoming,
            "/overdue": self.cmd_overdue,
            "/completed": self.cmd_completed,
            "/read": self.cmd_read_file,
            "/context": self.cmd_show_context,
            "/clear": self.cmd_clear_context,
            "/save": self.cmd_save_session,
            "/load": self.cmd_load_session,
            "/sessions": self.cmd_list_sessions,
            "/new": self.cmd_new_session,
            "/current": self.cmd_current_session,
            "/history": self.cmd_conversation_history,
            "/config": self.cmd_show_config,
            "/status": self.cmd_show_status,
            "/stats": self.cmd_show_stats,
            "/export": self.cmd_export_data,
            "/ai": self.cmd_ai_chat,
            "/suggest": self.cmd_ai_suggest,
            "/organize": self.cmd_ai_organize,
            "/analyze": self.cmd_ai_analyze
        }
        
        # Context storage
        self.context_data: List[str] = []
        self.session_data: Dict[str, Any] = {}
    
    async def process_command(self, command_line: str) -> None:
        """Process a slash command."""
        try:
            # Parse command and arguments
            parts = shlex.split(command_line)
            command = parts[0].lower()
            args = parts[1:] if len(parts) > 1 else []
            
            # Find and execute command
            if command in self.commands:
                await self.commands[command](args)
            else:
                self.ui_manager.show_error(
                    f"Unknown command: {command}\nType /help for available commands."
                )
        
        except Exception as e:
            self.ui_manager.show_error(f"Error executing command: {e}")
    
    async def process_ai_message(self, message: str) -> None:
        """Process a natural language message with AI."""
        try:
            # Ensure we have a current session
            if not self.current_session_id:
                await self._ensure_current_session()
            
            # Add user message to session
            if self.current_session_id:
                await self.session_service.add_message(
                    session_id=self.current_session_id,
                    role="user",
                    content=message,
                    message_metadata={"timestamp": datetime.now().isoformat()}
                )
            
            # Add to context
            self.context_data.append({
                "type": "user_message",
                "content": message,
                "timestamp": datetime.now().isoformat()
            })
            
            # Show loading indicator
            with self.ui_manager.show_loading("Processing with AI..."):
                await asyncio.sleep(0.5)  # Simulate processing
                
                # TODO: Integrate with actual LLM
                response = f"AI Response to: '{message}'\n\nThis is a placeholder response. The actual LLM integration will be implemented in the next phase."
                
            self.ui_manager.render_ai_response(response)
            
            # Add AI response to session
            if self.current_session_id:
                await self.session_service.add_message(
                    session_id=self.current_session_id,
                    role="assistant",
                    content=response,
                    message_metadata={"timestamp": datetime.now().isoformat()}
                )
            
        except Exception as e:
            self.ui_manager.show_error(f"Error processing AI message: {e}")
    
    # Command implementations
    async def cmd_help(self, args: List[str]) -> None:
        """Show help menu."""
        self.ui_manager.render_help_menu()
    
    async def cmd_tasks(self, args: List[str]) -> None:
        """List tasks."""
        # TODO: Integrate with Todoist API
        sample_tasks = [
            {
                "id": "123456789",
                "content": "Complete project documentation",
                "project_name": "Work",
                "due": {"date": "2024-01-15"},
                "priority": 1,
                "labels": ["urgent", "documentation"]
            },
            {
                "id": "987654321", 
                "content": "Buy groceries for the week",
                "project_name": "Personal",
                "due": {"date": "2024-01-14"},
                "priority": 3,
                "labels": ["shopping"]
            }
        ]
        
        self.ui_manager.render_task_table(sample_tasks, "All Tasks")
    
    async def cmd_add_task(self, args: List[str]) -> None:
        """Add a new task."""
        if not args:
            self.ui_manager.show_error("Please provide a task description.\nUsage: /add <task description>")
            return
        
        task_content = " ".join(args)
        
        # TODO: Integrate with Todoist API
        self.ui_manager.show_success(f"Task added: '{task_content}'")
    
    async def cmd_projects(self, args: List[str]) -> None:
        """List projects."""
        # TODO: Integrate with Todoist API
        sample_projects = [
            {
                "name": "Work",
                "comment_count": 15,
                "url": "https://todoist.com/showProject?id=123"
            },
            {
                "name": "Personal",
                "comment_count": 8,
                "url": "https://todoist.com/showProject?id=456"
            }
        ]
        
        self.ui_manager.render_project_tree(sample_projects)
    
    async def cmd_labels(self, args: List[str]) -> None:
        """List labels."""
        # TODO: Integrate with Todoist API
        labels = ["urgent", "work", "personal", "shopping", "documentation", "meeting"]
        
        self.console.print("🏷️  Available Labels:")
        for label in labels:
            self.console.print(f"  • {label}", style=self.ui_manager.get_style("info"))
    
    async def cmd_today(self, args: List[str]) -> None:
        """Show today's tasks."""
        # TODO: Filter tasks for today
        await self.cmd_tasks(args)
    
    async def cmd_upcoming(self, args: List[str]) -> None:
        """Show upcoming tasks."""
        # TODO: Filter tasks for upcoming dates
        await self.cmd_tasks(args)
    
    async def cmd_overdue(self, args: List[str]) -> None:
        """Show overdue tasks."""
        # TODO: Filter overdue tasks
        self.ui_manager.show_info("No overdue tasks found!")
    
    async def cmd_completed(self, args: List[str]) -> None:
        """Show completed tasks."""
        # TODO: Get completed tasks
        self.ui_manager.show_info("No completed tasks in recent history.")
    
    async def cmd_read_file(self, args: List[str]) -> None:
        """Read a markdown file for context."""
        if not args:
            self.ui_manager.show_error("Please provide a file path.\nUsage: /read <file_path>")
            return
        
        file_path = args[0]
        
        try:
            # TODO: Implement markdown file reading
            self.context_data.append(f"File: {file_path}")
            self.ui_manager.show_success(f"Added '{file_path}' to context")
            
        except Exception as e:
            self.ui_manager.show_error(f"Failed to read file: {e}")
    
    async def cmd_show_context(self, args: List[str]) -> None:
        """Show current context."""
        if not self.context_data:
            self.ui_manager.show_info("No context data available.")
            return
        
        context_text = "\n".join(self.context_data)
        self.ui_manager.show_info(f"Current Context:\n{context_text}")
    
    async def cmd_clear_context(self, args: List[str]) -> None:
        """Clear current context."""
        self.context_data.clear()
        self.ui_manager.show_success("Context cleared")
    
    async def cmd_save_session(self, args: List[str]) -> None:
        """Save current session."""
        try:
            if not self.current_session_id:
                self.ui_manager.show_error("No active session to save")
                return
            
            session_name = args[0] if args else f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Update session with the provided name
            self.session_service.update_session(
                session_id=self.current_session_id,
                session_metadata={"name": session_name, "saved_at": datetime.now().isoformat()}
            )
            
            self.ui_manager.show_success(f"Session saved as '{session_name}'")
            
        except Exception as e:
            self.ui_manager.show_error(f"Error saving session: {str(e)}")
    
    async def cmd_load_session(self, args: List[str]) -> None:
        """Load a previous session."""
        try:
            if not args:
                self.ui_manager.show_error("Please provide a session name.\nUsage: /load <session_name>")
                return
            
            session_name = args[0]
            
            # Find session by name in metadata
            sessions = self.session_service.get_sessions()
            target_session = None
            
            for session in sessions:
                if session.session_metadata and session.session_metadata.get("name") == session_name:
                    target_session = session
                    break
            
            if not target_session:
                self.ui_manager.show_error(f"Session '{session_name}' not found")
                return
            
            # Set as current session
            self.session_service.set_current_session(target_session.id)
            self.current_session_id = target_session.id
            
            # Load conversation history
            messages = self.session_service.get_conversation_history(target_session.id)
            
            self.ui_manager.show_success(f"Session '{session_name}' loaded with {len(messages)} messages")
            
            # Display recent conversation
            if messages:
                self.console.print("\n[bold blue]Recent conversation:[/bold blue]")
                for msg in messages[-5:]:  # Show last 5 messages
                    role_color = "green" if msg.role == "user" else "cyan"
                    self.console.print(f"[{role_color}]{msg.role}:[/{role_color}] {msg.content[:100]}...")
                
        except Exception as e:
            self.ui_manager.show_error(f"Error loading session: {str(e)}")
    
    async def cmd_list_sessions(self, args: List[str]) -> None:
        """List all saved sessions."""
        try:
            sessions = self.session_service.get_sessions()
            
            if not sessions:
                self.ui_manager.show_info("No saved sessions found")
                return
            
            self.console.print("\n[bold blue]Saved Sessions:[/bold blue]")
            for session in sessions:
                name = session.session_metadata.get("name", "Unnamed") if session.session_metadata else "Unnamed"
                created = session.created_at.strftime("%Y-%m-%d %H:%M")
                current_marker = " [green](current)[/green]" if session.id == self.current_session_id else ""
                self.console.print(f"• {name} - Created: {created}{current_marker}")
                
        except Exception as e:
            self.ui_manager.show_error(f"Error listing sessions: {str(e)}")
    
    async def cmd_new_session(self, args: List[str]) -> None:
        """Create a new session."""
        try:
            session_name = args[0] if args else f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            session = self.session_service.create_session(
                name=session_name,
                session_metadata={"created_via": "command"},
                set_as_current=True
            )
            
            # Sync with SessionService's current session
            self.current_session_id = session.id
            
            self.ui_manager.show_success(f"New session '{session_name}' created and activated")
            
        except Exception as e:
            self.ui_manager.show_error(f"Error creating new session: {str(e)}")
    
    async def cmd_current_session(self, args: List[str]) -> None:
        """Show current session information."""
        try:
            if not self.current_session_id:
                self.ui_manager.show_info("No active session")
                return
            
            session = self.session_service.get_session(self.current_session_id)
            if not session:
                self.ui_manager.show_error("Current session not found")
                return
            
            name = session.session_metadata.get("name", "Unnamed") if session.session_metadata else "Unnamed"
            created = session.created_at.strftime("%Y-%m-%d %H:%M:%S")
            
            # Get session stats
            messages = self.session_service.get_conversation_history(self.current_session_id)
            contexts = self.session_service.get_contexts(self.current_session_id)
            
            self.console.print(f"\n[bold blue]Current Session:[/bold blue]")
            self.console.print(f"Name: {name}")
            self.console.print(f"ID: {self.current_session_id}")
            self.console.print(f"Created: {created}")
            self.console.print(f"Messages: {len(messages)}")
            self.console.print(f"Contexts: {len(contexts)}")
            
        except Exception as e:
            self.ui_manager.show_error(f"Error getting current session: {str(e)}")
    
    async def cmd_conversation_history(self, args: List[str]) -> None:
        """Show conversation history for current session."""
        try:
            if not self.current_session_id:
                self.ui_manager.show_error("No active session")
                return
            
            limit = int(args[0]) if args and args[0].isdigit() else 10
            messages = self.session_service.get_conversation_history(self.current_session_id, limit=limit)
            
            if not messages:
                self.ui_manager.show_info("No conversation history found")
                return
            
            self.console.print(f"\n[bold blue]Conversation History (last {len(messages)} messages):[/bold blue]")
            for msg in messages:
                role_color = "green" if msg.role == "user" else "cyan"
                timestamp = msg.created_at.strftime("%H:%M:%S")
                self.console.print(f"[dim]{timestamp}[/dim] [{role_color}]{msg.role}:[/{role_color}] {msg.content}")
                
        except Exception as e:
            self.ui_manager.show_error(f"Error getting conversation history: {str(e)}")
    
    async def _ensure_current_session(self) -> None:
        """Ensure there's a current session, create one if needed."""
        if not self.current_session_id:
            session = await self.session_service.create_session(
                session_metadata={"name": f"auto_{datetime.now().strftime('%Y%m%d_%H%M%S')}", "auto_created": True}
            )
            self.current_session_id = session.session_id
    
    async def cmd_show_config(self, args: List[str]) -> None:
        """Show current configuration."""
        config_data = {
            "LLM Provider": self.config.default_llm,
            "Theme": self.config.ui.theme,
            "Auto-complete": self.config.ui.auto_complete,
            "Auto-save": self.config.session_autosave,
            "Data Directory": str(self.config.data_dir)
        }
        
        self.ui_manager.render_status_dashboard({"config": config_data})
    
    async def cmd_show_status(self, args: List[str]) -> None:
        """Show system status."""
        status_data = {
            "config": {
                "LLM Provider": self.config.default_llm,
                "Theme": self.config.ui.theme,
                "Auto-save": self.config.session_autosave
            },
            "api": {
                "Todoist": "connected",  # TODO: Check actual status
                "Claude": "connected" if self.config.default_llm == "claude" else "not configured",
                "Gemini": "connected" if self.config.default_llm == "gemini" else "not configured"
            },
            "session": {
                "Context items": len(self.context_data),
                "Session data": len(self.session_data),
                "Uptime": "Active"
            }
        }
        
        self.ui_manager.render_status_dashboard(status_data)
    
    async def cmd_show_stats(self, args: List[str]) -> None:
        """Show session statistics."""
        # TODO: Implement detailed statistics
        self.ui_manager.show_info("Session statistics will be implemented in the next phase.")
    
    async def cmd_export_data(self, args: List[str]) -> None:
        """Export data."""
        # TODO: Implement data export
        self.ui_manager.show_info("Data export functionality will be implemented in the next phase.")
    
    async def cmd_ai_chat(self, args: List[str]) -> None:
        """Chat with AI assistant."""
        if not args:
            self.ui_manager.show_error("Please provide a message.\nUsage: /ai <your message>")
            return
        
        message = " ".join(args)
        await self.process_ai_message(message)
    
    async def cmd_ai_suggest(self, args: List[str]) -> None:
        """Get AI task suggestions."""
        # TODO: Implement AI suggestions
        suggestions = [
            "Review and prioritize your overdue tasks",
            "Schedule time blocks for your high-priority items",
            "Break down large tasks into smaller, manageable steps",
            "Set up recurring tasks for routine activities"
        ]
        
        self.console.print("🤖 AI Suggestions:", style=self.ui_manager.get_style("accent"))
        for i, suggestion in enumerate(suggestions, 1):
            self.console.print(f"  {i}. {suggestion}", style=self.ui_manager.get_style("info"))
    
    async def cmd_ai_organize(self, args: List[str]) -> None:
        """AI-powered task organization."""
        # TODO: Implement AI organization
        self.ui_manager.show_info("AI task organization will be implemented in the next phase.")
    
    async def cmd_ai_analyze(self, args: List[str]) -> None:
        """Productivity analysis."""
        # TODO: Implement productivity analysis
        self.ui_manager.show_info("Productivity analysis will be implemented in the next phase.")