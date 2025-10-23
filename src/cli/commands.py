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
from ..llm.manager import LLMManager, create_multi_provider_manager
from ..llm.base import LLMProvider, MessageRole
from ..todoist.service import TodoistService
from ..todoist.models import Priority
from ..markdown.context import ContextManager


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
        
        # Initialize LLM Manager
        self.llm_manager = self._initialize_llm_manager()
        
        # Initialize Todoist Service
        self.todoist_service = self._initialize_todoist_service()
        
        # Initialize Context Manager
        self.context_manager = ContextManager(max_context_items=10)
        
        # Command registry
        self.commands: Dict[str, Callable] = {
            "/help": self.cmd_help,
            "/tasks": self.cmd_tasks,
            "/add": self.cmd_add_task,
            "/complete": self.cmd_complete_task,
            "/today": self.cmd_today_tasks,
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
    
    async def initialize(self) -> None:
        """Initialize services asynchronously."""
        # Services are already initialized in __init__, this is for compatibility
        pass
    
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
            
            # Show loading indicator and process with LLM
            with self.ui_manager.show_loading("Processing with AI..."):
                try:
                    # Check if LLM is available
                    available_providers = self.llm_manager.get_available_providers()
                    if not available_providers:
                        response = "❌ No LLM providers configured. Please set up your API keys in the configuration."
                    else:
                        # Prepare context for AI
                        context_for_ai = self.context_manager.get_context_for_ai()
                        
                        # Combine message with context if available
                        if context_for_ai:
                            full_message = f"{context_for_ai}\n\nUser Message: {message}"
                        else:
                            full_message = message
                        
                        # Generate response using LLM
                        response = await self.llm_manager.chat(full_message)
                        
                except Exception as llm_error:
                    response = f"❌ Error communicating with AI: {str(llm_error)}\n\nPlease check your API keys and internet connection."
                
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
        """List tasks with optional filtering."""
        try:
            if not self.todoist_service:
                self.ui_manager.show_error("Todoist API not available. Please configure your API token.")
                return
            
            # Parse arguments for filtering
            project_name = None
            filter_expr = None
            
            if args:
                if args[0].startswith("project:"):
                    project_name = args[0].replace("project:", "")
                elif args[0].startswith("filter:"):
                    filter_expr = " ".join(args).replace("filter:", "")
                else:
                    # Default to project name
                    project_name = " ".join(args)
            
            with self.ui_manager.show_loading("Loading tasks..."):
                # Get tasks from Todoist
                if project_name:
                    tasks = self.todoist_service.get_tasks(project_name=project_name)
                elif filter_expr:
                    tasks = self.todoist_service.get_tasks(filter_expr=filter_expr)
                else:
                    tasks = self.todoist_service.get_tasks()
            
            # Convert to display format
            task_data = []
            for task in tasks:
                task_data.append({
                    "id": task.id,
                    "content": task.content,
                    "project_name": getattr(task, 'project_name', 'Unknown'),
                    "due": task.due.string if task.due else "No due date",
                    "priority": task.priority.value if task.priority else 1,
                    "labels": getattr(task, 'labels', [])
                })
            
            if task_data:
                title = f"Tasks ({len(task_data)} found)"
                if project_name:
                    title += f" in project '{project_name}'"
                elif filter_expr:
                    title += f" matching '{filter_expr}'"
                    
                self.ui_manager.render_task_table(task_data, title)
            else:
                self.ui_manager.show_info("No tasks found.")
                
        except Exception as e:
            self.ui_manager.show_error(f"Error loading tasks: {e}")
            # Fallback to sample data
            self.ui_manager.show_info("Showing sample data due to error.")
            sample_tasks = [
                {
                    "id": "123456789",
                    "content": "Complete project documentation",
                    "project_name": "Work",
                    "due": {"date": "2024-01-15"},
                    "priority": 1,
                    "labels": ["urgent", "documentation"]
                }
            ]
            self.ui_manager.render_task_table(sample_tasks, "Sample Tasks")
    
    async def cmd_add_task(self, args: List[str]) -> None:
        """Add a new task."""
        if not args:
            self.ui_manager.show_error("Please provide a task description.\nUsage: /add <task description>")
            return
        
        if not self.todoist_service:
            self.ui_manager.show_error("Todoist API not available. Please configure your API token.")
            return
        
        try:
            task_content = " ".join(args)
            
            with self.ui_manager.show_loading("Creating task..."):
                # Use natural language parsing for enhanced task creation
                task = self.todoist_service.create_task_from_natural_language(task_content)
            
            self.ui_manager.show_success(f"✅ Task created: {task.content}")
            
            # Show additional details if parsed
            details = []
            if task.due:
                details.append(f"Due: {task.due.string}")
            if task.priority and task.priority != Priority.NORMAL:
                details.append(f"Priority: {task.priority.value}")
            if hasattr(task, 'project_name') and task.project_name:
                details.append(f"Project: {task.project_name}")
            
            if details:
                self.ui_manager.show_info(f"Details: {', '.join(details)}")
                
        except Exception as e:
             self.ui_manager.show_error(f"Error creating task: {e}")
             self.ui_manager.show_info("Task creation failed. Please check your Todoist API connection.")
    
    async def cmd_complete_task(self, args: List[str]) -> None:
        """Complete a task by ID or search term."""
        if not args:
            self.ui_manager.show_error("Please provide a task ID or search term.")
            return
        
        if not self.todoist_service:
            self.ui_manager.show_error("Todoist API not available. Please configure your API token.")
            return
        
        try:
            search_term = " ".join(args)
            
            # If it looks like a task ID, try to complete directly
            if search_term.isdigit() or len(search_term) > 8:
                try:
                    with self.ui_manager.show_loading("Completing task..."):
                        success = self.todoist_service.complete_task(search_term)
                    
                    if success:
                        self.ui_manager.show_success(f"✅ Task completed!")
                        return
                except:
                    pass  # Fall through to search
            
            # Search for tasks matching the term
            with self.ui_manager.show_loading("Searching for tasks..."):
                tasks = self.todoist_service.search_tasks(search_term)
            
            if not tasks:
                self.ui_manager.show_error(f"No tasks found matching '{search_term}'")
                return
            
            if len(tasks) == 1:
                # Complete the single matching task
                task = tasks[0]
                with self.ui_manager.show_loading("Completing task..."):
                    success = self.todoist_service.complete_task(task.id)
                
                if success:
                    self.ui_manager.show_success(f"✅ Completed: {task.content}")
                else:
                    self.ui_manager.show_error("Failed to complete task")
            else:
                # Show multiple matches for user to choose
                self.ui_manager.show_info(f"Found {len(tasks)} matching tasks:")
                task_data = []
                for task in tasks[:5]:  # Show max 5 matches
                    task_data.append({
                        "id": task.id,
                        "content": task.content,
                        "project_name": getattr(task, 'project_name', 'Unknown'),
                        "due": task.due.string if task.due else "No due date",
                        "priority": task.priority.value if task.priority else 1,
                        "labels": getattr(task, 'labels', [])
                    })
                
                self.ui_manager.render_task_table(task_data, "Matching Tasks")
                self.ui_manager.show_info("Use '/complete <task_id>' to complete a specific task.")
                
        except Exception as e:
             self.ui_manager.show_error(f"Error completing task: {e}")
    
    async def cmd_today_tasks(self, args: List[str]) -> None:
        """Show today's tasks."""
        if not self.todoist_service:
            self.ui_manager.show_error("Todoist API not available. Please configure your API token.")
            return
        
        try:
            with self.ui_manager.show_loading("Loading today's tasks..."):
                tasks = self.todoist_service.get_today_tasks()
            
            if not tasks:
                self.ui_manager.show_info("🎉 No tasks for today! You're all caught up.")
                return
            
            # Convert tasks to display format
            task_data = []
            for task in tasks:
                task_data.append({
                    "id": task.id,
                    "content": task.content,
                    "project_name": getattr(task, 'project_name', 'Unknown'),
                    "due": task.due.string if task.due else "Today",
                    "priority": task.priority.value if task.priority else 1,
                    "labels": getattr(task, 'labels', [])
                })
            
            self.ui_manager.render_task_table(task_data, f"📅 Today's Tasks ({len(tasks)})")
            
        except Exception as e:
            self.ui_manager.show_error(f"Error loading today's tasks: {e}")
            # Fallback to sample data
            self.ui_manager.show_info("Showing sample data (Todoist API unavailable)")
            sample_tasks = [
                {
                    "id": "sample1",
                    "content": "Review project proposal",
                    "project_name": "Work",
                    "due": "Today",
                    "priority": 3,
                    "labels": ["urgent"]
                },
                {
                    "id": "sample2", 
                    "content": "Buy groceries",
                    "project_name": "Personal",
                    "due": "Today",
                    "priority": 1,
                    "labels": []
                }
            ]
            self.ui_manager.render_task_table(sample_tasks, "📅 Today's Tasks (Sample)")
    
    async def cmd_projects(self, args: List[str]) -> None:
        """List all projects."""
        try:
            if not self.todoist_service:
                self.ui_manager.show_error("Todoist API not available. Please configure your API token.")
                return
            
            with self.ui_manager.show_loading("Loading projects..."):
                projects = self.todoist_service.get_projects()
            
            # Convert to display format
            project_data = []
            for project in projects:
                # Get task count for each project
                try:
                    tasks = self.todoist_service.get_tasks(project_name=project.name)
                    task_count = len(tasks)
                except:
                    task_count = 0
                
                project_data.append({
                    "id": project.id,
                    "name": project.name,
                    "color": project.color.value if project.color else "default",
                    "task_count": task_count,
                    "is_favorite": getattr(project, 'is_favorite', False)
                })
            
            if project_data:
                self.ui_manager.render_project_tree(project_data)
            else:
                self.ui_manager.show_info("No projects found.")
                
        except Exception as e:
            self.ui_manager.show_error(f"Error loading projects: {e}")
            # Fallback to sample data
            self.ui_manager.show_info("Showing sample data due to error.")
            sample_projects = [
                {"id": "sample-1", "name": "Work", "color": "blue", "task_count": 0},
                {"id": "sample-2", "name": "Personal", "color": "green", "task_count": 0}
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
        
        file_path_str = args[0]
        
        try:
            from pathlib import Path
            
            # Convert to Path object
            file_path = Path(file_path_str)
            
            # Check if file exists
            if not file_path.exists():
                self.ui_manager.show_error(f"File not found: {file_path}")
                return
            
            # Check if it's a markdown file
            if file_path.suffix.lower() not in ['.md', '.markdown']:
                self.ui_manager.show_error("Only markdown files (.md, .markdown) are supported.")
                return
            
            # Show loading indicator
            with self.ui_manager.loading("Reading markdown file..."):
                # Add file to context manager
                success = self.context_manager.add_file(file_path)
            
            if success:
                # Get file details
                details = self.context_manager.get_file_details(file_path)
                
                if details:
                    self.ui_manager.show_success(f"✅ Added '{file_path.name}' to context")
                    
                    # Show file summary
                    self.console.print()
                    self.console.print(f"📄 [bold]{details['title']}[/bold]")
                    self.console.print(f"📊 {details['word_count']} words, ~{details['reading_time']} min read")
                    self.console.print(f"📑 {details['sections']} sections")
                    
                    if details['tags']:
                        self.console.print(f"🏷️  Tags: {', '.join(details['tags'])}")
                    
                    self.console.print()
                    self.console.print("📝 Summary:")
                    self.console.print(details['summary'])
                    
                    if details['key_points']:
                        self.console.print()
                        self.console.print("🔑 Key Points:")
                        for point in details['key_points'][:3]:  # Show first 3 key points
                            self.console.print(f"  • {point}")
                        
                        if len(details['key_points']) > 3:
                            self.console.print(f"  ... and {len(details['key_points']) - 3} more")
                else:
                    self.ui_manager.show_success(f"✅ Added '{file_path.name}' to context")
            else:
                self.ui_manager.show_error("Failed to parse markdown file.")
            
        except Exception as e:
            self.ui_manager.show_error(f"Failed to read file: {e}")
    
    async def cmd_show_context(self, args: List[str]) -> None:
        """Show current context."""
        # Check if we have any context
        if not self.context_manager.context_items:
            self.ui_manager.show_info("No context files loaded.")
            return
        
        # Show context summary
        summary = self.context_manager.get_context_summary()
        self.console.print(summary)
        
        # Show context stats
        stats = self.context_manager.get_context_stats()
        self.console.print()
        self.console.print("📊 [bold]Context Statistics:[/bold]")
        self.console.print(f"  • Total files: {stats['total_files']}")
        self.console.print(f"  • Total words: {stats['total_words']:,}")
        self.console.print(f"  • Total sections: {stats['total_sections']}")
        
        if stats['most_accessed']:
            self.console.print(f"  • Most accessed: {stats['most_accessed']['file']} ({stats['most_accessed']['count']} times)")
        
        if stats['recently_added']:
            self.console.print(f"  • Recently added: {stats['recently_added']['file']}")
        
        # Show available commands
        self.console.print()
        self.console.print("💡 [dim]Use /clear to clear context, or /read <file> to add more files[/dim]")
    
    async def cmd_clear_context(self, args: List[str]) -> None:
        """Clear current context."""
        files_count = len(self.context_manager.context_items)
        
        if files_count == 0:
            self.ui_manager.show_info("No context to clear.")
            return
        
        self.context_manager.clear_context()
        self.ui_manager.show_success(f"✅ Cleared {files_count} file(s) from context")
    
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
            session = self.session_service.create_session(
                name=f"auto_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                session_metadata={"auto_created": True}
            )
            self.current_session_id = session.session_id
    
    def _initialize_llm_manager(self) -> LLMManager:
        """Initialize the LLM Manager with configured providers."""
        try:
            # Get API keys from config
            claude_api_key = self.config.claude.api_key
            gemini_api_key = self.config.gemini.api_key
            
            # Determine default provider
            default_provider = None
            if self.config.default_llm == "claude" and claude_api_key:
                default_provider = LLMProvider.CLAUDE
            elif self.config.default_llm == "gemini" and gemini_api_key:
                default_provider = LLMProvider.GEMINI
            
            # Create manager with available providers
            manager = create_multi_provider_manager(
                claude_api_key=claude_api_key,
                gemini_api_key=gemini_api_key,
                default_provider=default_provider
            )
            
            # Set system prompt for Todoist AI CLI
            system_prompt = """You are an AI assistant integrated into a Todoist CLI application. 
You help users manage their tasks, projects, and productivity. You can:
- Analyze task lists and suggest improvements
- Help organize projects and priorities
- Provide productivity insights
- Answer questions about task management
- Suggest task breakdowns for complex projects

Be helpful, concise, and focused on productivity and task management."""
            
            manager.set_system_prompt(system_prompt)
            
            return manager
            
        except Exception as e:
            self.ui_manager.show_error(f"Failed to initialize LLM Manager: {e}")
            # Return a basic manager without providers
            return LLMManager()
    
    def _initialize_todoist_service(self) -> Optional[TodoistService]:
        """Initialize Todoist service with API token."""
        try:
            # Get Todoist API key from config
            api_key = self.config.todoist.api_key if self.config.todoist else None
            
            if not api_key:
                self.ui_manager.show_warning("Todoist API key not configured. Some features will be unavailable.")
                return None
            
            # Create and test Todoist service
            service = TodoistService(api_key)
            
            # Test connection
            if service.test_connection():
                self.ui_manager.show_success("✅ Todoist API connected successfully")
                return service
            else:
                self.ui_manager.show_error("❌ Failed to connect to Todoist API")
                return None
                
        except Exception as e:
            self.ui_manager.show_error(f"Error initializing Todoist service: {e}")
            return None
    
    async def cmd_show_config(self, args: List[str]) -> None:
        """Show current configuration."""
        # Get LLM provider status
        available_providers = self.llm_manager.get_available_providers()
        provider_status = []
        
        for provider in [LLMProvider.CLAUDE, LLMProvider.GEMINI]:
            if provider in available_providers:
                provider_status.append(f"✅ {provider.value}")
            else:
                provider_status.append(f"❌ {provider.value}")
        
        # Get Todoist status
        todoist_status = "✅ Connected" if self.todoist_service else "❌ Not configured"
        
        config_data = {
            "Default LLM": self.config.default_llm,
            "Available Providers": ", ".join(provider_status),
            "Todoist API": todoist_status,
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
        try:
            # Check if LLM is available
            available_providers = self.llm_manager.get_available_providers()
            if not available_providers:
                self.ui_manager.show_error("No LLM providers configured. Please set up your API keys.")
                return
            
            # Prepare context for suggestions
            context = "Based on typical productivity patterns, provide 4-5 actionable task management suggestions."
            if args:
                context += f" Focus on: {' '.join(args)}"
            
            with self.ui_manager.show_loading("Getting AI suggestions..."):
                response = await self.llm_manager.chat(context)
            
            self.console.print("🤖 AI Suggestions:", style=self.ui_manager.get_style("accent"))
            self.console.print(response, style=self.ui_manager.get_style("info"))
            
        except Exception as e:
            self.ui_manager.show_error(f"Error getting AI suggestions: {e}")
            # Fallback to static suggestions
            suggestions = [
                "Review and prioritize your overdue tasks",
                "Schedule time blocks for your high-priority items", 
                "Break down large tasks into smaller, manageable steps",
                "Set up recurring tasks for routine activities"
            ]
            
            self.console.print("🤖 Fallback Suggestions:", style=self.ui_manager.get_style("accent"))
            for i, suggestion in enumerate(suggestions, 1):
                self.console.print(f"  {i}. {suggestion}", style=self.ui_manager.get_style("info"))
    
    async def cmd_ai_organize(self, args: List[str]) -> None:
        """AI-powered task organization."""
        try:
            # Check if LLM is available
            available_providers = self.llm_manager.get_available_providers()
            if not available_providers:
                self.ui_manager.show_error("No LLM providers configured. Please set up your API keys.")
                return
            
            # Prepare context for organization
            context = """Help me organize my tasks and projects. Provide suggestions for:
1. Task prioritization strategies
2. Project grouping and categorization
3. Time management techniques
4. Workflow optimization"""
            
            if args:
                context += f"\n\nSpecific focus area: {' '.join(args)}"
            
            with self.ui_manager.show_loading("Analyzing task organization..."):
                response = await self.llm_manager.chat(context)
            
            self.console.print("🗂️ AI Organization Suggestions:", style=self.ui_manager.get_style("accent"))
            self.console.print(response, style=self.ui_manager.get_style("info"))
            
        except Exception as e:
            self.ui_manager.show_error(f"Error getting organization suggestions: {e}")
            self.ui_manager.show_info("AI task organization temporarily unavailable.")
    
    async def cmd_ai_analyze(self, args: List[str]) -> None:
        """AI-powered productivity analysis."""
        try:
            # Check if LLM is available
            available_providers = self.llm_manager.get_available_providers()
            if not available_providers:
                self.ui_manager.show_error("No LLM providers configured. Please set up your API keys.")
                return
            
            # Prepare context for analysis
            context = """Analyze my productivity patterns and provide insights on:
1. Task completion trends
2. Time management effectiveness
3. Project progress patterns
4. Areas for improvement
5. Productivity optimization recommendations"""
            
            if args:
                context += f"\n\nSpecific analysis focus: {' '.join(args)}"
            
            with self.ui_manager.show_loading("Analyzing productivity patterns..."):
                response = await self.llm_manager.chat(context)
            
            self.console.print("📊 AI Productivity Analysis:", style=self.ui_manager.get_style("accent"))
            self.console.print(response, style=self.ui_manager.get_style("info"))
            
        except Exception as e:
            self.ui_manager.show_error(f"Error performing productivity analysis: {e}")
            self.ui_manager.show_info("Productivity analysis temporarily unavailable.")