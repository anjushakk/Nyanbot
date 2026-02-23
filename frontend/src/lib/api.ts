import axios from "axios";
import { Cookies } from "./cookies";
import type {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    User,
    Session,
    SessionListItem,
    SessionCreate,
    SessionJoin,
    Message,
    Document,
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Create axios instance
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor to add auth token from cookies
api.interceptors.request.use(
    (config) => {
        const token = Cookies.get("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            Cookies.remove("access_token");
            Cookies.remove("user");
            window.location.href = "/auth";
        }
        return Promise.reject(error);
    }
);

// ============ Auth API ============

export const authApi = {
    async register(data: RegisterRequest): Promise<User> {
        const response = await api.post<User>("/api/auth/register", data);
        return response.data;
    },

    async login(data: LoginRequest): Promise<AuthResponse> {
        // Backend expects form data for OAuth2
        const formData = new URLSearchParams();
        formData.append("username", data.username);
        formData.append("password", data.password);

        const response = await api.post<AuthResponse>("/api/auth/login", formData, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        // Store token in cookies (7 days expiry)
        // User data will be fetched and stored by useAuth hook
        Cookies.set("access_token", response.data.access_token, { expires: 7 });

        return response.data;
    },

    async getMe(): Promise<User> {
        const response = await api.get<User>("/api/auth/me");
        return response.data;
    },
};

// ============ Session API ============

export const sessionApi = {
    async createSession(data: SessionCreate): Promise<Session> {
        const response = await api.post<Session>("/api/sessions", data);
        return response.data;
    },

    async listSessions(): Promise<SessionListItem[]> {
        const response = await api.get<SessionListItem[]>("/api/sessions");
        return response.data;
    },

    async getSession(sessionId: string): Promise<Session> {
        const response = await api.get<Session>(`/api/sessions/${sessionId}`);
        return response.data;
    },

    async joinSession(data: SessionJoin): Promise<Session> {
        const response = await api.post<Session>("/api/sessions/join", data);
        return response.data;
    },

    async leaveSession(sessionId: string): Promise<void> {
        await api.delete(`/api/sessions/${sessionId}/leave`);
    },

    async deleteSession(sessionId: string): Promise<void> {
        await api.delete(`/api/sessions/${sessionId}`);
    },
};

// ============ Message API ============

export const messageApi = {
    async sendMessage(sessionId: string, content: string): Promise<Message> {
        const response = await api.post<Message>(
            `/api/sessions/${sessionId}/messages`,
            { content }
        );
        return response.data;
    },

    async getMessages(sessionId: string, limit = 100, offset = 0): Promise<Message[]> {
        const response = await api.get<Message[]>(
            `/api/sessions/${sessionId}/messages`,
            { params: { limit, offset } }
        );
        return response.data;
    },
};

// ============ Document API ============

export const documentApi = {
    async uploadDocument(sessionId: string, file: File): Promise<Document> {
        const formData = new FormData();
        formData.append("file", file);

        const response = await api.post<Document>(
            `/api/sessions/${sessionId}/documents`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        return response.data;
    },

    async listDocuments(sessionId: string): Promise<Document[]> {
        const response = await api.get<Document[]>(
            `/api/sessions/${sessionId}/documents`
        );
        return response.data;
    },

    async deleteDocument(sessionId: string, documentId: string): Promise<void> {
        await api.delete(`/api/sessions/${sessionId}/documents/${documentId}`);
    },
};
