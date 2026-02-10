import { motion } from "framer-motion";
import { Bot, Upload, Users, Zap } from "lucide-react";

const EmptyState = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="relative"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15 neon-border neon-glow">
        <Bot className="h-10 w-10 text-primary" />
      </div>
      <motion.div
        className="absolute -inset-4 rounded-3xl border border-primary/10"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-center"
    >
      <h2 className="text-3xl font-bold text-foreground mb-2">Ask me anything!</h2>
      <p className="text-muted-foreground text-sm max-w-md">
        Upload PDFs and ask questions. I'll search through your documents and provide context-aware answers.
      </p>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-3 gap-3 max-w-lg w-full"
    >
      {[
        { icon: Upload, label: "Upload PDFs", desc: "Drop your documents" },
        { icon: Zap, label: "Instant RAG", desc: "Semantic search" },
        { icon: Users, label: "Collaborate", desc: "Real-time sessions" },
      ].map(({ icon: Icon, label, desc }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="flex flex-col items-center gap-2 rounded-xl bg-card glass neon-border p-4 text-center"
        >
          <Icon className="h-5 w-5 text-primary" />
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground">{desc}</p>
        </motion.div>
      ))}
    </motion.div>
  </div>
);

export default EmptyState;
