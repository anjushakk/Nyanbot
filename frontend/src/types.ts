// User types
export interface User {
    id: string;
    email: string;
    name: string;
    created_at: string;
}

// Auth types
export interface LoginRequest {
    username: string; // Backend expects 'username' field for email
    password: string;
}

export interface RegisterRequest {
    email: string;
    name: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
}

// Session types
export interface SessionMember {
    id: string;
    user_id: string;
    session_id: string;
    role: "owner" | "member";
    joined_at: string;
    user: User;
}

export interface Session {
    id: string;
    name: string;
    join_code: string;
    owner_id: string;
    created_at: string;
    owner: User;
    members: SessionMember[];
}

export interface SessionListItem {
    id: string;
    name: string;
    join_code: string;
    owner_id: string;
    created_at: string;
    member_count: number;
    role: "owner" | "member";
}

export interface SessionCreate {
    name: string;
}

export interface SessionJoin {
    join_code: string;
}

// Message types
export interface MessageCreate {
    content: string;
}

export interface Message {
    id: string;
    session_id: string;
    user_id: string | null;
    content: string;
    created_at: string;
    role: "user" | "assistant" | "system";
    user?: User;
}

// Document types
export interface Document {
    id: string;
    session_id: string;
    uploaded_by: string;
    filename: string;
    storage_path: string;
    uploaded_at: string;
}
