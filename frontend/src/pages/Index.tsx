import { useState, useRef, useEffect, useCallback } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import PdfUploadBanner, { UploadedPdf } from "@/components/PdfUploadBanner";
import EmptyState from "@/components/EmptyState";
import { Menu, Loader2, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionsList } from "@/hooks/useSessions";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { useDocuments, useUploadDocument } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { user: currentUser } = useAuth();

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
    if (!activeId) return;
    sendMessageMutation.mutate({
      sessionId: activeId,
      content,
    });
  };

  const handleUpload = async (files: FileList) => {
    if (!activeId) return;
    Array.from(files).forEach((file) => {
      uploadDocumentMutation.mutate({
        sessionId: activeId,
        file,
      });
    });
  };

  const activeSession = sessions.find((s) => s.id === activeId);

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

      <div className="flex flex-1 flex-col min-w-0">
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
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={{
                      ...msg,
                      timestamp: new Date(msg.created_at)
                    }}
                    isOwnMessage={msg.user_id === currentUser?.id}
                  />
                ))}
              </AnimatePresence>
              {sendMessageMutation.isPending && <TypingIndicator />}
            </>
          )}
        </div>

        {/* Uploaded Documents List */}
        {activeId && documents.length > 0 && (
          <div className="mx-6 mb-2 flex flex-wrap gap-2 py-2 px-3 rounded-xl bg-card/50 border border-border/50">
            <div className="flex items-center gap-1.5 mr-2">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Session Files:</span>
            </div>
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-1.5 rounded-lg bg-secondary/50 px-2 py-1 text-[11px] text-foreground border border-border/30">
                <span className="max-w-[120px] truncate">{doc.filename}</span>
              </div>
            ))}
          </div>
        )}

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
