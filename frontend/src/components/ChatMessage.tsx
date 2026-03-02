import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
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
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary/50 px-4 py-2 text-xs text-muted-foreground border border-border/50">
          <div className="prose prose-invert prose-xs italic">
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
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isBot ? "bg-primary/20 neon-border" : isOwnMessage ? "bg-primary/10" : "bg-secondary"
        )}
      >
        {isBot ? (
          <Bot className="h-4 w-4 text-primary" />
        ) : (
          <User className={cn("h-4 w-4", isOwnMessage ? "text-primary" : "text-muted-foreground")} />
        )}
      </div>

      <div className={cn("max-w-[80%] space-y-1.5", isOwnMessage ? "items-end flex flex-col" : "items-start flex flex-col")}>
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            {displayName}
          </span>
          <span className="text-[10px] text-muted-foreground/50">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isBot
              ? "bg-card glass neon-border text-card-foreground shadow-lg"
              : isOwnMessage 
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary/80 text-foreground"
          )}
        >
          <div className={cn(
            "prose prose-sm max-w-none",
            (isBot || !isOwnMessage) ? "prose-invert" : "prose-primary-foreground"
          )}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
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
