"""
Repository layer for session persistence operations.
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session as SQLSession, joinedload
from sqlalchemy import desc, func, and_, or_

from .models import (
    SessionModel, MessageModel, ContextModel,
    SessionCreate, SessionUpdate, MessageCreate, ContextCreate,
    Session, Message, Context, SessionStats
)


class SessionRepository:
    """Repository for session operations."""
    
    def __init__(self, db_session: SQLSession):
        self.db = db_session
    
    def create_session(self, session_data: SessionCreate) -> Session:
        """Create a new session."""
        session_id = str(uuid.uuid4())
        
        db_session = SessionModel(
            id=session_id,
            name=session_data.name,
            description=session_data.description,
            llm_provider=session_data.llm_provider,
            llm_model=session_data.llm_model,
            system_prompt=session_data.system_prompt,
            session_metadata=session_data.session_metadata
        )
        
        self.db.add(db_session)
        self.db.commit()
        self.db.refresh(db_session)
        
        return self._to_session_model(db_session)
    
    def get_session(self, session_id: str) -> Optional[Session]:
        """Get a session by ID."""
        db_session = self.db.query(SessionModel).filter(
            SessionModel.id == session_id
        ).first()
        
        if not db_session:
            return None
        
        return self._to_session_model(db_session)
    
    def get_sessions(
        self,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True,
        search: Optional[str] = None
    ) -> List[Session]:
        """Get sessions with pagination and filtering."""
        query = self.db.query(SessionModel)
        
        if active_only:
            query = query.filter(SessionModel.is_active == True)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    SessionModel.name.ilike(search_term),
                    SessionModel.description.ilike(search_term)
                )
            )
        
        query = query.order_by(desc(SessionModel.updated_at))
        query = query.offset(skip).limit(limit)
        
        db_sessions = query.all()
        return [self._to_session_model(session) for session in db_sessions]
    
    def update_session(self, session_id: str, session_data: SessionUpdate) -> Optional[Session]:
        """Update a session."""
        db_session = self.db.query(SessionModel).filter(
            SessionModel.id == session_id
        ).first()
        
        if not db_session:
            return None
        
        update_data = session_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_session, field, value)
        
        db_session.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_session)
        
        return self._to_session_model(db_session)
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session (soft delete by setting is_active=False)."""
        db_session = self.db.query(SessionModel).filter(
            SessionModel.id == session_id
        ).first()
        
        if not db_session:
            return False
        
        db_session.is_active = False
        db_session.updated_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def hard_delete_session(self, session_id: str) -> bool:
        """Permanently delete a session and all related data."""
        db_session = self.db.query(SessionModel).filter(
            SessionModel.id == session_id
        ).first()
        
        if not db_session:
            return False
        
        self.db.delete(db_session)
        self.db.commit()
        
        return True
    
    def get_recent_sessions(self, limit: int = 10) -> List[Session]:
        """Get most recently updated sessions."""
        db_sessions = self.db.query(SessionModel).filter(
            SessionModel.is_active == True
        ).order_by(desc(SessionModel.updated_at)).limit(limit).all()
        
        return [self._to_session_model(session) for session in db_sessions]
    
    def _to_session_model(self, db_session: SessionModel) -> Session:
        """Convert SQLAlchemy model to Pydantic model."""
        # Count messages and contexts
        message_count = self.db.query(func.count(MessageModel.id)).filter(
            MessageModel.session_id == db_session.id
        ).scalar()
        
        context_count = self.db.query(func.count(ContextModel.id)).filter(
            ContextModel.session_id == db_session.id
        ).scalar()
        
        return Session(
            id=db_session.id,
            name=db_session.name,
            description=db_session.description,
            created_at=db_session.created_at,
            updated_at=db_session.updated_at,
            is_active=db_session.is_active,
            llm_provider=db_session.llm_provider,
            llm_model=db_session.llm_model,
            system_prompt=db_session.system_prompt,
            session_metadata=db_session.session_metadata,
            message_count=message_count,
            context_count=context_count
        )


class MessageRepository:
    """Repository for message operations."""
    
    def __init__(self, db_session: SQLSession):
        self.db = db_session
    
    def add_message(self, session_id: str, message_data: MessageCreate) -> Message:
        """Add a message to a session."""
        db_message = MessageModel(
            session_id=session_id,
            role=message_data.role,
            content=message_data.content,
            token_count=message_data.token_count,
            model_used=message_data.model_used,
            response_time=message_data.response_time,
            message_metadata=message_data.message_metadata
        )
        
        self.db.add(db_message)
        
        # Update session's updated_at timestamp
        self.db.query(SessionModel).filter(
            SessionModel.id == session_id
        ).update({"updated_at": datetime.utcnow()})
        
        self.db.commit()
        self.db.refresh(db_message)
        
        return self._to_message_model(db_message)
    
    def _to_message_model(self, db_message: MessageModel) -> Message:
        """Convert SQLAlchemy model to Pydantic model."""
        return Message(
            id=db_message.id,
            session_id=db_message.session_id,
            role=db_message.role,
            content=db_message.content,
            timestamp=db_message.timestamp,
            token_count=db_message.token_count,
            model_used=db_message.model_used,
            response_time=db_message.response_time,
            message_metadata=db_message.message_metadata
        )
    
    def get_messages(
        self,
        session_id: str,
        skip: int = 0,
        limit: int = 100,
        role_filter: Optional[str] = None
    ) -> List[Message]:
        """Get messages for a session."""
        query = self.db.query(MessageModel).filter(
            MessageModel.session_id == session_id
        )
        
        if role_filter:
            query = query.filter(MessageModel.role == role_filter)
        
        query = query.order_by(MessageModel.timestamp)
        query = query.offset(skip).limit(limit)
        
        db_messages = query.all()
        return [self._to_message_model(message) for message in db_messages]
    
    def get_conversation_history(self, session_id: str, limit: int = 50) -> List[Message]:
        """Get recent conversation history for a session."""
        db_messages = self.db.query(MessageModel).filter(
            MessageModel.session_id == session_id
        ).order_by(desc(MessageModel.timestamp)).limit(limit).all()
        
        # Reverse to get chronological order
        db_messages.reverse()
        return [self._to_message_model(message) for message in db_messages]
    
    def delete_message(self, message_id: int) -> bool:
        """Delete a message."""
        db_message = self.db.query(MessageModel).filter(
            MessageModel.id == message_id
        ).first()
        
        if not db_message:
            return False
        
        self.db.delete(db_message)
        self.db.commit()
        
        return True
    
    def clear_session_messages(self, session_id: str) -> int:
        """Clear all messages from a session. Returns count of deleted messages."""
        count = self.db.query(MessageModel).filter(
            MessageModel.session_id == session_id
        ).count()
        
        self.db.query(MessageModel).filter(
            MessageModel.session_id == session_id
        ).delete()
        
        self.db.commit()
        
        return count


