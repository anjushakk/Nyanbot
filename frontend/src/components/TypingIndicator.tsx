import { motion } from "framer-motion";
import { Bot } from "lucide-react";

const TypingIndicator = () => (
  <div className="flex gap-4 px-6 py-4">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 neon-border">
      <Bot className="h-4 w-4 text-primary" />
    </div>
    <div className="flex items-center gap-1.5 rounded-2xl bg-card glass neon-border px-5 py-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-primary"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  </div>
);

export default TypingIndicator;
