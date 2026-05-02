"""Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, ConfigDict


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(UserBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Alias for use in other schemas
UserResponse = User


# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# Session schemas
class SessionCreate(BaseModel):
    name: str


class SessionJoin(BaseModel):
    join_code: str


class SessionMemberResponse(BaseModel):
    id: UUID
    user_id: UUID
    role: str
    joined_at: datetime
    user: User
    
    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    id: UUID
    name: str
    join_code: str
    owner_id: UUID
    created_at: datetime
    owner: User
    members: list[SessionMemberResponse] = []
    
    class Config:
        from_attributes = True


class SessionListItem(BaseModel):
    """Session list item with member count and role."""
    id: UUID
    name: str
    join_code: str
    owner_id: UUID
    created_at: datetime
    member_count: int
    role: str  # "owner" or "member"

    class Config:
        from_attributes = True


# ============ Message Schemas ============

class MessageCreate(BaseModel):
    """Schema for creating a new message."""
    content: str


class MessageResponse(BaseModel):
    """Schema for message response with user details."""
    id: UUID
    session_id: UUID
    user_id: Optional[UUID]  # None for AI messages
    content: str
    created_at: datetime
    role: str  # "user" or "assistant"
    user: Optional[UserResponse]  # None for AI messages

    class Config:
        from_attributes = True


# ============ Document Schemas ============

class DocumentResponse(BaseModel):
    """Schema for document response."""
    id: UUID
    session_id: UUID
    uploaded_by: UUID
    filename: str
    storage_path: str
    uploaded_at: datetime
    
    class Config:
        from_attributes = True


class DocumentListItem(BaseModel):
    """Schema for document list item."""
    id: UUID
    filename: str
    uploaded_at: datetime
    uploaded_by: UUID
    
    class Config:
        from_attributes = True
