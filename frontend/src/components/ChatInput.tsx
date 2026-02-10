import { useState, useRef, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onUpload: (files: FileList) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput = ({ onSend, onUpload, disabled, placeholder }: ChatInputProps) => {
  const [value, setValue] = useState("");
  const [model, setModel] = useState("RAG-Fusion");
  const [showModels, setShowModels] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const models = ["RAG-Fusion", "Dense Retrieval", "Hybrid Search", "Reranker+"];

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-6 pb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl bg-card glass neon-border neon-glow"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder || "Type anything..."}
          rows={1}
          disabled={disabled}
          className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          style={{ minHeight: 44, maxHeight: 120 }}
        />

        <div className="flex items-center gap-2 px-3 pb-3">
          {/* Sparkle */}
          <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary hover:bg-secondary/80 transition-colors">
            <Sparkles className="h-4 w-4" />
          </button>

          {/* Upload PDF */}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && onUpload(e.target.files)}
          />

          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModels(!showModels)}
              className="flex h-9 items-center gap-2 rounded-lg bg-secondary px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              {model}
              <ChevronDown className={cn("h-3 w-3 transition-transform", showModels && "rotate-180")} />
            </button>
            {showModels && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-0 mb-2 w-44 rounded-xl bg-popover border border-border p-1 shadow-xl"
              >
                {models.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setModel(m);
                      setShowModels(false);
                    }}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-xs transition-colors",
                      m === model ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className={cn(
              "ml-auto flex h-9 w-9 items-center justify-center rounded-lg transition-all",
              value.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/80 neon-glow"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatInput;
