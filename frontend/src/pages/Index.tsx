import { useState, useRef, useEffect, useCallback } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessage, { Message } from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import PdfUploadBanner, { UploadedPdf } from "@/components/PdfUploadBanner";
import EmptyState from "@/components/EmptyState";
import { Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionsList } from "@/hooks/useSessions";
import { Loader2 } from "lucide-react";

const sampleResponses = [
  "Based on the uploaded document, **Section 3.2** discusses the implementation of vector embeddings using FAISS for semantic similarity search. The key finding is that dense retrieval outperforms sparse methods by **23%** on domain-specific queries.\\n\\n> \\\"The integration of ChromaDB with sentence transformers enables efficient storage and retrieval of document embeddings.\\\"\\n\\nWould you like me to elaborate on the embedding strategy?",
  "I found relevant information across **3 documents**:\\n\\n1. **Architecture Overview** (p.12): The system uses a microservices approach with FastAPI handling the backend API layer.\\n2. **Data Pipeline** (p.7): PDF processing involves text extraction, chunking (512 tokens with 50-token overlap), and embedding generation.\\n3. **Evaluation Results** (p.24): The RAG pipeline achieved an F1 score of **0.89** on the test dataset.\\n\\nThe key takeaway is that chunk size significantly impacts retrieval quality.",
  "Looking at your documents, I can see the system requirements specify:\\n\\n- **Backend**: Python with FastAPI\\n- **Vector Store**: ChromaDB for embeddings\\n- **Search**: FAISS for semantic similarity\\n- **Database**: PostgreSQL for metadata\\n\\nThe architecture follows a modular design pattern. Shall I create a comparison table of the different retrieval strategies mentioned?",
];

const Index = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [typing, setTyping] = useState(false);
  const [pdfs, setPdfs] = useState<UploadedPdf[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch sessions from API
  const { data: sessions = [], isLoading, error } = useSessionsList();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  const handleSessionCreated = (sessionId: string) => {
    setActiveId(sessionId);
    setSidebarOpen(false);
  };

  const handleSessionJoined = (sessionId: string) => {
    setActiveId(sessionId);
    setSidebarOpen(false);
  };

  const handleSend = (content: string) => {
    let cid = activeId;

    // If no session is active, user needs to create or join one first
    if (!cid) {
      // Could show a toast here prompting to create/join a session
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => ({
      ...prev,
      [cid!]: [...(prev[cid!] || []), userMsg],
    }));

    setTyping(true);

    // Simulate bot response (will be replaced with real API call in Phase 4)
    const delay = 1500 + Math.random() * 2000;
    const finalCid = cid;
    setTimeout(() => {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: sampleResponses[Math.floor(Math.random() * sampleResponses.length)],
        sources: [
          { name: "architecture.pdf", page: 12 },
          { name: "research.pdf", page: 7 },
        ],
        timestamp: new Date(),
      };
      setMessages((prev) => ({
        ...prev,
        [finalCid!]: [...(prev[finalCid!] || []), botMsg],
      }));
      setTyping(false);
    }, delay);
  };

  const handleUpload = (files: FileList) => {
    const newPdfs: UploadedPdf[] = Array.from(files).map((f) => ({
      name: f.name,
      status: "uploading" as const,
    }));
    setPdfs((prev) => [...prev, ...newPdfs]);

    // Simulate processing (will be replaced with real API call in Phase 3)
    newPdfs.forEach((pdf) => {
      setTimeout(() => {
        setPdfs((prev) =>
          prev.map((p) => (p.name === pdf.name ? { ...p, status: "processing" as const } : p))
        );
      }, 1000);
      setTimeout(() => {
        setPdfs((prev) =>
          prev.map((p) =>
            p.name === pdf.name ? { ...p, status: "ready" as const, pages: Math.floor(Math.random() * 50) + 5 } : p
          )
        );
      }, 3000);
    });
  };

  const currentMessages = activeId ? messages[activeId] || [] : [];
  const activeSession = sessions.find((s) => s.id === activeId);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background gradient-mesh">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading sessions...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background gradient-mesh">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-destructive">Failed to load sessions</p>
          <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background gradient-mesh">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 md:relative md:z-auto transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <ChatSidebar
          sessions={sessions}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id);
            setSidebarOpen(false);
          }}
          onSessionCreated={handleSessionCreated}
          onSessionJoined={handleSessionJoined}
        />
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-6">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1">
            {activeSession && (
              <div>
                <h2 className="text-sm font-medium text-foreground">
                  {activeSession.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {activeSession.member_count} {activeSession.member_count === 1 ? "member" : "members"}
                </p>
              </div>
            )}
          </div>
          {activeId && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-neon-cyan animate-pulse" />
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
          {currentMessages.length === 0 && !typing ? (
            <EmptyState />
          ) : (
            <div className="py-4">
              {currentMessages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {typing && <TypingIndicator />}
            </div>
          )}
        </div>

        {/* PDF Banner */}
        <PdfUploadBanner files={pdfs} onRemove={(name) => setPdfs((prev) => prev.filter((p) => p.name !== name))} />

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onUpload={handleUpload}
          disabled={typing || !activeId}
          placeholder={!activeId ? "Create or join a session to start chatting..." : undefined}
        />
      </div>
    </div>
  );
};

export default Index;
