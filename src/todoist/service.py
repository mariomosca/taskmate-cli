"""
High-level Todoist service for common operations.
"""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, date, timedelta
import re

from .api import TodoistSyncAPI, TodoistAPIError
from .models import (
    Task, TaskCreate, TaskUpdate,
    Project, ProjectCreate, ProjectUpdate,
    Priority, Color
)
from ..utils.logging import get_logger


class TodoistService:
    """
    High-level service for Todoist operations with convenience methods.
    """
    
    def __init__(self, api_token: str):
        """
        Initialize Todoist service.
        
        Args:
            api_token: Todoist API token
        """
        self.api = TodoistSyncAPI(api_token)
        self.logger = get_logger(__name__)
        self._projects_cache: Optional[List[Project]] = None
        self._inbox_project: Optional[Project] = None
    
    def test_connection(self) -> bool:
        """
        Test connection to Todoist API.
        
        Returns:
            True if connection successful
        """
        try:
            return self.api.test_connection()
        except Exception as e:
            self.logger.error(f"Connection test failed: {e}")
            return False
    
    def get_user_info(self) -> Dict[str, Any]:
        """
        Get current user information.
        
        Returns:
            User information dictionary
        """
        try:
            user = self.api.get_current_user()
            return {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "is_premium": user.is_premium,
                "timezone": user.timezone,
                "lang": user.lang
            }
        except TodoistAPIError as e:
            self.logger.error(f"Failed to get user info: {e}")
            raise
    
    # Project operations
    def get_projects(self, refresh_cache: bool = False) -> List[Project]:
        """
        Get all projects with caching.
        
        Args:
            refresh_cache: Whether to refresh the cache
            
        Returns:
            List of projects
        """
        if self._projects_cache is None or refresh_cache:
            try:
                self._projects_cache = self.api.get_projects()
                self.logger.debug(f"Loaded {len(self._projects_cache)} projects")
            except TodoistAPIError as e:
                self.logger.error(f"Failed to get projects: {e}")
                raise
        
        return self._projects_cache
    
    def find_project_by_name(self, name: str, exact_match: bool = False) -> Optional[Project]:
        """
        Find project by name.
        
        Args:
            name: Project name to search for
            exact_match: Whether to require exact match
            
        Returns:
            Project if found, None otherwise
        """
        projects = self.get_projects()
        
        if exact_match:
            for project in projects:
                if project.name.lower() == name.lower():
                    return project
        else:
            # Fuzzy search
            name_lower = name.lower()
            for project in projects:
                if name_lower in project.name.lower():
                    return project
        
        return None
    
    def get_inbox_project(self) -> Project:
        """
        Get the inbox project.
        
        Returns:
            Inbox project
            
        Raises:
            TodoistAPIError: If inbox not found
        """
        if self._inbox_project is None:
            try:
                self._inbox_project = self.api.get_inbox_project()
                if self._inbox_project is None:
                    raise TodoistAPIError("Inbox project not found")
            except TodoistAPIError as e:
                self.logger.error(f"Failed to get inbox: {e}")
                raise
        
        return self._inbox_project
    
    def create_project(
        self, 
        name: str, 
        color: Optional[Color] = None,
        parent_name: Optional[str] = None
    ) -> Project:
        """
        Create a new project.
        
        Args:
            name: Project name
            color: Project color
            parent_name: Parent project name
            
        Returns:
            Created project
        """
        project_data = ProjectCreate(name=name)
        
        if color:
            project_data.color = color
        
        if parent_name:
            parent = self.find_project_by_name(parent_name, exact_match=True)
            if parent:
                project_data.parent_id = parent.id
            else:
                self.logger.warning(f"Parent project '{parent_name}' not found")
        
        try:
            project = self.api.create_project(project_data)
            self.logger.info(f"Created project: {project.name}")
            
            # Refresh cache
            self._projects_cache = None
            
            return project
        except TodoistAPIError as e:
            self.logger.error(f"Failed to create project '{name}': {e}")
            raise
    
    # Task operations
    def get_tasks(
        self,
        project_name: Optional[str] = None,
        filter_expr: Optional[str] = None,
        include_completed: bool = False
    ) -> List[Task]:
        """
        Get tasks with various filters.
        
        Args:
            project_name: Filter by project name
            filter_expr: Todoist filter expression
            include_completed: Whether to include completed tasks
            
        Returns:
            List of tasks
        """
        try:
            if project_name:
                project = self.find_project_by_name(project_name)
                if not project:
                    raise TodoistAPIError(f"Project '{project_name}' not found")
                
                tasks = self.api.get_tasks(project_id=project.id)
            elif filter_expr:
                tasks = self.api.search_tasks(filter_expr)
            else:
                tasks = self.api.get_tasks()
            
            if not include_completed:
                tasks = [task for task in tasks if not task.is_completed]
            
            return tasks
        except TodoistAPIError as e:
            self.logger.error(f"Failed to get tasks: {e}")
            raise
    
    def get_today_tasks(self) -> List[Task]:
        """Get tasks due today."""
        return self.api.get_today_tasks()
    
    def get_overdue_tasks(self) -> List[Task]:
        """Get overdue tasks."""
        return self.api.get_overdue_tasks()
    
    def get_upcoming_tasks(self, days: int = 7) -> List[Task]:
        """Get tasks due in the next N days."""
        return self.api.get_upcoming_tasks(days)
    
    def create_task(
        self,
        content: str,
        project_name: Optional[str] = None,
        priority: Priority = Priority.NORMAL,
        due_string: Optional[str] = None,
        labels: Optional[List[str]] = None,
        description: Optional[str] = None
    ) -> Task:
        """
        Create a new task with smart defaults.
        
        Args:
            content: Task content
            project_name: Project name (defaults to inbox)
            priority: Task priority
            due_string: Due date in natural language
            labels: Task labels
            description: Task description
            
        Returns:
            Created task
        """
        task_data = TaskCreate(
            content=content,
            priority=priority,
            due_string=due_string,
            labels=labels or [],
            description=description or ""
        )
        
        # Set project
        if project_name:
            project = self.find_project_by_name(project_name)
            if project:
                task_data.project_id = project.id
            else:
                self.logger.warning(f"Project '{project_name}' not found, using inbox")
                task_data.project_id = self.get_inbox_project().id
        else:
            task_data.project_id = self.get_inbox_project().id
        
        try:
            task = self.api.create_task(task_data)
            self.logger.info(f"Created task: {task.content}")
            return task
        except TodoistAPIError as e:
            self.logger.error(f"Failed to create task '{content}': {e}")
            raise
    
    def complete_task(self, task_id: str) -> bool:
        """
        Mark a task as completed.
        
        Args:
            task_id: Task ID
            
        Returns:
            True if successful
        """
        try:
            result = self.api.close_task(task_id)
            self.logger.info(f"Completed task: {task_id}")
            return result
        except TodoistAPIError as e:
            self.logger.error(f"Failed to complete task {task_id}: {e}")
            raise
    
    def update_task(
        self,
        task_id: str,
        content: Optional[str] = None,
        priority: Optional[Priority] = None,
        due_string: Optional[str] = None,
        labels: Optional[List[str]] = None,
        description: Optional[str] = None
    ) -> Task:
        """
        Update an existing task.
        
        Args:
            task_id: Task ID
            content: New task content
            priority: New task priority
            due_string: New due date
            labels: New task labels
            description: New task description
            
        Returns:
            Updated task
        """
        update_data = TaskUpdate()
        
        if content is not None:
            update_data.content = content
        if priority is not None:
            update_data.priority = priority
        if due_string is not None:
            update_data.due_string = due_string
        if labels is not None:
            update_data.labels = labels
        if description is not None:
            update_data.description = description
        
        try:
            task = self.api.update_task(task_id, update_data)
            self.logger.info(f"Updated task: {task.content}")
            return task
        except TodoistAPIError as e:
            self.logger.error(f"Failed to update task {task_id}: {e}")
            raise
    
    def delete_task(self, task_id: str) -> bool:
        """
        Delete a task.
        
        Args:
            task_id: Task ID
            
        Returns:
            True if successful
        """
        try:
            result = self.api.delete_task(task_id)
            self.logger.info(f"Deleted task: {task_id}")
            return result
        except TodoistAPIError as e:
            self.logger.error(f"Failed to delete task {task_id}: {e}")
            raise
    
    # Search and filtering
    def search_tasks(self, query: str) -> List[Task]:
        """
        Search tasks by content.
        
        Args:
            query: Search query
            
        Returns:
            List of matching tasks
        """
        try:
            all_tasks = self.api.get_tasks()
            query_lower = query.lower()
            
            matching_tasks = []
            for task in all_tasks:
                if (query_lower in task.content.lower() or 
                    query_lower in task.description.lower()):
                    matching_tasks.append(task)
            
            return matching_tasks
        except TodoistAPIError as e:
            self.logger.error(f"Failed to search tasks: {e}")
            raise
    
    def get_tasks_by_priority(self, priority: Priority) -> List[Task]:
        """
        Get tasks by priority level.
        
        Args:
            priority: Priority level
            
        Returns:
            List of tasks with specified priority
        """
        try:
            all_tasks = self.api.get_tasks()
            return [task for task in all_tasks if task.priority == priority]
        except TodoistAPIError as e:
            self.logger.error(f"Failed to get tasks by priority: {e}")
            raise
    
    def get_tasks_by_label(self, label: str) -> List[Task]:
        """
        Get tasks by label.
        
        Args:
            label: Label name
            
        Returns:
            List of tasks with specified label
        """
        try:
            return self.api.get_tasks(label=label)
        except TodoistAPIError as e:
            self.logger.error(f"Failed to get tasks by label: {e}")
            raise
    
    # Utility methods
    def get_productivity_stats(self) -> Dict[str, Any]:
        """
        Get productivity statistics.
        
        Returns:
            Dictionary with productivity stats
        """
        try:
            all_tasks = self.api.get_tasks()
            today_tasks = self.get_today_tasks()
            overdue_tasks = self.get_overdue_tasks()
            
            # Count by priority
            priority_counts = {
                "normal": len([t for t in all_tasks if t.priority == Priority.NORMAL]),
                "high": len([t for t in all_tasks if t.priority == Priority.HIGH]),
                "very_high": len([t for t in all_tasks if t.priority == Priority.VERY_HIGH]),
                "urgent": len([t for t in all_tasks if t.priority == Priority.URGENT])
            }
            
            # Count by project
            projects = self.get_projects()
            project_counts = {}
            for project in projects:
                project_tasks = [t for t in all_tasks if t.project_id == project.id]
                project_counts[project.name] = len(project_tasks)
            
            return {
                "total_tasks": len(all_tasks),
                "today_tasks": len(today_tasks),
                "overdue_tasks": len(overdue_tasks),
                "priority_breakdown": priority_counts,
                "project_breakdown": project_counts,
                "total_projects": len(projects)
            }
        except TodoistAPIError as e:
            self.logger.error(f"Failed to get productivity stats: {e}")
            raise
    
    def parse_natural_task(self, text: str) -> Tuple[str, Dict[str, Any]]:
        """
        Parse natural language task input.
        
        Args:
            text: Natural language task description
            
        Returns:
            Tuple of (content, metadata)
        """
        metadata = {}
        content = text
        
        # Extract priority (p1, p2, p3, p4)
        priority_match = re.search(r'\bp([1-4])\b', content, re.IGNORECASE)
        if priority_match:
            priority_num = int(priority_match.group(1))
            metadata['priority'] = Priority(priority_num)
            content = re.sub(r'\bp[1-4]\b', '', content, flags=re.IGNORECASE).strip()
        
        # Extract labels (@label)
        label_matches = re.findall(r'@(\w+)', content)
        if label_matches:
            metadata['labels'] = label_matches
            content = re.sub(r'@\w+', '', content).strip()
        
        # Extract project (#project)
        project_match = re.search(r'#(\w+)', content)
        if project_match:
            metadata['project_name'] = project_match.group(1)
            content = re.sub(r'#\w+', '', content).strip()
        
        # Extract due date (due: tomorrow, due: next week, etc.)
        due_match = re.search(r'due:\s*([^,\n]+)', content, re.IGNORECASE)
        if due_match:
            metadata['due_string'] = due_match.group(1).strip()
            content = re.sub(r'due:\s*[^,\n]+', '', content, flags=re.IGNORECASE).strip()
        
        # Clean up extra whitespace
        content = ' '.join(content.split())
        
        return content, metadata
    
    def create_task_from_natural_language(self, text: str) -> Task:
        """
        Create a task from natural language input.
        
        Args:
            text: Natural language task description
            
        Returns:
            Created task
        """
        content, metadata = self.parse_natural_task(text)
        
        return self.create_task(
            content=content,
            project_name=metadata.get('project_name'),
            priority=metadata.get('priority', Priority.NORMAL),
            due_string=metadata.get('due_string'),
            labels=metadata.get('labels')
        )