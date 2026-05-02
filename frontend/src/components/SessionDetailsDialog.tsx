import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/hooks/useSessions";
import { useDocuments } from "@/hooks/useDocuments";
import { Loader2, Copy, Check, Users, FileText, KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SessionDetailsDialogProps {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SessionDetailsDialog = ({ sessionId, open, onOpenChange }: SessionDetailsDialogProps) => {
  const { data: session, isLoading: sessionLoading } = useSession(sessionId);
  const { data: documents = [], isLoading: docsLoading } = useDocuments(sessionId);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = () => {
    if (session?.join_code) {
      navigator.clipboard.writeText(session.join_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const isLoading = sessionLoading || docsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {session?.name || "Session Details"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !session ? (
          <div className="text-center py-4 text-muted-foreground">Session not found.</div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Join Code Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                <KeyRound className="h-4 w-4" /> Join Code
              </h3>
              <div className="flex items-center gap-2 bg-secondary/50 p-3 rounded-lg border border-border">
                <code className="text-lg font-mono font-bold tracking-widest text-primary flex-1 text-center">
                  {session.join_code}
                </code>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={handleCopyCode}
                  className="hover:bg-primary/20 hover:text-primary transition-colors"
                >
                  {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Members Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                <Users className="h-4 w-4" /> Members ({session.members.length})
              </h3>
              <div className="space-y-2 max-h-[150px] overflow-y-auto scrollbar-thin pr-2">
                {session.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 bg-secondary/30 p-2 rounded-lg">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary overflow-hidden">
                      {member.user.avatar ? (
                        <img src={member.user.avatar} alt={member.user.name} className="h-full w-full object-cover" />
                      ) : (
                        member.user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{member.user.name}</span>
                      <span className="text-xs text-muted-foreground">{member.role === 'owner' ? 'Owner' : 'Member'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                <FileText className="h-4 w-4" /> Documents ({documents.length})
              </h3>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground italic pl-2">No documents uploaded yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto scrollbar-thin">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-md border border-border/50 text-sm">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span className="truncate max-w-[200px]">{doc.filename}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SessionDetailsDialog;
