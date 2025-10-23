"""
Service layer for session management.
"""

import os
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from contextlib import contextmanager
from sqlalchemy.orm import Session as SQLSession

from .models import (
    create_database_engine, create_tables, get_session_maker,
    SessionCreate, SessionUpdate, MessageCreate, ContextCreate,
    Session, Message, Context, SessionStats
)
from .repository import SessionRepository, MessageRepository, ContextRepository, StatsRepository


class SessionService:
    """High-level service for session management."""
    
    def __init__(self, database_url: Optional[str] = None):
        """Initialize the session service."""
        if database_url is None:
            # Default to SQLite in user's data directory
            data_dir = os.path.expanduser("~/.todoist-ai-cli")
            os.makedirs(data_dir, exist_ok=True)
            database_url = f"sqlite:///{data_dir}/sessions.db"
        
        self.database_url = database_url
        self.engine = create_database_engine(database_url)
        self.SessionMaker = get_session_maker(self.engine)
        
        # Create tables if they don't exist
        create_tables(self.engine)
        
        self._current_session_id: Optional[str] = None
    
    @contextmanager
    def get_db_session(self):
        """Get a database session with automatic cleanup."""
        db_session = self.SessionMaker()
        try:
            yield db_session
        except Exception:
            db_session.rollback()
            raise
        finally:
            db_session.close()
    
    # Session Management
    def create_session(
        self,
        name: str,
        description: Optional[str] = None,
        llm_provider: Optional[str] = None,
        llm_model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        session_metadata: Optional[Dict[str, Any]] = None,
        set_as_current: bool = True
    ) -> Session:
        """Create a new session."""
        session_data = SessionCreate(
            name=name,
            description=description,
            llm_provider=llm_provider,
            llm_model=llm_model,
            system_prompt=system_prompt,
            session_metadata=session_metadata
        )
        
        with self.get_db_session() as db:
            repo = SessionRepository(db)
            session = repo.create_session(session_data)
            
            if set_as_current:
                self._current_session_id = session.id
            
            return session
    
    def get_session(self, session_id: str) -> Optional[Session]:
        """Get a session by ID."""
        with self.get_db_session() as db:
            repo = SessionRepository(db)
            return repo.get_session(session_id)
    
    def get_sessions(
        self,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True,
        search: Optional[str] = None
    ) -> List[Session]:
        """Get sessions with filtering and pagination."""
        with self.get_db_session() as db:
            repo = SessionRepository(db)
            return repo.get_sessions(skip, limit, active_only, search)
    
    def update_session(
        self,
        session_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        llm_provider: Optional[str] = None,
        llm_model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        session_metadata: Optional[Dict[str, Any]] = None,
        is_active: Optional[bool] = None
    ) -> Optional[Session]:
        """Update a session."""
        session_data = SessionUpdate(
            name=name,
            description=description,
            llm_provider=llm_provider,
            llm_model=llm_model,
            system_prompt=system_prompt,
            session_metadata=session_metadata,
            is_active=is_active
        )
        
        with self.get_db_session() as db:
            repo = SessionRepository(db)
            return repo.update_session(session_id, session_data)
    
    def delete_session(self, session_id: str, hard_delete: bool = False) -> bool:
        """Delete a session (soft delete by default)."""
        with self.get_db_session() as db:
            repo = SessionRepository(db)
            
            if hard_delete:
                success = repo.hard_delete_session(session_id)
            else:
                success = repo.delete_session(session_id)
            
            # Clear current session if it was deleted
            if success and self._current_session_id == session_id:
                self._current_session_id = None
            
            return success
    
    def get_recent_sessions(self, limit: int = 10) -> List[Session]:
        """Get most recently updated sessions."""
        with self.get_db_session() as db:
            repo = SessionRepository(db)
            return repo.get_recent_sessions(limit)
    
    # Current Session Management
    def set_current_session(self, session_id: str) -> bool:
        """Set the current active session."""
        session = self.get_session(session_id)
        if session and session.is_active:
            self._current_session_id = session_id
            return True
        return False
    
    def get_current_session(self) -> Optional[Session]:
        """Get the current active session."""
        if self._current_session_id:
            return self.get_session(self._current_session_id)
        return None
    
    def clear_current_session(self):
        """Clear the current session."""
        self._current_session_id = None
    
    # Message Management
    def add_message(
        self,
        role: str,
        content: str,
        session_id: Optional[str] = None,
        token_count: Optional[int] = None,
        model_used: Optional[str] = None,
        response_time: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Message]:
        """Add a message to a session."""
        target_session_id = session_id or self._current_session_id
        if not target_session_id:
            return None
        
        message_data = MessageCreate(
            role=role,
            content=content,
            token_count=token_count,
            model_used=model_used,
            response_time=response_time,
            metadata=metadata
        )
        
        with self.get_db_session() as db:
            repo = MessageRepository(db)
            return repo.add_message(target_session_id, message_data)
    
    def get_messages(
        self,
        session_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        role_filter: Optional[str] = None
    ) -> List[Message]:
        """Get messages for a session."""
        target_session_id = session_id or self._current_session_id
        if not target_session_id:
            return []
        
        with self.get_db_session() as db:
            repo = MessageRepository(db)
            return repo.get_messages(target_session_id, skip, limit, role_filter)
    
    def get_conversation_history(
        self,
        session_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Message]:
        """Get recent conversation history."""
        target_session_id = session_id or self._current_session_id
        if not target_session_id:
            return []
        
        with self.get_db_session() as db:
            repo = MessageRepository(db)
            return repo.get_conversation_history(target_session_id, limit)
    
    def clear_messages(self, session_id: Optional[str] = None) -> int:
        """Clear all messages from a session."""
        target_session_id = session_id or self._current_session_id
        if not target_session_id:
            return 0
        
        with self.get_db_session() as db:
            repo = MessageRepository(db)
            return repo.clear_session_messages(target_session_id)
    
    # Context Management
    def add_context(
        self,
        context_type: str,
        context_key: str,
        context_value: str,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Context]:
        """Add context to a session."""
        target_session_id = session_id or self._current_session_id
        if not target_session_id:
            return None
        
        context_data = ContextCreate(
            context_type=context_type,
            context_key=context_key,
            context_value=context_value,
            metadata=metadata
        )
        
        with self.get_db_session() as db:
            repo = ContextRepository(db)
            return repo.add_context(target_session_id, context_data)
    
    def get_contexts(
        self,
        session_id: Optional[str] = None,
        context_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Context]:
        """Get contexts for a session."""
        target_session_id = session_id or self._current_session_id
        if not target_session_id:
            return []
        
        with self.get_db_session() as db:
            repo = ContextRepository(db)
            return repo.get_contexts(target_session_id, context_type, skip, limit)
    
    def get_context_by_key(
        self,
        context_type: str,
        context_key: str,
        session_id: Optional[str] = None
    ) -> Optional[Context]:
        """Get specific context by type and key."""
        target_session_id = session_id or self._current_session_id
        if not target_session_id:
            return None
        
        with self.get_db_session() as db:
            repo = ContextRepository(db)
            return repo.get_context_by_key(target_session_id, context_type, context_key)
    
    def update_context(
        self,
        context_id: int,
        context_value: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Context]:
        """Update context value and metadata."""
        with self.get_db_session() as db:
            repo = ContextRepository(db)
            return repo.update_context(context_id, context_value, metadata)
    
    def delete_context(self, context_id: int) -> bool:
        """Delete a context."""
        with self.get_db_session() as db:
            repo = ContextRepository(db)
            return repo.delete_context(context_id)
    
    def clear_contexts(
        self,
        session_id: Optional[str] = None,
        context_type: Optional[str] = None
    ) -> int:
        """Clear contexts from a session."""
        target_session_id = session_id or self._current_session_id
        if not target_session_id:
            return 0
        
        with self.get_db_session() as db:
            repo = ContextRepository(db)
            return repo.clear_session_contexts(target_session_id, context_type)
    
    # File Context Helpers
    def add_file_context(
        self,
        file_path: str,
        content: str,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Context]:
        """Add file content as context."""
        file_metadata = metadata or {}
        file_metadata.update({
            "file_size": len(content),
            "added_at": datetime.utcnow().isoformat()
        })
        
        return self.add_context(
            context_type="file",
            context_key=file_path,
            context_value=content,
            session_id=session_id,
            metadata=file_metadata
        )
    
    def add_task_context(
        self,
        task_id: str,
        task_data: Dict[str, Any],
        session_id: Optional[str] = None
    ) -> Optional[Context]:
        """Add Todoist task as context."""
        return self.add_context(
            context_type="task",
            context_key=task_id,
            context_value=str(task_data),
            session_id=session_id,
            metadata={"task_data": task_data}
        )
    
    def add_project_context(
        self,
        project_id: str,
        project_data: Dict[str, Any],
        session_id: Optional[str] = None
    ) -> Optional[Context]:
        """Add Todoist project as context."""
        return self.add_context(
            context_type="project",
            context_key=project_id,
            context_value=str(project_data),
            session_id=session_id,
            metadata={"project_data": project_data}
        )
    
    # Statistics
    def get_stats(self) -> SessionStats:
        """Get session statistics."""
        with self.get_db_session() as db:
            repo = StatsRepository(db)
            return repo.get_session_stats()
    
    # Conversation Utilities
    def start_conversation(
        self,
        name: str,
        system_prompt: Optional[str] = None,
        llm_provider: Optional[str] = None,
        llm_model: Optional[str] = None
    ) -> Session:
        """Start a new conversation session."""
        session = self.create_session(
            name=name,
            system_prompt=system_prompt,
            llm_provider=llm_provider,
            llm_model=llm_model,
            set_as_current=True
        )
        
        # Add system message if provided
        if system_prompt:
            self.add_message("system", system_prompt)
        
        return session
    
    def continue_conversation(self, session_id: str) -> bool:
        """Continue an existing conversation."""
        return self.set_current_session(session_id)
    
    def get_conversation_summary(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Get a summary of the conversation."""
        target_session_id = session_id or self._current_session_id
        if not target_session_id:
            return {}
        
        session = self.get_session(target_session_id)
        if not session:
            return {}
        
        messages = self.get_messages(target_session_id)
        contexts = self.get_contexts(target_session_id)
        
        # Calculate statistics
        user_messages = [m for m in messages if m.role == "user"]
        assistant_messages = [m for m in messages if m.role == "assistant"]
        total_tokens = sum(m.token_count or 0 for m in messages if m.token_count)
        
        return {
            "session": session,
            "total_messages": len(messages),
            "user_messages": len(user_messages),
            "assistant_messages": len(assistant_messages),
            "total_contexts": len(contexts),
            "total_tokens": total_tokens,
            "context_types": list(set(c.context_type for c in contexts)),
            "duration": (session.updated_at - session.created_at).total_seconds() / 3600  # hours
        }


# Global service instance
_session_service: Optional[SessionService] = None


def get_session_service(database_url: Optional[str] = None) -> SessionService:
    """Get or create the global session service instance."""
    global _session_service
    
    if _session_service is None:
        _session_service = SessionService(database_url)
    
    return _session_service


def create_session_service(database_url: Optional[str] = None) -> SessionService:
    """Create a new session service instance."""
    return SessionService(database_url)