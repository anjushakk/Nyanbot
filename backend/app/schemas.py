"""Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr


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
    id: UUID
    name: str
    join_code: str
    owner_id: UUID
    created_at: datetime
    member_count: int
    
    class Config:
        from_attributes = True
