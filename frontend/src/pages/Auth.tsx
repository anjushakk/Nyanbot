import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Eye, EyeOff, Loader2 } from "lucide-react";

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login, signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                if (!name.trim()) {
                    setError("Name is required");
                    setLoading(false);
                    return;
                }
                await signup(name.trim(), email, password);
            }
            navigate("/");
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError("");
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background gradient-mesh p-4">
            {/* Decorative orbs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />
                <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-accent/10 blur-[100px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-neon-cyan/5 blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Logo */}
                <motion.div
                    className="mb-8 flex flex-col items-center gap-3"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 neon-border neon-glow">
                        <Bot className="h-7 w-7 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        NYAN-BOT
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Multi-user RAG Chatbot
                    </p>
                </motion.div>

                {/* Card */}
                <div className="glass neon-border rounded-xl p-6 md:p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isLogin ? "login" : "signup"}
                            initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                            transition={{ duration: 0.25 }}
                        >
                            <h2 className="mb-1 text-lg font-semibold text-foreground">
                                {isLogin ? "Welcome back" : "Create account"}
                            </h2>
                            <p className="mb-6 text-sm text-muted-foreground">
                                {isLogin
                                    ? "Sign in to continue your conversations"
                                    : "Get started with NYAN-BOT"}
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {!isLogin && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                    >
                                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                                            Name
                                        </label>
                                        <Input
                                            type="text"
                                            placeholder="Your name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="bg-secondary/50 border-border focus:border-primary"
                                        />
                                    </motion.div>
                                )}

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                                        Email
                                    </label>
                                    <Input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="bg-secondary/50 border-border focus:border-primary"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            minLength={6}
                                            className="bg-secondary/50 border-border focus:border-primary pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-sm text-destructive"
                                    >
                                        {error}
                                    </motion.p>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium neon-glow"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : isLogin ? (
                                        "Sign In"
                                    ) : (
                                        "Create Account"
                                    )}
                                </Button>
                            </form>
                        </motion.div>
                    </AnimatePresence>

                    <div className="mt-6 text-center">
                        <button
                            onClick={toggleMode}
                            className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                            {isLogin
                                ? "Don't have an account? Sign up"
                                : "Already have an account? Sign in"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;
