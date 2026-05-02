import { useState, useRef, useEffect, useCallback } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import PdfUploadBanner, { UploadedPdf } from "@/components/PdfUploadBanner";
import SessionDetailsDialog from "@/components/SessionDetailsDialog";
import EmptyState from "@/components/EmptyState";
import { Menu, Loader2, FileText, X, PanelLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionsList } from "@/hooks/useSessions";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { useDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const Index = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [sessionDetailsOpen, setSessionDetailsOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { data: uploadingFiles = [] } = useQuery({
    queryKey: ['uploading', activeId],
    queryFn: () => [],
    enabled: !!activeId,
    initialData: []
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && !sidebarOpen) {
        // Option: automatically open on desktop resize
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  const { user: currentUser } = useAuth();

  // Fetch sessions, messages, and documents from API
  const { data: sessions = [], isLoading, error } = useSessionsList();
  const { data: messages = [], isLoading: messagesLoading } = useMessages(activeId);
  const { data: documents = [] } = useDocuments(activeId);
  const { data: isThinking = false } = useQuery({ 
    queryKey: ['thinking', activeId], 
    queryFn: () => false, // Initial value/dummy function
    enabled: !!activeId,
    initialData: false 
  });
  const sendMessageMutation = useSendMessage();
  const uploadDocumentMutation = useUploadDocument();
  const deleteDocumentMutation = useDeleteDocument();

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
    
    const newFiles = Array.from(files).map(f => ({
      name: f.name,
      status: "uploading" as const,
      user: "You"
    }));
    
    queryClient.setQueryData(['uploading', activeId], (old: any) => [...(old || []), ...newFiles]);

    Array.from(files).forEach((file) => {
      uploadDocumentMutation.mutate({
        sessionId: activeId,
        file,
      }, {
        onSuccess: () => {
          queryClient.setQueryData(['uploading', activeId], (old: any) => 
            (old || []).filter((f: any) => f.name !== file.name)
          );
        },
        onError: () => {
          queryClient.setQueryData(['uploading', activeId], (old: any) => 
            (old || []).filter((f: any) => f.name !== file.name)
          );
        }
      });
    });
  };

  const handleRemoveDocument = (documentId: string) => {
    if (!activeId) return;
    deleteDocumentMutation.mutate({
      sessionId: activeId,
      documentId,
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

      <div 
        className={`fixed inset-y-0 left-0 z-50 md:relative md:z-auto transition-all duration-300 overflow-hidden bg-sidebar h-full ${
          sidebarOpen ? "translate-x-0 w-[280px]" : "-translate-x-full md:translate-x-0 w-[280px] md:w-0"
        }`}
      >
        <div className="w-[280px] h-full">
          <ChatSidebar
            sessions={sessions}
            activeId={activeId}
            onSelect={(id) => {
              setActiveId(id);
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            onSessionCreated={handleSessionCreated}
            onSessionJoined={handleSessionJoined}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-6">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
          <div 
            className="flex-1 cursor-pointer hover:bg-secondary/50 py-1.5 px-3 rounded-lg transition-colors -ml-3"
            onClick={() => activeId && setSessionDetailsOpen(true)}
          >
            {activeSession && (
              <div>
                <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
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
               {(sendMessageMutation.isPending || isThinking) && <TypingIndicator />}
             </>
          )}
        </div>

        {/* Uploading Files Banner */}
        <PdfUploadBanner 
          files={uploadingFiles} 
          onRemove={(name) => queryClient.setQueryData(['uploading', activeId], (old: any) => (old || []).filter((f: any) => f.name !== name))} 
        />

        {/* Uploaded Documents List */}
        {activeId && documents.length > 0 && (
          <div className="mx-6 mb-2 flex flex-wrap gap-2 py-2 px-3 rounded-xl bg-card/50 border border-border/50">
            <div className="flex items-center gap-1.5 mr-2">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Session Files:</span>
            </div>
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="flex items-center gap-2 rounded-lg bg-secondary/50 px-2 py-1 text-[11px] text-foreground border border-border/30 group"
              >
                <span className="max-w-[120px] truncate">{doc.filename}</span>
                <button
                  onClick={() => handleRemoveDocument(doc.id)}
                  className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors opacity-60 group-hover:opacity-100"
                  title="Remove document"
                >
                  <X className="h-3 w-3" />
                </button>
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

      <SessionDetailsDialog 
        sessionId={activeId}
        open={sessionDetailsOpen}
        onOpenChange={setSessionDetailsOpen}
      />
    </div>
  );
};

export default Index;
