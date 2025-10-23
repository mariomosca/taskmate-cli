"""
Pydantic models for Todoist API entities.
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, validator
from enum import Enum


class Priority(int, Enum):
    """Task priority levels."""
    NORMAL = 1
    HIGH = 2
    VERY_HIGH = 3
    URGENT = 4


class TaskStatus(str, Enum):
    """Task status."""
    ACTIVE = "active"
    COMPLETED = "completed"


class ViewStyle(str, Enum):
    """Project view styles."""
    LIST = "list"
    BOARD = "board"


class Color(str, Enum):
    """Available colors for projects and labels."""
    BERRY_RED = "berry_red"
    RED = "red"
    ORANGE = "orange"
    YELLOW = "yellow"
    OLIVE_GREEN = "olive_green"
    LIME_GREEN = "lime_green"
    GREEN = "green"
    MINT_GREEN = "mint_green"
    TEAL = "teal"
    SKY_BLUE = "sky_blue"
    LIGHT_BLUE = "light_blue"
    BLUE = "blue"
    GRAPE = "grape"
    VIOLET = "violet"
    LAVENDER = "lavender"
    MAGENTA = "magenta"
    SALMON = "salmon"
    CHARCOAL = "charcoal"
    GREY = "grey"
    TAUPE = "taupe"


class Due(BaseModel):
    """Due date information for tasks."""
    
    string: str = Field(..., description="Human readable due date")
    date: str = Field(..., description="Due date in YYYY-MM-DD format")
    is_recurring: bool = Field(default=False, description="Whether the due date is recurring")
    datetime: Optional[str] = Field(default=None, description="Due datetime in RFC3339 format")
    timezone: Optional[str] = Field(default=None, description="Timezone for the due date")


class Duration(BaseModel):
    """Task duration information."""
    
    amount: int = Field(..., description="Duration amount")
    unit: Literal["minute", "day"] = Field(..., description="Duration unit")


class Task(BaseModel):
    """Todoist task model."""
    
    id: str = Field(..., description="Task ID")
    project_id: str = Field(..., description="Project ID")
    section_id: Optional[str] = Field(default=None, description="Section ID")
    content: str = Field(..., description="Task content")
    description: str = Field(default="", description="Task description")
    is_completed: bool = Field(default=False, description="Whether task is completed")
    labels: List[str] = Field(default_factory=list, description="Task labels")
    parent_id: Optional[str] = Field(default=None, description="Parent task ID")
    order: int = Field(default=0, description="Task order")
    priority: Priority = Field(default=Priority.NORMAL, description="Task priority")
    due: Optional[Due] = Field(default=None, description="Due date information")
    url: str = Field(..., description="Task URL")
    comment_count: int = Field(default=0, description="Number of comments")
    created_at: datetime = Field(..., description="Creation timestamp")
    creator_id: str = Field(..., description="Creator user ID")
    assignee_id: Optional[str] = Field(default=None, description="Assignee user ID")
    assigner_id: Optional[str] = Field(default=None, description="Assigner user ID")
    duration: Optional[Duration] = Field(default=None, description="Task duration")

    class Config:
        use_enum_values = True


class TaskCreate(BaseModel):
    """Model for creating a new task."""
    
    content: str = Field(..., description="Task content")
    description: Optional[str] = Field(default="", description="Task description")
    project_id: Optional[str] = Field(default=None, description="Project ID")
    section_id: Optional[str] = Field(default=None, description="Section ID")
    parent_id: Optional[str] = Field(default=None, description="Parent task ID")
    order: Optional[int] = Field(default=None, description="Task order")
    labels: Optional[List[str]] = Field(default=None, description="Task labels")
    priority: Optional[Priority] = Field(default=Priority.NORMAL, description="Task priority")
    due_string: Optional[str] = Field(default=None, description="Due date in natural language")
    due_date: Optional[str] = Field(default=None, description="Due date in YYYY-MM-DD format")
    due_datetime: Optional[str] = Field(default=None, description="Due datetime in RFC3339 format")
    due_lang: Optional[str] = Field(default=None, description="Language for due_string")
    assignee_id: Optional[str] = Field(default=None, description="Assignee user ID")
    duration: Optional[int] = Field(default=None, description="Duration in minutes")
    duration_unit: Optional[Literal["minute", "day"]] = Field(default="minute", description="Duration unit")

    class Config:
        use_enum_values = True


class TaskUpdate(BaseModel):
    """Model for updating a task."""
    
    content: Optional[str] = Field(default=None, description="Task content")
    description: Optional[str] = Field(default=None, description="Task description")
    labels: Optional[List[str]] = Field(default=None, description="Task labels")
    priority: Optional[Priority] = Field(default=None, description="Task priority")
    due_string: Optional[str] = Field(default=None, description="Due date in natural language")
    due_date: Optional[str] = Field(default=None, description="Due date in YYYY-MM-DD format")
    due_datetime: Optional[str] = Field(default=None, description="Due datetime in RFC3339 format")
    due_lang: Optional[str] = Field(default=None, description="Language for due_string")
    assignee_id: Optional[str] = Field(default=None, description="Assignee user ID")
    duration: Optional[int] = Field(default=None, description="Duration in minutes")
    duration_unit: Optional[Literal["minute", "day"]] = Field(default="minute", description="Duration unit")

    class Config:
        use_enum_values = True


class Project(BaseModel):
    """Todoist project model."""
    
    id: str = Field(..., description="Project ID")
    name: str = Field(..., description="Project name")
    comment_count: int = Field(default=0, description="Number of comments")
    order: int = Field(default=0, description="Project order")
    color: Color = Field(default=Color.CHARCOAL, description="Project color")
    is_shared: bool = Field(default=False, description="Whether project is shared")
    is_favorite: bool = Field(default=False, description="Whether project is favorite")
    is_inbox_project: bool = Field(default=False, description="Whether this is the inbox project")
    is_team_inbox: bool = Field(default=False, description="Whether this is a team inbox")
    view_style: ViewStyle = Field(default=ViewStyle.LIST, description="Project view style")
    url: str = Field(..., description="Project URL")
    parent_id: Optional[str] = Field(default=None, description="Parent project ID")

    class Config:
        use_enum_values = True


class ProjectCreate(BaseModel):
    """Model for creating a new project."""
    
    name: str = Field(..., description="Project name")
    parent_id: Optional[str] = Field(default=None, description="Parent project ID")
    order: Optional[int] = Field(default=None, description="Project order")
    color: Optional[Color] = Field(default=Color.CHARCOAL, description="Project color")
    is_favorite: Optional[bool] = Field(default=False, description="Whether project is favorite")
    view_style: Optional[ViewStyle] = Field(default=ViewStyle.LIST, description="Project view style")

    class Config:
        use_enum_values = True


class ProjectUpdate(BaseModel):
    """Model for updating a project."""
    
    name: Optional[str] = Field(default=None, description="Project name")
    order: Optional[int] = Field(default=None, description="Project order")
    color: Optional[Color] = Field(default=None, description="Project color")
    is_favorite: Optional[bool] = Field(default=None, description="Whether project is favorite")
    view_style: Optional[ViewStyle] = Field(default=None, description="Project view style")

    class Config:
        use_enum_values = True


class Section(BaseModel):
    """Todoist section model."""
    
    id: str = Field(..., description="Section ID")
    project_id: str = Field(..., description="Project ID")
    order: int = Field(default=0, description="Section order")
    name: str = Field(..., description="Section name")


class SectionCreate(BaseModel):
    """Model for creating a new section."""
    
    name: str = Field(..., description="Section name")
    project_id: str = Field(..., description="Project ID")
    order: Optional[int] = Field(default=None, description="Section order")


class Label(BaseModel):
    """Todoist label model."""
    
    id: str = Field(..., description="Label ID")
    name: str = Field(..., description="Label name")
    color: Color = Field(default=Color.CHARCOAL, description="Label color")
    order: int = Field(default=0, description="Label order")
    is_favorite: bool = Field(default=False, description="Whether label is favorite")

    class Config:
        use_enum_values = True


class LabelCreate(BaseModel):
    """Model for creating a new label."""
    
    name: str = Field(..., description="Label name")
    order: Optional[int] = Field(default=None, description="Label order")
    color: Optional[Color] = Field(default=Color.CHARCOAL, description="Label color")
    is_favorite: Optional[bool] = Field(default=False, description="Whether label is favorite")

    class Config:
        use_enum_values = True


class Comment(BaseModel):
    """Todoist comment model."""
    
    id: str = Field(..., description="Comment ID")
    task_id: Optional[str] = Field(default=None, description="Task ID")
    project_id: Optional[str] = Field(default=None, description="Project ID")
    content: str = Field(..., description="Comment content")
    posted_at: datetime = Field(..., description="Posted timestamp")
    attachment: Optional[Dict[str, Any]] = Field(default=None, description="Comment attachment")


class CommentCreate(BaseModel):
    """Model for creating a new comment."""
    
    task_id: Optional[str] = Field(default=None, description="Task ID")
    project_id: Optional[str] = Field(default=None, description="Project ID")
    content: str = Field(..., description="Comment content")
    attachment: Optional[Dict[str, Any]] = Field(default=None, description="Comment attachment")

    @validator('task_id', 'project_id')
    def validate_target(cls, v, values):
        """Ensure either task_id or project_id is provided."""
        if not v and not values.get('task_id') and not values.get('project_id'):
            raise ValueError('Either task_id or project_id must be provided')
        return v


class User(BaseModel):
    """Todoist user model."""
    
    id: str = Field(..., description="User ID")
    name: str = Field(..., description="User name")
    email: str = Field(..., description="User email")
    avatar_big: Optional[str] = Field(default=None, description="Large avatar URL")
    avatar_medium: Optional[str] = Field(default=None, description="Medium avatar URL")
    avatar_small: Optional[str] = Field(default=None, description="Small avatar URL")
    avatar_s640: Optional[str] = Field(default=None, description="640px avatar URL")
    is_premium: bool = Field(default=False, description="Whether user has premium")
    lang: str = Field(default="en", description="User language")
    timezone: str = Field(default="UTC", description="User timezone")
    
    @validator('name', pre=True, always=True)
    def set_name_from_full_name(cls, v, values):
        """Map full_name to name if name is not provided."""
        if v is None and 'full_name' in values:
            return values['full_name']
        return v
    
    class Config:
        extra = "ignore"  # Ignore extra fields from API response


class TodoistError(BaseModel):
    """Todoist API error model."""
    
    error_code: int = Field(..., description="Error code")
    error: str = Field(..., description="Error message")
    error_extra: Optional[Dict[str, Any]] = Field(default=None, description="Extra error information")