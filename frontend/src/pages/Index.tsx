import { useState, useRef, useEffect, useCallback } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import PdfUploadBanner, { UploadedPdf } from "@/components/PdfUploadBanner";
import SessionDetailsDialog from "@/components/SessionDetailsDialog";
import EmptyState from "@/components/EmptyState";
import { Menu, Loader2, FileText, X, PanelLeft, ChevronDown, Crown, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionsList } from "@/hooks/useSessions";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { useDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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
    queryFn: () => false, 
    enabled: !!activeId,
    initialData: false 
  });

  // Automatically clear activeId if the session no longer exists (deleted/left)
  useEffect(() => {
    if (activeId && sessions.length > 0) {
      const sessionExists = sessions.some(s => s.id === activeId);
      if (!sessionExists) {
        console.log("Active session no longer exists, clearing activeId");
        setActiveId(null);
      }
    } else if (activeId && sessions.length === 0 && !isLoading) {
      setActiveId(null);
    }
  }, [sessions, activeId, isLoading]);
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
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-6 relative">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="text-muted-foreground hover:text-foreground transition-colors md:hidden"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
          
          <div 
            className="flex-1 cursor-pointer hover:bg-secondary/50 py-1.5 px-3 rounded-lg transition-all -ml-3 group flex items-center justify-between"
            onClick={() => activeId && setSessionDetailsOpen(true)}
          >
            {activeSession ? (
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {activeSession.name}
                    <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </h2>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-bold">
                    {activeSession.member_count} {activeSession.member_count === 1 ? "member" : "members"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground font-medium">Select a session</div>
            )}
          </div>

          {activeId && (
            <div className="flex items-center gap-1.5 bg-secondary/30 px-2.5 py-1 rounded-full border border-border/50 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_8px_hsl(var(--neon-cyan))]" />
              <span className="text-[10px] font-medium text-muted-foreground">Live</span>
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

        {/* Session Files List (includes currently uploading files) */}
        {activeId && (documents.length > 0 || uploadingFiles.length > 0) && (
          <div className="mx-6 mb-2 flex flex-wrap gap-2 py-2 px-3 rounded-xl glass border border-border/50">
            <div className="flex items-center gap-1.5 mr-2">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Session Files:</span>
            </div>
            
            {/* Uploading Files (only visible to uploader) */}
            {uploadingFiles.map((f) => (
              <div 
                key={f.name} 
                className="flex items-center gap-2 rounded-lg bg-primary/10 px-2 py-1 text-[11px] text-foreground border border-primary/20 group"
              >
                <span className="max-w-[120px] truncate italic opacity-70">{f.name}</span>
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <button
                  onClick={() => queryClient.setQueryData(['uploading', activeId], (old: any) => (old || []).filter((u: any) => u.name !== f.name))}
                  className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors opacity-60 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {/* Ready Documents */}
            {documents
              .filter(doc => !uploadingFiles.some(f => f.name === doc.filename))
              .map((doc) => (
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
