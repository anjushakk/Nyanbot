import axios from "axios";
import type {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    User,
    Session,
    SessionListItem,
    SessionCreate,
    SessionJoin,
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Create axios instance
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access_token");
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
            localStorage.removeItem("access_token");
            localStorage.removeItem("user");
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
