import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: { name: string; page?: number }[];
  timestamp: Date;
}

const ChatMessage = ({ 
  message, 
  isOwnMessage 
}: { 
  message: Message; 
  isOwnMessage?: boolean;
}) => {
  const isBot = message.role === "assistant";
  const isSystem = message.role === "system";

  // System messages (document uploads, etc.)
  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="flex justify-center px-6 py-2"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary/80 backdrop-blur-sm px-4 py-1.5 text-[11px] text-muted-foreground border border-border/50 shadow-sm">
          <div className="italic opacity-80">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      </motion.div>
    );
  }

  const displayName = isBot ? "Assistant" : (message.user?.name || "User");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex gap-3 px-6 py-4", 
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg overflow-hidden relative group",
          isBot ? "bg-primary/20 neon-border" : isOwnMessage ? "bg-primary/10" : "bg-secondary"
        )}
      >
        {isBot && <div className="absolute inset-0 bg-primary/20 blur-md group-hover:bg-primary/30 transition-colors" />}
        {isBot ? (
          <Bot className="h-4 w-4 text-primary relative z-10" />
        ) : message.user?.avatar ? (
          <img src={message.user.avatar} alt="Avatar" className="h-full w-full object-cover relative z-10" />
        ) : (
          <User className={cn("h-4 w-4 relative z-10", isOwnMessage ? "text-primary" : "text-muted-foreground")} />
        )}
      </div>

      <div className={cn("max-w-[85%] space-y-1.5", isOwnMessage ? "items-end flex flex-col" : "items-start flex flex-col")}>
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-medium text-foreground/70 uppercase tracking-tight">
            {displayName}
          </span>
          <span className="text-[10px] text-muted-foreground/50">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed overflow-x-auto",
            isBot
              ? "bg-card/70 glass neon-border text-card-foreground shadow-xl shadow-primary/5"
              : isOwnMessage 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-secondary/60 backdrop-blur-sm text-foreground border border-border/50 shadow-sm"
          )}
        >
          <div className={cn(
            "prose prose-sm max-w-none break-words",
            (isBot || !isOwnMessage) ? "dark:prose-invert prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-foreground" : "text-white prose-p:text-white prose-headings:text-white prose-strong:text-white prose-li:text-white",
            "prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-border prose-th:bg-secondary/50 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2"
          )}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        </div>

        {isBot && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.sources.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                <FileText className="h-3 w-3" />
                {s.name}
                {s.page && <span className="text-primary">p.{s.page}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};


export default ChatMessage;
