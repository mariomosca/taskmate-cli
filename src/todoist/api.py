"""
Todoist API wrapper with CRUD operations.
"""

import asyncio
import json
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, date
import httpx
from pydantic import ValidationError

from .models import (
    Task, TaskCreate, TaskUpdate,
    Project, ProjectCreate, ProjectUpdate,
    Section, SectionCreate,
    Label, LabelCreate,
    Comment, CommentCreate,
    User, TodoistError,
    Priority
)
from ..utils.logging import get_logger


class TodoistAPIError(Exception):
    """Custom exception for Todoist API errors."""
    
    def __init__(self, message: str, status_code: Optional[int] = None, error_data: Optional[Dict] = None):
        self.message = message
        self.status_code = status_code
        self.error_data = error_data
        super().__init__(self.message)


class TodoistAPI:
    """
    Todoist API wrapper with async support and comprehensive CRUD operations.
    """
    
    BASE_URL = "https://api.todoist.com/rest/v2"
    SYNC_URL = "https://api.todoist.com/sync/v9"
    
    def __init__(self, api_token: str, timeout: int = 30):
        """
        Initialize Todoist API client.
        
        Args:
            api_token: Todoist API token
            timeout: Request timeout in seconds
        """
        self.api_token = api_token
        self.timeout = timeout
        self.logger = get_logger(__name__)
        
        # HTTP client configuration
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
            "User-Agent": "TodoistAI-CLI/1.0"
        }
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None,
        use_sync_api: bool = False
    ) -> Dict[str, Any]:
        """
        Make HTTP request to Todoist API.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            data: Request body data
            params: Query parameters
            use_sync_api: Whether to use sync API endpoint
            
        Returns:
            Response data
            
        Raises:
            TodoistAPIError: If request fails
        """
        base_url = self.SYNC_URL if use_sync_api else self.BASE_URL
        url = f"{base_url}/{endpoint.lstrip('/')}"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    json=data,
                    params=params
                )
                
                # Log request details
                self.logger.debug(f"{method} {url} - Status: {response.status_code}")
                
                if response.status_code == 204:
                    return {}
                
                try:
                    response_data = response.json()
                except json.JSONDecodeError:
                    response_data = {"content": response.text}
                
                if response.status_code >= 400:
                    error_msg = f"API request failed with status {response.status_code}"
                    if isinstance(response_data, dict) and "error" in response_data:
                        error_msg = response_data["error"]
                    
                    raise TodoistAPIError(
                        message=error_msg,
                        status_code=response.status_code,
                        error_data=response_data
                    )
                
                return response_data
                
        except httpx.TimeoutException:
            raise TodoistAPIError("Request timeout")
        except httpx.RequestError as e:
            raise TodoistAPIError(f"Request error: {str(e)}")
    
    # Task operations
    async def get_tasks(
        self,
        project_id: Optional[str] = None,
        section_id: Optional[str] = None,
        label: Optional[str] = None,
        filter_expr: Optional[str] = None,
        lang: Optional[str] = None
    ) -> List[Task]:
        """
        Get tasks with optional filtering.
        
        Args:
            project_id: Filter by project ID
            section_id: Filter by section ID
            label: Filter by label name
            filter_expr: Todoist filter expression
            lang: Language for dates
            
        Returns:
            List of tasks
        """
        params = {}
        if project_id:
            params["project_id"] = project_id
        if section_id:
            params["section_id"] = section_id
        if label:
            params["label"] = label
        if filter_expr:
            params["filter"] = filter_expr
        if lang:
            params["lang"] = lang
        
        data = await self._make_request("GET", "/tasks", params=params)
        return [Task(**task) for task in data]
    
    async def get_task(self, task_id: str) -> Task:
        """
        Get a specific task by ID.
        
        Args:
            task_id: Task ID
            
        Returns:
            Task object
        """
        data = await self._make_request("GET", f"/tasks/{task_id}")
        return Task(**data)
    
    async def create_task(self, task_data: TaskCreate) -> Task:
        """
        Create a new task.
        
        Args:
            task_data: Task creation data
            
        Returns:
            Created task
        """
        data = await self._make_request(
            "POST", 
            "/tasks", 
            data=task_data.dict(exclude_none=True)
        )
        return Task(**data)
    
    async def update_task(self, task_id: str, task_data: TaskUpdate) -> Task:
        """
        Update an existing task.
        
        Args:
            task_id: Task ID
            task_data: Task update data
            
        Returns:
            Updated task
        """
        data = await self._make_request(
            "POST", 
            f"/tasks/{task_id}", 
            data=task_data.dict(exclude_none=True)
        )
        return Task(**data)
    
    async def close_task(self, task_id: str) -> bool:
        """
        Mark a task as completed.
        
        Args:
            task_id: Task ID
            
        Returns:
            True if successful
        """
        await self._make_request("POST", f"/tasks/{task_id}/close")
        return True
    
    async def reopen_task(self, task_id: str) -> bool:
        """
        Reopen a completed task.
        
        Args:
            task_id: Task ID
            
        Returns:
            True if successful
        """
        await self._make_request("POST", f"/tasks/{task_id}/reopen")
        return True
    
    async def delete_task(self, task_id: str) -> bool:
        """
        Delete a task.
        
        Args:
            task_id: Task ID
            
        Returns:
            True if successful
        """
        await self._make_request("DELETE", f"/tasks/{task_id}")
        return True
    
    # Project operations
    async def get_projects(self) -> List[Project]:
        """
        Get all projects.
        
        Returns:
            List of projects
        """
        data = await self._make_request("GET", "/projects")
        return [Project(**project) for project in data]
    
    async def get_project(self, project_id: str) -> Project:
        """
        Get a specific project by ID.
        
        Args:
            project_id: Project ID
            
        Returns:
            Project object
        """
        data = await self._make_request("GET", f"/projects/{project_id}")
        return Project(**data)
    
    async def create_project(self, project_data: ProjectCreate) -> Project:
        """
        Create a new project.
        
        Args:
            project_data: Project creation data
            
        Returns:
            Created project
        """
        data = await self._make_request(
            "POST", 
            "/projects", 
            data=project_data.dict(exclude_none=True)
        )
        return Project(**data)
    
    async def update_project(self, project_id: str, project_data: ProjectUpdate) -> Project:
        """
        Update an existing project.
        
        Args:
            project_id: Project ID
            project_data: Project update data
            
        Returns:
            Updated project
        """
        data = await self._make_request(
            "POST", 
            f"/projects/{project_id}", 
            data=project_data.dict(exclude_none=True)
        )
        return Project(**data)
    
    async def delete_project(self, project_id: str) -> bool:
        """
        Delete a project.
        
        Args:
            project_id: Project ID
            
        Returns:
            True if successful
        """
        await self._make_request("DELETE", f"/projects/{project_id}")
        return True
    
    # Section operations
    async def get_sections(self, project_id: Optional[str] = None) -> List[Section]:
        """
        Get sections, optionally filtered by project.
        
        Args:
            project_id: Filter by project ID
            
        Returns:
            List of sections
        """
        params = {}
        if project_id:
            params["project_id"] = project_id
        
        data = await self._make_request("GET", "/sections", params=params)
        return [Section(**section) for section in data]
    
    async def get_section(self, section_id: str) -> Section:
        """
        Get a specific section by ID.
        
        Args:
            section_id: Section ID
            
        Returns:
            Section object
        """
        data = await self._make_request("GET", f"/sections/{section_id}")
        return Section(**data)
    
    async def create_section(self, section_data: SectionCreate) -> Section:
        """
        Create a new section.
        
        Args:
            section_data: Section creation data
            
        Returns:
            Created section
        """
        data = await self._make_request(
            "POST", 
            "/sections", 
            data=section_data.dict(exclude_none=True)
        )
        return Section(**data)
    
    async def delete_section(self, section_id: str) -> bool:
        """
        Delete a section.
        
        Args:
            section_id: Section ID
            
        Returns:
            True if successful
        """
        await self._make_request("DELETE", f"/sections/{section_id}")
        return True
    
    # Label operations
    async def get_labels(self) -> List[Label]:
        """
        Get all labels.
        
        Returns:
            List of labels
        """
        data = await self._make_request("GET", "/labels")
        return [Label(**label) for label in data]
    
    async def get_label(self, label_id: str) -> Label:
        """
        Get a specific label by ID.
        
        Args:
            label_id: Label ID
            
        Returns:
            Label object
        """
        data = await self._make_request("GET", f"/labels/{label_id}")
        return Label(**data)
    
    async def create_label(self, label_data: LabelCreate) -> Label:
        """
        Create a new label.
        
        Args:
            label_data: Label creation data
            
        Returns:
            Created label
        """
        data = await self._make_request(
            "POST", 
            "/labels", 
            data=label_data.dict(exclude_none=True)
        )
        return Label(**data)
    
    async def delete_label(self, label_id: str) -> bool:
        """
        Delete a label.
        
        Args:
            label_id: Label ID
            
        Returns:
            True if successful
        """
        await self._make_request("DELETE", f"/labels/{label_id}")
        return True
    
    # Comment operations
    async def get_comments(
        self, 
        project_id: Optional[str] = None, 
        task_id: Optional[str] = None
    ) -> List[Comment]:
        """
        Get comments for a project or task.
        
        Args:
            project_id: Project ID
            task_id: Task ID
            
        Returns:
            List of comments
        """
        params = {}
        if project_id:
            params["project_id"] = project_id
        if task_id:
            params["task_id"] = task_id
        
        data = await self._make_request("GET", "/comments", params=params)
        return [Comment(**comment) for comment in data]
    
    async def get_comment(self, comment_id: str) -> Comment:
        """
        Get a specific comment by ID.
        
        Args:
            comment_id: Comment ID
            
        Returns:
            Comment object
        """
        data = await self._make_request("GET", f"/comments/{comment_id}")
        return Comment(**data)
    
    async def create_comment(self, comment_data: CommentCreate) -> Comment:
        """
        Create a new comment.
        
        Args:
            comment_data: Comment creation data
            
        Returns:
            Created comment
        """
        data = await self._make_request(
            "POST", 
            "/comments", 
            data=comment_data.dict(exclude_none=True)
        )
        return Comment(**data)
    
    async def delete_comment(self, comment_id: str) -> bool:
        """
        Delete a comment.
        
        Args:
            comment_id: Comment ID
            
        Returns:
            True if successful
        """
        await self._make_request("DELETE", f"/comments/{comment_id}")
        return True
    
    # User operations
    async def get_current_user(self) -> User:
        """
        Get current user information.
        
        Returns:
            User object
        """
        data = await self._make_request("GET", "/user", use_sync_api=True)
        return User(**data)
    
    # Utility methods
    async def test_connection(self) -> bool:
        """
        Test API connection by fetching current user.
        
        Returns:
            True if connection successful
        """
        try:
            await self.get_current_user()
            return True
        except TodoistAPIError:
            return False
    
    async def get_inbox_project(self) -> Optional[Project]:
        """
        Get the inbox project.
        
        Returns:
            Inbox project or None if not found
        """
        projects = await self.get_projects()
        for project in projects:
            if project.is_inbox_project:
                return project
        return None
    
    async def search_tasks(self, query: str) -> List[Task]:
        """
        Search tasks using Todoist filter syntax.
        
        Args:
            query: Search query
            
        Returns:
            List of matching tasks
        """
        return await self.get_tasks(filter_expr=query)
    
    async def get_overdue_tasks(self) -> List[Task]:
        """
        Get all overdue tasks.
        
        Returns:
            List of overdue tasks
        """
        return await self.search_tasks("overdue")
    
    async def get_today_tasks(self) -> List[Task]:
        """
        Get tasks due today.
        
        Returns:
            List of today's tasks
        """
        return await self.search_tasks("today")
    
    async def get_upcoming_tasks(self, days: int = 7) -> List[Task]:
        """
        Get tasks due in the next N days.
        
        Args:
            days: Number of days to look ahead
            
        Returns:
            List of upcoming tasks
        """
        return await self.search_tasks(f"{days} days")


