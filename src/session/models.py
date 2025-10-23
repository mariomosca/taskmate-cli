"""
Database models for session persistence.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    Column, Integer, String, DateTime, Text, JSON, Boolean,
    ForeignKey, Index, create_engine
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from pydantic import BaseModel, Field
import json

Base = declarative_base()


class SessionModel(Base):
    """SQLAlchemy model for chat sessions."""
    
    __tablename__ = "sessions"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Session metadata
    llm_provider = Column(String, nullable=True)
    llm_model = Column(String, nullable=True)
    system_prompt = Column(Text, nullable=True)
    session_metadata = Column(JSON, nullable=True)
    
    # Relationships
    messages = relationship("MessageModel", back_populates="session", cascade="all, delete-orphan")
    contexts = relationship("ContextModel", back_populates="session", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_sessions_created_at', 'created_at'),
        Index('idx_sessions_updated_at', 'updated_at'),
        Index('idx_sessions_active', 'is_active'),
    )


class MessageModel(Base):
    """SQLAlchemy model for chat messages."""
    
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    role = Column(String, nullable=False)  # system, user, assistant
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Message metadata
    token_count = Column(Integer, nullable=True)
    model_used = Column(String, nullable=True)
    response_time = Column(Integer, nullable=True)  # milliseconds
    message_metadata = Column(JSON, nullable=True)
    
    # Relationships
    session = relationship("SessionModel", back_populates="messages")
    
    # Indexes
    __table_args__ = (
        Index('idx_messages_session_id', 'session_id'),
        Index('idx_messages_timestamp', 'timestamp'),
        Index('idx_messages_role', 'role'),
    )


class ContextModel(Base):
    """SQLAlchemy model for session context (files, tasks, etc.)."""
    
    __tablename__ = "contexts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    context_type = Column(String, nullable=False)  # file, task, project, note
    context_key = Column(String, nullable=False)  # file path, task id, etc.
    context_value = Column(Text, nullable=False)  # content, description, etc.
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Context metadata
    context_metadata = Column(JSON, nullable=True)
    
    # Relationships
    session = relationship("SessionModel", back_populates="contexts")
    
    # Indexes
    __table_args__ = (
        Index('idx_contexts_session_id', 'session_id'),
        Index('idx_contexts_type', 'context_type'),
        Index('idx_contexts_key', 'context_key'),
        Index('idx_contexts_added_at', 'added_at'),
    )


# Pydantic models for API/validation
class SessionCreate(BaseModel):
    """Pydantic model for creating a session."""
    
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    system_prompt: Optional[str] = None
    session_metadata: Optional[Dict[str, Any]] = None


class SessionUpdate(BaseModel):
    """Pydantic model for updating a session."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    system_prompt: Optional[str] = None
    session_metadata: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class MessageCreate(BaseModel):
    """Pydantic model for creating a message."""
    
    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: str = Field(..., min_length=1)
    token_count: Optional[int] = None
    model_used: Optional[str] = None
    response_time: Optional[int] = None
    message_metadata: Optional[Dict[str, Any]] = None


class ContextCreate(BaseModel):
    """Pydantic model for creating context."""
    
    context_type: str = Field(..., min_length=1)
    context_key: str = Field(..., min_length=1)
    context_value: str = Field(..., min_length=1)
    context_metadata: Optional[Dict[str, Any]] = None


class Session(BaseModel):
    """Pydantic model for session response."""
    
    id: str
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    is_active: bool
    llm_provider: Optional[str]
    llm_model: Optional[str]
    system_prompt: Optional[str]
    session_metadata: Optional[Dict[str, Any]]
    message_count: Optional[int] = None
    context_count: Optional[int] = None
    
    class Config:
        from_attributes = True


class Message(BaseModel):
    """Pydantic model for message response."""
    
    id: int
    session_id: str
    role: str
    content: str
    timestamp: datetime
    token_count: Optional[int]
    model_used: Optional[str]
    response_time: Optional[int]
    message_metadata: Optional[Dict[str, Any]]
    
    class Config:
        from_attributes = True


class Context(BaseModel):
    """Pydantic model for context response."""
    
    id: int
    session_id: str
    context_type: str
    context_key: str
    context_value: str
    added_at: datetime
    context_metadata: Optional[Dict[str, Any]]
    
    class Config:
        from_attributes = True


class SessionStats(BaseModel):
    """Pydantic model for session statistics."""
    
    total_sessions: int
    active_sessions: int
    total_messages: int
    total_contexts: int
    most_recent_session: Optional[datetime]
    most_active_session: Optional[str]


def create_database_engine(database_url: str = "sqlite:///sessions.db"):
    """Create SQLAlchemy engine for the database."""
    engine = create_engine(
        database_url,
        echo=False,  # Set to True for SQL debugging
        pool_pre_ping=True,
        connect_args={"check_same_thread": False} if "sqlite" in database_url else {}
    )
    return engine


def create_tables(engine):
    """Create all database tables."""
    Base.metadata.create_all(bind=engine)


def get_session_maker(engine):
    """Get SQLAlchemy session maker."""
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)