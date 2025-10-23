"""
UI Manager for rich console output and formatting.
"""

from typing import List, Dict, Any, Optional, Union
from datetime import datetime, date
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.markdown import Markdown
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Prompt, Confirm
from rich.tree import Tree
from rich.columns import Columns
from rich.align import Align
from rich.layout import Layout
from rich.live import Live

from ..config.settings import AppConfig


class UIManager:
    """Manages all UI rendering and formatting."""
    
    def __init__(self, console: Console, config: AppConfig):
        self.console = console
        self.config = config
        self.theme = config.ui.theme
    
    def get_style(self, element: str) -> str:
        """Get style for UI element based on theme."""
        styles = {
            "dark": {
                "primary": "bright_blue",
                "secondary": "bright_cyan", 
                "success": "bright_green",
                "warning": "bright_yellow",
                "error": "bright_red",
                "info": "bright_white",
                "dim": "dim white",
                "accent": "bright_magenta"
            },
            "light": {
                "primary": "blue",
                "secondary": "cyan",
                "success": "green", 
                "warning": "yellow",
                "error": "red",
                "info": "black",
                "dim": "dim black",
                "accent": "magenta"
            }
        }
        return styles.get(self.theme, styles["dark"]).get(element, "white")
    
    def show_error(self, message: str, title: str = "Error") -> None:
        """Display error message."""
        self.console.print(
            Panel(
                f"❌ {message}",
                title=title,
                border_style=self.get_style("error"),
                title_align="left"
            )
        )
    
    def show_success(self, message: str, title: str = "Success") -> None:
        """Display success message."""
        self.console.print(
            Panel(
                f"✅ {message}",
                title=title,
                border_style=self.get_style("success"),
                title_align="left"
            )
        )
    
    def show_warning(self, message: str, title: str = "Warning") -> None:
        """Display warning message."""
        self.console.print(
            Panel(
                f"⚠️  {message}",
                title=title,
                border_style=self.get_style("warning"),
                title_align="left"
            )
        )
    
    def show_info(self, message: str, title: str = "Info") -> None:
        """Display info message."""
        self.console.print(
            Panel(
                f"ℹ️  {message}",
                title=title,
                border_style=self.get_style("info"),
                title_align="left"
            )
        )
    
    def show_loading(self, message: str = "Loading...") -> Progress:
        """Show loading spinner."""
        progress = Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=self.console,
            transient=True
        )
        progress.add_task(description=message, total=None)
        return progress
    
    def render_task_table(self, tasks: List[Dict[str, Any]], title: str = "Tasks") -> None:
        """Render tasks in a formatted table."""
        if not tasks:
            self.show_info("No tasks found")
            return
        
        table = Table(title=title, show_header=True, header_style=self.get_style("primary"))
        table.add_column("ID", style=self.get_style("dim"), width=8)
        table.add_column("Task", style=self.get_style("info"), min_width=30)
        table.add_column("Project", style=self.get_style("secondary"), width=15)
        table.add_column("Due", style=self.get_style("warning"), width=12)
        table.add_column("Priority", style=self.get_style("accent"), width=8)
        table.add_column("Labels", style=self.get_style("dim"), width=15)
        
        for task in tasks:
            # Format due date
            due_date = ""
            if task.get("due"):
                if isinstance(task["due"], dict) and "date" in task["due"]:
                    due_date = task["due"]["date"]
                elif isinstance(task["due"], str):
                    due_date = task["due"]
            
            # Format priority
            priority_map = {1: "🔴 P1", 2: "🟡 P2", 3: "🔵 P3", 4: "⚪ P4"}
            priority = priority_map.get(task.get("priority", 4), "⚪ P4")
            
            # Format labels
            labels = ", ".join(task.get("labels", []))[:15] + ("..." if len(", ".join(task.get("labels", []))) > 15 else "")
            
            table.add_row(
                str(task.get("id", "")),
                task.get("content", "")[:50] + ("..." if len(task.get("content", "")) > 50 else ""),
                task.get("project_name", "Inbox")[:15],
                due_date,
                priority,
                labels
            )
        
        self.console.print(table)
    
    def render_project_tree(self, projects: List[Dict[str, Any]]) -> None:
        """Render projects in a tree structure."""
        if not projects:
            self.show_info("No projects found")
            return
        
        tree = Tree("📁 Projects", style=self.get_style("primary"))
        
        for project in projects:
            project_name = project.get("name", "Unknown")
            task_count = project.get("comment_count", 0)
            
            project_node = tree.add(
                f"[{self.get_style('info')}]{project_name}[/] "
                f"[{self.get_style('dim')}]({task_count} tasks)[/]"
            )
            
            # Add project details if available
            if project.get("url"):
                project_node.add(f"🔗 [link]{project['url']}[/link]")
        
        self.console.print(tree)
    
    def render_ai_response(self, response: str, title: str = "AI Assistant") -> None:
        """Render AI response with markdown formatting."""
        markdown = Markdown(response)
        
        self.console.print(
            Panel(
                markdown,
                title=f"🤖 {title}",
                border_style=self.get_style("accent"),
                title_align="left",
                padding=(1, 2)
            )
        )
    
    def render_help_menu(self) -> None:
        """Render the help menu with available commands."""
        help_content = Text()
        
        # Header
        help_content.append("🎯 Todoist AI CLI - Available Commands\n\n", style=f"bold {self.get_style('primary')}")
        
        # Command categories
        categories = {
            "📋 Task Management": [
                ("/tasks", "List all tasks"),
                ("/add <task>", "Add a new task"),
                ("/today", "Show today's tasks"),
                ("/upcoming", "Show upcoming tasks"),
                ("/overdue", "Show overdue tasks"),
                ("/completed", "Show completed tasks")
            ],
            "📁 Project Management": [
                ("/projects", "List all projects"),
                ("/labels", "List all labels")
            ],
            "🤖 AI Features": [
                ("/ai <message>", "Chat with AI assistant"),
                ("/suggest", "Get AI task suggestions"),
                ("/organize", "AI-powered task organization"),
                ("/analyze", "Productivity analysis")
            ],
            "📄 Context & Files": [
                ("/read <file>", "Read markdown file for context"),
                ("/context", "Show current context"),
                ("/clear", "Clear context")
            ],
            "💾 Session Management": [
                ("/save <name>", "Save current session with name"),
                ("/load <name>", "Load session by name"),
                ("/sessions", "List all saved sessions"),
                ("/new", "Start a new session"),
                ("/current", "Show current session info"),
                ("/history", "Show conversation history"),
                ("/stats", "Show session statistics")
            ],
            "⚙️ Configuration": [
                ("/config", "Show configuration"),
                ("/status", "Show system status"),
                ("/export", "Export data")
            ],
            "🚪 General": [
                ("/help", "Show this help menu"),
                ("exit/quit", "Exit the application")
            ]
        }
        
        for category, commands in categories.items():
            help_content.append(f"{category}\n", style=f"bold {self.get_style('secondary')}")
            for cmd, desc in commands:
                help_content.append(f"  {cmd:<20} {desc}\n", style=self.get_style("info"))
            help_content.append("\n")
        
        # Footer
        help_content.append("💡 Tips:\n", style=f"bold {self.get_style('accent')}")
        help_content.append("  • Use Tab for command completion\n", style=self.get_style("dim"))
        help_content.append("  • Type natural language for AI assistance\n", style=self.get_style("dim"))
        help_content.append("  • Use Ctrl+C to interrupt commands\n", style=self.get_style("dim"))
        
        self.console.print(
            Panel(
                help_content,
                title="Help",
                border_style=self.get_style("primary"),
                padding=(1, 2)
            )
        )
    
    def render_status_dashboard(self, status_data: Dict[str, Any]) -> None:
        """Render system status dashboard."""
        layout = Layout()
        
        # Create status panels
        config_panel = Panel(
            self._create_config_status(status_data.get("config", {})),
            title="⚙️ Configuration",
            border_style=self.get_style("primary")
        )
        
        api_panel = Panel(
            self._create_api_status(status_data.get("api", {})),
            title="🔌 API Status",
            border_style=self.get_style("secondary")
        )
        
        session_panel = Panel(
            self._create_session_status(status_data.get("session", {})),
            title="💾 Session",
            border_style=self.get_style("accent")
        )
        
        # Arrange in columns
        self.console.print(Columns([config_panel, api_panel, session_panel]))
    
    def _create_config_status(self, config_data: Dict[str, Any]) -> Text:
        """Create configuration status text."""
        text = Text()
        
        for key, value in config_data.items():
            status_icon = "✅" if value else "❌"
            text.append(f"{status_icon} {key}: {value}\n")
        
        return text
    
    def _create_api_status(self, api_data: Dict[str, Any]) -> Text:
        """Create API status text."""
        text = Text()
        
        for service, status in api_data.items():
            if status == "connected":
                text.append(f"✅ {service}: Connected\n", style=self.get_style("success"))
            elif status == "error":
                text.append(f"❌ {service}: Error\n", style=self.get_style("error"))
            else:
                text.append(f"⚠️  {service}: Unknown\n", style=self.get_style("warning"))
        
        return text
    
    def _create_session_status(self, session_data: Dict[str, Any]) -> Text:
        """Create session status text."""
        text = Text()
        
        for key, value in session_data.items():
            text.append(f"📊 {key}: {value}\n")
        
        return text
    
    def prompt_user(self, message: str, default: Optional[str] = None) -> str:
        """Prompt user for input."""
        return Prompt.ask(message, default=default, console=self.console)
    
    def confirm_action(self, message: str, default: bool = False) -> bool:
        """Ask user for confirmation."""
        return Confirm.ask(message, default=default, console=self.console)