# Synchronous wrapper for backward compatibility
class TodoistSyncAPI:
    """Synchronous wrapper for TodoistAPI."""
    
    def __init__(self, api_token: str, timeout: int = 30):
        self.async_api = TodoistAPI(api_token, timeout)
    
    def _run_async(self, coro):
        """Run async coroutine in sync context."""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(coro)
    
    # Task operations
    def get_tasks(self, **kwargs) -> List[Task]:
        return self._run_async(self.async_api.get_tasks(**kwargs))
    
    def get_task(self, task_id: str) -> Task:
        return self._run_async(self.async_api.get_task(task_id))
    
    def create_task(self, task_data: TaskCreate) -> Task:
        return self._run_async(self.async_api.create_task(task_data))
    
    def update_task(self, task_id: str, task_data: TaskUpdate) -> Task:
        return self._run_async(self.async_api.update_task(task_id, task_data))
    
    def close_task(self, task_id: str) -> bool:
        return self._run_async(self.async_api.close_task(task_id))
    
    def delete_task(self, task_id: str) -> bool:
        return self._run_async(self.async_api.delete_task(task_id))
    
    # Project operations
    def get_projects(self) -> List[Project]:
        return self._run_async(self.async_api.get_projects())
    
    def get_project(self, project_id: str) -> Project:
        return self._run_async(self.async_api.get_project(project_id))
    
    def create_project(self, project_data: ProjectCreate) -> Project:
        return self._run_async(self.async_api.create_project(project_data))
    
    def update_project(self, project_id: str, project_data: ProjectUpdate) -> Project:
        return self._run_async(self.async_api.update_project(project_id, project_data))
    
    def delete_project(self, project_id: str) -> bool:
        return self._run_async(self.async_api.delete_project(project_id))
    
    # Utility methods
    def test_connection(self) -> bool:
        return self._run_async(self.async_api.test_connection())
    
    def get_current_user(self) -> User:
        return self._run_async(self.async_api.get_current_user())
    
    def get_inbox_project(self) -> Optional[Project]:
        return self._run_async(self.async_api.get_inbox_project())
    
    def search_tasks(self, query: str) -> List[Task]:
        return self._run_async(self.async_api.search_tasks(query))
    
    def get_today_tasks(self) -> List[Task]:
        return self._run_async(self.async_api.get_today_tasks())
    
    def get_overdue_tasks(self) -> List[Task]:
        return self._run_async(self.async_api.get_overdue_tasks())