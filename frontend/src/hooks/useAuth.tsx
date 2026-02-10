import { useState, createContext, useContext, ReactNode, useEffect } from "react";
import { authApi } from "@/lib/api";
import type { User } from "@/types";

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    signup: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem("access_token");
            if (token) {
                try {
                    const userData = await authApi.getMe();
                    setUser(userData);
                } catch (error) {
                    // Token invalid, clear it
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("user");
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await authApi.login({ username: email, password });
            localStorage.setItem("access_token", response.access_token);

            // Fetch user data
            const userData = await authApi.getMe();
            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
        } catch (error: any) {
            const message = error.response?.data?.detail || "Login failed";
            throw new Error(message);
        }
    };

    const signup = async (name: string, email: string, password: string) => {
        try {
            // Register user
            await authApi.register({ name, email, password });

            // Auto-login after registration
            await login(email, password);
        } catch (error: any) {
            const message = error.response?.data?.detail || "Registration failed";
            throw new Error(message);
        }
    };

    const logout = async () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
