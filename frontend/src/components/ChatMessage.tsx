import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Bot, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { name: string; page?: number }[];
  timestamp: Date;
}

const ChatMessage = ({ message }: { message: Message }) => {
  const isBot = message.role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex gap-4 px-6 py-4", isBot ? "" : "flex-row-reverse")}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isBot ? "bg-primary/20 neon-border" : "bg-secondary"
        )}
      >
        {isBot ? <Bot className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-muted-foreground" />}
      </div>

      <div className={cn("max-w-[75%] space-y-2", isBot ? "" : "text-right")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isBot
              ? "bg-card glass neon-border text-card-foreground"
              : "bg-primary/15 text-foreground"
          )}
        >
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>

        {isBot && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
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

        <p className="text-[10px] text-muted-foreground">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
};

export default ChatMessage;
