# NYAN-BOT Project Architecture

NYAN-BOT is a collaborative RAG (Retrieval-Augmented Generation) chatbot designed for team-based document analysis and real-time interaction.

## 1. System Overview

The system follows a classic client-server architecture with a clear separation between the frontend UI and the backend API.

```mermaid
graph TD
    Client[React Frontend] <--> API[FastAPI Backend]
    API <--> DB[(PostgreSQL)]
    API <--> VDB[(ChromaDB Vector Store)]
    API <--> Storage[(Local/S3 Storage)]
    API -.-> AI[Groq / HuggingFace]
    
    subgraph "Frontend Stack"
        Client
        subgraph "State Management"
            TQ[TanStack Query]
        end
    end
    
    subgraph "Backend Stack"
        API
        subgraph "Data Layer"
            SQLA[SQLAlchemy ORM]
            ALM[Alembic Migrations]
        end
    end
```

## 2. Backend Architecture

The backend is built with **FastAPI**, providing a high-performance, asynchronous API.

### Core Components
- **`app/main.py`**: Entry point, initializes the FastAPI app and includes routers.
- **`app/database.py`**: Connection management for PostgreSQL using SQLAlchemy.
- **[app/models.py](file:///c:/Users/USER/OneDrive/Documents/Major%20Project/nyan/backend/app/models.py)**: SQLAlchemy models defining the relational schema.
- **`app/services/`**: Core logic services including [ChromaStore](file:///c:/Users/USER/OneDrive/Documents/Major%20Project/nyan/backend/app/services/chroma_store.py#8-99) for vector operations and LLM integrations.
- **[app/schemas.py](file:///c:/Users/USER/OneDrive/Documents/Major%20Project/nyan/backend/app/schemas.py)**: Pydantic models for request/response validation and serialization.
- **`app/routers/`**: Categorized API endpoints (Authentication, Sessions, etc.).
- **`app/utils.py`**: Shared helper functions (password hashing, JWT generation).

### Authentication Flow
The system uses **JWT (JSON Web Tokens)** for stateless authentication:
1. User provides credentials to `/api/auth/login`.
2. Backend validates credentials and returns an access token.
3. Frontend stores the token and includes it in the `Authorization: Bearer <token>` header for subsequent requests.

## 3. Frontend Architecture

The frontend is a modern **React SPA** built with **Vite** and **TypeScript**.

### Key Technologies
- **TanStack Query (React Query)**: Handles all server state, caching, synchronization, and error handling.
- **shadcn/ui & Tailwind CSS**: Provides a premium, accessible UI with utility-first styling.
- **React Router**: Manages client-side navigation.
- **Axios**: Configured API client for communicating with the backend.

### Component Structure
- **`src/pages/`**: Main page components (Home, Auth, Chat).
- **`src/components/`**: Reusable UI elements (Sidebar, ChatMessage, Dialogs).
- **`src/hooks/`**: Custom hooks for business logic and data fetching.
- **`src/lib/`**: Initialization of libraries like the API client.

## 4. Data Model

The database schema is designed to support multi-user sessions and collaborative document interaction.

```mermaid
erDiagram
    USER ||--o{ SESSION : owns
    USER ||--o{ SESSION_MEMBER : joins
    USER ||--o{ DOCUMENT : uploads
    USER ||--o{ MESSAGE : sends
    
    SESSION ||--o{ SESSION_MEMBER : contains
    SESSION ||--o{ DOCUMENT : holds
    SESSION ||--o{ MESSAGE : contains
    
    DOCUMENT ||--o{ CHUNK : splits_into
    
    USER {
        uuid id PK
        string email
        string name
        string password_hash
        datetime created_at
    }
    
    SESSION {
        uuid id PK
        string name
        string join_code
        uuid owner_id FK
        datetime created_at
    }
    
    SESSION_MEMBER {
        uuid id PK
        uuid user_id FK
        uuid session_id FK
        string role
        datetime joined_at
    }
    
    DOCUMENT {
        uuid id PK
        uuid session_id FK
        uuid uploaded_by FK
        string filename
        string storage_path
        datetime uploaded_at
    }
    
    CHUNK {
        uuid id PK
        uuid document_id FK
        text content
        integer chunk_index
    }
    
    MESSAGE {
        uuid id PK
        uuid session_id FK
        uuid user_id FK "optional"
        text content
        string role "user/assistant"
        datetime created_at
    }
```

## 5. RAG Pipeline (Planned)

The Retrieval-Augmented Generation pipeline involves:
1. **Upload**: PDFs are uploaded to a session.
2. **Chunking**: Documents are split into smaller text segments.
3. **Embedding**: Chunks are converted into vector representations using HuggingFace models.
4. **Storage**: Vectors are stored in **ChromaDB** for persistent semantic search.
5. **Retrieval**: When a query is made, relevant chunks are retrieved from ChromaDB.
6. **Generation**: The context and user query are sent to Groq (LLM) to generate an answer.

---
*Created by Antigravity*