class ContextRepository:
    """Repository for context operations."""
    
    def __init__(self, db_session: SQLSession):
        self.db = db_session
    
    def add_context(self, session_id: str, context_data: ContextCreate) -> Context:
        """Add context to a session."""
        db_context = ContextModel(
            session_id=session_id,
            context_type=context_data.context_type,
            context_key=context_data.context_key,
            context_value=context_data.context_value,
            context_metadata=context_data.context_metadata
        )
        
        self.db.add(db_context)
        
        # Update session's updated_at timestamp
        self.db.query(SessionModel).filter(
            SessionModel.id == session_id
        ).update({"updated_at": datetime.utcnow()})
        
        self.db.commit()
        self.db.refresh(db_context)
        
        return self._to_context_model(db_context)
    
    def _to_context_model(self, db_context: ContextModel) -> Context:
        """Convert SQLAlchemy model to Pydantic model."""
        return Context(
            id=db_context.id,
            session_id=db_context.session_id,
            context_type=db_context.context_type,
            context_key=db_context.context_key,
            context_value=db_context.context_value,
            added_at=db_context.added_at,
            context_metadata=db_context.context_metadata
        )
    
    def get_contexts(
        self,
        session_id: str,
        context_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Context]:
        """Get contexts for a session."""
        query = self.db.query(ContextModel).filter(
            ContextModel.session_id == session_id
        )
        
        if context_type:
            query = query.filter(ContextModel.context_type == context_type)
        
        query = query.order_by(ContextModel.added_at)
        query = query.offset(skip).limit(limit)
        
        db_contexts = query.all()
        return [self._to_context_model(context) for context in db_contexts]
    
    def get_context_by_key(
        self,
        session_id: str,
        context_type: str,
        context_key: str
    ) -> Optional[Context]:
        """Get specific context by type and key."""
        db_context = self.db.query(ContextModel).filter(
            and_(
                ContextModel.session_id == session_id,
                ContextModel.context_type == context_type,
                ContextModel.context_key == context_key
            )
        ).first()
        
        if not db_context:
            return None
        
        return self._to_context_model(db_context)
    
    def update_context(
        self,
        context_id: int,
        context_value: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Context]:
        """Update context value and metadata."""
        db_context = self.db.query(ContextModel).filter(
            ContextModel.id == context_id
        ).first()
        
        if not db_context:
            return None
        
        db_context.context_value = context_value
        if metadata is not None:
            db_context.context_metadata = metadata
        
        self.db.commit()
        self.db.refresh(db_context)
        
        return self._to_context_model(db_context)
    
    def delete_context(self, context_id: int) -> bool:
        """Delete a context."""
        db_context = self.db.query(ContextModel).filter(
            ContextModel.id == context_id
        ).first()
        
        if not db_context:
            return False
        
        self.db.delete(db_context)
        self.db.commit()
        
        return True
    
    def clear_session_contexts(self, session_id: str, context_type: Optional[str] = None) -> int:
        """Clear contexts from a session. Returns count of deleted contexts."""
        query = self.db.query(ContextModel).filter(
            ContextModel.session_id == session_id
        )
        
        if context_type:
            query = query.filter(ContextModel.context_type == context_type)
        
        count = query.count()
        query.delete()
        self.db.commit()
        
        return count


class StatsRepository:
    """Repository for statistics operations."""
    
    def __init__(self, db_session: SQLSession):
        self.db = db_session
    
    def get_session_stats(self) -> SessionStats:
        """Get overall session statistics."""
        total_sessions = self.db.query(func.count(SessionModel.id)).scalar()
        active_sessions = self.db.query(func.count(SessionModel.id)).filter(
            SessionModel.is_active == True
        ).scalar()
        total_messages = self.db.query(func.count(MessageModel.id)).scalar()
        total_contexts = self.db.query(func.count(ContextModel.id)).scalar()
        
        # Most recent session
        most_recent = self.db.query(func.max(SessionModel.updated_at)).scalar()
        
        # Most active session (by message count)
        most_active_query = self.db.query(
            SessionModel.id,
            func.count(MessageModel.id).label('message_count')
        ).join(MessageModel).group_by(SessionModel.id).order_by(
            desc('message_count')
        ).first()
        
        most_active_session = most_active_query[0] if most_active_query else None
        
        return SessionStats(
            total_sessions=total_sessions,
            active_sessions=active_sessions,
            total_messages=total_messages,
            total_contexts=total_contexts,
            most_recent_session=most_recent,
            most_active_session=most_active_session
        )