import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Plus,
  LogIn,
  ChevronDown,
  Users,
  User,
  Settings,
  FileText,
  Bot,
  Trash2,
  LogOut,
  Crown,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteSession, useLeaveSession } from "@/hooks/useSessions";
import type { SessionListItem } from "@/types";
import SessionDialog from "./SessionDialog";
import JoinSessionDialog from "./JoinSessionDialog";

interface ChatSidebarProps {
  sessions: SessionListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onSessionCreated?: (sessionId: string) => void;
  onSessionJoined?: (sessionId: string) => void;
}

const ChatSidebar = ({
  sessions,
  activeId,
  onSelect,
  onSessionCreated,
  onSessionJoined,
}: ChatSidebarProps) => {
  const [groupOpen, setGroupOpen] = useState(true);
  const [privateOpen, setPrivateOpen] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { user, logout } = useAuth();
  const deleteMutation = useDeleteSession();
  const leaveMutation = useLeaveSession();

  // Separate sessions by role
  const ownedSessions = sessions.filter((s) => s.role === "owner");
  const memberSessions = sessions.filter((s) => s.role === "member");

  const handleDelete = (sessionId: string, role: string) => {
    if (role === "owner") {
      deleteMutation.mutate(sessionId);
    } else {
      leaveMutation.mutate(sessionId);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <>
      <div className="flex h-full w-[280px] flex-col bg-sidebar border-r border-border">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 neon-border">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            NYAN<span className="text-primary">-BOT</span>
          </h1>
        </div>

        {/* Nav Icons */}
        <div className="flex gap-1 px-4 pb-3">
          {[MessageSquare, FileText, Bot, Settings].map((Icon, i) => (
            <button
              key={i}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                i === 0
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <Button
            onClick={() => setCreateDialogOpen(true)}
            size="sm"
            className="flex-1 gap-2 bg-primary/20 text-primary hover:bg-primary/30 neon-border"
          >
            <Plus className="h-4 w-4" /> New
          </Button>
          <Button
            onClick={() => setJoinDialogOpen(true)}
            size="sm"
            variant="outline"
            className="flex-1 gap-2 border-border text-muted-foreground hover:bg-secondary"
          >
            <LogIn className="h-4 w-4" /> Join
          </Button>
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto px-3 scrollbar-thin">
          <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sessions
          </p>

          {/* Owned Sessions */}
          <button
            onClick={() => setGroupOpen(!groupOpen)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-sidebar-foreground hover:bg-secondary transition-colors"
          >
            <Crown className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">My Sessions</span>
            <ChevronDown
              className={cn(
                "ml-auto h-4 w-4 text-muted-foreground transition-transform",
                groupOpen && "rotate-180"
              )}
            />
          </button>
          <AnimatePresence>
            {groupOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                {ownedSessions.length === 0 ? (
                  <p className="py-2 pl-8 text-xs text-muted-foreground italic">-- Empty --</p>
                ) : (
                  ownedSessions.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      active={session.id === activeId}
                      onSelect={onSelect}
                      onDelete={handleDelete}
                      onCopyCode={handleCopyCode}
                      copiedCode={copiedCode}
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Joined Sessions */}
          <button
            onClick={() => setPrivateOpen(!privateOpen)}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-sidebar-foreground hover:bg-secondary transition-colors"
          >
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Joined</span>
            <ChevronDown
              className={cn(
                "ml-auto h-4 w-4 text-muted-foreground transition-transform",
                privateOpen && "rotate-180"
              )}
            />
          </button>
          <AnimatePresence>
            {privateOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                {memberSessions.length === 0 ? (
                  <p className="py-2 pl-8 text-xs text-muted-foreground italic">-- Empty --</p>
                ) : (
                  memberSessions.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      active={session.id === activeId}
                      onSelect={onSelect}
                      onDelete={handleDelete}
                      onCopyCode={handleCopyCode}
                      copiedCode={copiedCode}
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-foreground truncate">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            </div>
            <button
              onClick={() => logout()}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <SessionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={onSessionCreated}
      />
      <JoinSessionDialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        onSuccess={onSessionJoined}
      />
    </>
  );
};

const SessionItem = ({
  session,
  active,
  onSelect,
  onDelete,
  onCopyCode,
  copiedCode,
}: {
  session: SessionListItem;
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string, role: string) => void;
  onCopyCode: (code: string) => void;
  copiedCode: string | null;
}) => {
  const isOwner = session.role === "owner";
  const isCopied = copiedCode === session.join_code;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group ml-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors",
        active
          ? "bg-primary/15 text-primary neon-border"
          : "text-sidebar-foreground hover:bg-secondary"
      )}
      onClick={() => onSelect(session.id)}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate flex-1">{session.name}</span>
      {session.member_count > 1 && (
        <span className="text-[10px] text-muted-foreground">{session.member_count}</span>
      )}
      {isOwner && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopyCode(session.join_code);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
          title="Copy join code"
        >
          {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(session.id, session.role);
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        title={isOwner ? "Delete session" : "Leave session"}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
};

export default ChatSidebar;
