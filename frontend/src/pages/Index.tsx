import { useState, useRef, useEffect, useCallback } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import PdfUploadBanner, { UploadedPdf } from "@/components/PdfUploadBanner";
import EmptyState from "@/components/EmptyState";
import { Menu, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionsList } from "@/hooks/useSessions";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { useDocuments, useUploadDocument } from "@/hooks/useDocuments";
import type { Message } from "@/types";

const sampleResponses = [
  "Based on the uploaded document, **Section 3.2** discusses the implementation of vector embeddings using FAISS for semantic similarity search. The key finding is that dense retrieval outperforms sparse methods by **23%** on domain-specific queries.\\n\\n> \\\"The integration of ChromaDB with sentence transformers enables efficient storage and retrieval of document embeddings.\\\"\\n\\nWould you like me to elaborate on the embedding strategy?",
  "I found relevant information across **3 documents**:\\n\\n1. **Architecture Overview** (p.12): The system uses a microservices approach with FastAPI handling the backend API layer.\\n2. **Data Pipeline** (p.7): PDF processing involves text extraction, chunking (512 tokens with 50-token overlap), and embedding generation.\\n3. **Evaluation Results** (p.24): The RAG pipeline achieved an F1 score of **0.89** on the test dataset.\\n\\nThe key takeaway is that chunk size significantly impacts retrieval quality.",
  "Looking at your documents, I can see the system requirements specify:\\n\\n- **Backend**: Python with FastAPI\\n- **Vector Store**: ChromaDB for embeddings\\n- **Search**: FAISS for semantic similarity\\n- **Database**: PostgreSQL for metadata\\n\\nThe architecture follows a modular design pattern. Shall I create a comparison table of the different retrieval strategies mentioned?",
];

const Index = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pdfs, setPdfs] = useState<UploadedPdf[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch sessions, messages, and documents from API
  const { data: sessions = [], isLoading, error } = useSessionsList();
  const { data: messages = [], isLoading: messagesLoading } = useMessages(activeId);
  const { data: documents = [] } = useDocuments(activeId);
  const sendMessageMutation = useSendMessage();
  const uploadDocumentMutation = useUploadDocument();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sendMessageMutation.isPending, scrollToBottom]);

  const handleSessionCreated = (sessionId: string) => {
    setActiveId(sessionId);
    setSidebarOpen(false);
  };

  const handleSessionJoined = (sessionId: string) => {
    setActiveId(sessionId);
    setSidebarOpen(false);
  };

  const handleSend = (content: string) => {
    // If no session is active, user needs to create or join one first
    if (!activeId) {
      // Could show a toast here prompting to create/join a session
      return;
    }

    // Send message to backend
    sendMessageMutation.mutate({
      sessionId: activeId,
      content,
    });
  };

  const handleUpload = async (files: FileList) => {
    if (!activeId) {
      return;
    }

    // Upload each file to the backend
    Array.from(files).forEach((file) => {
      uploadDocumentMutation.mutate({
        sessionId: activeId,
        file,
      });
    });
  };

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
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <AnimatePresence mode="popLayout">
                {messages.map((msg) => {
                  // Convert backend message to component format
                  const componentMessage = {
                    id: msg.id,
                    role: "user" as const, // All messages from backend are user messages for now
                    content: msg.content,
                    timestamp: new Date(msg.created_at),
                  };
                  return <ChatMessage key={msg.id} message={componentMessage} />;
                })}
              </AnimatePresence>
              {sendMessageMutation.isPending && <TypingIndicator />}
            </>
          )}
        </div>

        {/* PDF Banner */}
        <PdfUploadBanner files={pdfs} onRemove={(name) => setPdfs((prev) => prev.filter((p) => p.name !== name))} />

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onUpload={handleUpload}
          disabled={sendMessageMutation.isPending || !activeId}
          placeholder={!activeId ? "Create or join a session to start chatting..." : undefined}
        />
      </div>
    </div>
  );
};

export default Index;
