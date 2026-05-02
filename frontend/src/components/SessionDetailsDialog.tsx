import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession, useRemoveMember } from "@/hooks/useSessions";
import { useDocuments, useDeleteDocument } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Copy, Check, Users, FileText, KeyRound, UserMinus, Trash2, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SessionDetailsDialogProps {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SessionDetailsDialog = ({ sessionId, open, onOpenChange }: SessionDetailsDialogProps) => {
  const { user: currentUser } = useAuth();
  const { data: session, isLoading: sessionLoading } = useSession(sessionId);
  const { data: documents = [], isLoading: docsLoading } = useDocuments(sessionId);
  const removeMemberMutation = useRemoveMember(sessionId || "");
  const deleteDocMutation = useDeleteDocument();
  
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = () => {
    if (session?.join_code) {
      navigator.clipboard.writeText(session.join_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const isOwner = session?.owner_id === currentUser?.id;
  const isLoading = sessionLoading || docsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-[#0F0F12]/95 backdrop-blur-xl border-white/5 text-foreground p-0 overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
        <div className="relative">
          {/* Decorative background */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
          
          <div className="relative p-8">
            <DialogHeader className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">WORKSPACE CONFIG</h3>
                {isOwner && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[9px] uppercase tracking-widest font-bold border border-primary/20">
                    <Shield className="h-3 w-3" /> System Owner
                  </div>
                )}
              </div>
              <DialogTitle className="text-3xl font-black tracking-tight text-white/90">
                {session?.name || "Session Details"}
              </DialogTitle>
            </DialogHeader>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                  <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
                </div>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest animate-pulse">Syncing environment...</p>
              </div>
            ) : !session ? (
              <div className="text-center py-16 text-muted-foreground font-mono text-sm border-2 border-dashed border-white/5 rounded-3xl mb-4">
                ERROR: SESSION_DATA_NOT_FOUND
              </div>
            ) : (
              <div className="space-y-10">
                {/* Access Key Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black text-muted-foreground/50 flex items-center gap-2 uppercase tracking-[0.2em]">
                      <KeyRound className="h-3.5 w-3.5" /> ACCESS IDENTIFIER
                    </h3>
                  </div>
                  <div className="group relative flex items-center gap-4 bg-white/[0.03] hover:bg-white/[0.05] p-5 rounded-[2rem] border border-white/5 transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(var(--primary-rgb),0.2)]">
                    <div className="flex-1 text-center">
                      <code className="text-4xl font-black tracking-[0.4em] text-primary drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)] transition-all group-hover:tracking-[0.5em] pl-6">
                        {session.join_code}
                      </code>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={handleCopyCode}
                      className="h-12 w-12 rounded-2xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-all duration-300 active:scale-90"
                    >
                      {copiedCode ? <Check className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-10">
                  {/* Members Section */}
                  <div className="space-y-5">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[10px] font-black text-muted-foreground/50 flex items-center gap-2 uppercase tracking-[0.2em]">
                        <Users className="h-3.5 w-3.5" /> ACTIVE PARTICIPANTS
                      </h3>
                      <span className="text-[10px] bg-white/5 text-white/50 px-2 py-0.5 rounded-full font-bold border border-white/5">{session.members.length}</span>
                    </div>
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 transition-all">
                      {session.members.map((member) => (
                        <div key={member.id} className="group flex items-center gap-4 bg-white/[0.02] hover:bg-white/[0.05] p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300">
                          <div className="relative shrink-0">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20 overflow-hidden font-black text-lg">
                              {member.user.avatar ? (
                                <img src={member.user.avatar} alt={member.user.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                              ) : (
                                member.user.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            {member.role === 'owner' && (
                              <div className="absolute -top-1.5 -right-1.5 bg-primary rounded-lg p-1 border-2 border-[#0F0F12] shadow-lg">
                                <Shield className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-bold text-white/90 truncate flex items-center gap-2">
                              {member.user.name}
                              {member.user.id === currentUser?.id && <span className="text-[9px] text-primary/60 font-black uppercase tracking-tighter opacity-70">(YOU)</span>}
                            </span>
                            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold opacity-60 group-hover:opacity-100 transition-opacity">{member.role} • {new Date(member.joined_at).toLocaleDateString()}</span>
                          </div>
                          
                          {isOwner && member.user.id !== currentUser?.id && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeMemberMutation.mutate(member.user.id)}
                              disabled={removeMemberMutation.isPending}
                              className="opacity-0 group-hover:opacity-100 h-9 w-9 rounded-xl hover:bg-destructive/20 hover:text-destructive transition-all duration-300"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="space-y-5">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[10px] font-black text-muted-foreground/50 flex items-center gap-2 uppercase tracking-[0.2em]">
                        <FileText className="h-3.5 w-3.5" /> SYSTEM KNOWLEDGE
                      </h3>
                      <span className="text-[10px] bg-white/5 text-white/50 px-2 py-0.5 rounded-full font-bold border border-white/5">{documents.length}</span>
                    </div>
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-white/10 pb-6">
                      {documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-white/5 rounded-3xl gap-3 bg-white/[0.01]">
                          <FileText className="h-10 w-10 text-white/5" />
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-40">Empty Archive</p>
                        </div>
                      ) : (
                        documents.map((doc) => (
                          <div key={doc.id} className="group flex items-center gap-4 bg-white/[0.02] hover:bg-white/[0.05] p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300">
                            <div className="h-12 w-12 shrink-0 flex items-center justify-center rounded-2xl bg-white/5 text-primary/70 group-hover:text-primary transition-colors">
                              <FileText className="h-6 w-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white/80 truncate group-hover:text-white transition-colors">{doc.filename}</p>
                              <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest opacity-60">
                                {new Date(doc.uploaded_at).toLocaleDateString()} • {new Date(doc.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {isOwner && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteDocMutation.mutate({ sessionId: session.id, documentId: doc.id })}
                                disabled={deleteDocMutation.isPending}
                                className="opacity-0 group-hover:opacity-100 h-9 w-9 rounded-xl hover:bg-destructive/20 hover:text-destructive transition-all duration-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDetailsDialog;
