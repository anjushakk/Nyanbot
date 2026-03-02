import { useState, createContext, useContext, ReactNode, useEffect } from "react";
import { authApi } from "@/lib/api";
import { Cookies } from "@/lib/cookies";
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

    // Check for existing session on mount from API
    useEffect(() => {
        const initAuth = async () => {
            const token = Cookies.get("access_token");
            if (token) {
                try {
                    // Always fetch fresh from API to ensure identity is correct and synced
                    const userData = await authApi.getMe();
                    setUser(userData);
                    // We can still set the cookie, but next reload will IGNORE it 
                    // and fetch from API again for perfection.
                    Cookies.set("user", JSON.stringify(userData), { expires: 7 });
                } catch (error) {
                    // Token invalid or expired, clear everything
                    Cookies.remove("access_token");
                    Cookies.remove("user");
                    setUser(null);
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            // Login and get token (token is stored in cookies by authApi.login)
            await authApi.login({ username: email, password });

            // Fetch user data and store in cookies
            const userData = await authApi.getMe();
            setUser(userData);
            Cookies.set("user", JSON.stringify(userData), { expires: 7 });
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
        Cookies.remove("access_token");
        Cookies.remove("user");
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
