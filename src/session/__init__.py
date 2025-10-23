"""Session management module for Todoist AI CLI.

This module provides session persistence and context management
for maintaining conversation state across CLI interactions.
"""

# Models and schemas
from .models import (
    SessionModel, MessageModel, ContextModel,
    SessionCreate, SessionUpdate, MessageCreate, ContextCreate,
    Session, Message, Context, SessionStats,
    create_database_engine, create_tables, get_session_maker
)

# Repository layer
from .repository import (
    SessionRepository, MessageRepository, ContextRepository, StatsRepository
)

# Service layer
from .service import (
    SessionService, get_session_service, create_session_service
)

__all__ = [
    # Models
    "SessionModel",
    "MessageModel", 
    "ContextModel",
    
    # Pydantic schemas
    "SessionCreate",
    "SessionUpdate",
    "MessageCreate",
    "ContextCreate",
    "Session",
    "Message",
    "Context",
    "SessionStats",
    
    # Database utilities
    "create_database_engine",
    "create_tables",
    "get_session_maker",
    
    # Repositories
    "SessionRepository",
    "MessageRepository",
    "ContextRepository", 
    "StatsRepository",
    
    # Services
    "SessionService",
    "get_session_service",
    "create_session_service"
]