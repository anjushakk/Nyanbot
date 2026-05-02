import { useState, useMemo, useEffect } from "react";
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
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteSession, useLeaveSession } from "@/hooks/useSessions";
import type { SessionListItem } from "@/types";
import SessionDialog from "./SessionDialog";
import JoinSessionDialog from "./JoinSessionDialog";
import SettingsDialog from "./SettingsDialog";
import { Input } from "@/components/ui/input";

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
  const [groupOpen, setGroupOpen] = useState(false);
  const [privateOpen, setPrivateOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { user, logout } = useAuth();
  const deleteMutation = useDeleteSession();
  const leaveMutation = useLeaveSession();

  // Separate sessions by role, filter by search, and sort by date
  const ownedSessions = useMemo(() => {
    return sessions
      .filter((s) => s.role === "owner" && s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [sessions, searchQuery]);

  const memberSessions = useMemo(() => {
    return sessions
      .filter((s) => s.role === "member" && s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [sessions, searchQuery]);

  // Auto-expand groups when searching
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setGroupOpen(true);
      setPrivateOpen(true);
    }
  }, [searchQuery]);

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
          {[
            { icon: MessageSquare, onClick: () => {} },
            { icon: Settings, onClick: () => setSettingsOpen(true) },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                i === 0
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
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
        <div className="flex-1 overflow-y-auto px-3 pb-10 flex flex-col gap-2">
          <div className="px-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 bg-secondary/50 border-transparent text-xs placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/50"
              />
            </div>
          </div>

          {/* Owned Sessions */}
          <div className="relative">
            <button
              onClick={() => setGroupOpen(!groupOpen)}
              className="sticky top-0 z-10 flex w-full items-center gap-2.5 rounded-xl px-3 py-3.5 text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all group bg-sidebar/95 backdrop-blur-sm shadow-sm border-b border-border/10"
            >
              <Crown className="h-4 w-4 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]" />
              <span>My Sessions</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-secondary/80 text-[10px] font-bold">{ownedSessions.length}</span>
              <ChevronDown
                className={cn(
                  "ml-auto h-4 w-4 transition-transform duration-300 text-muted-foreground/50 group-hover:text-foreground",
                  groupOpen && "rotate-180"
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {groupOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 flex flex-col gap-0.5 pb-3">
                    {ownedSessions.length === 0 ? (
                      <p className="py-3 pl-10 text-xs text-muted-foreground/50 italic">No owned sessions</p>
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Joined Sessions */}
          <div className="mt-4 relative">
            <button
              onClick={() => setPrivateOpen(!privateOpen)}
              className="sticky top-0 z-10 flex w-full items-center gap-2.5 rounded-xl px-3 py-3.5 text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all group bg-sidebar/95 backdrop-blur-sm shadow-sm border-b border-border/10"
            >
              <Users className="h-4 w-4 text-primary/70" />
              <span>Joined Sessions</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-secondary/80 text-[10px] font-bold">{memberSessions.length}</span>
              <ChevronDown
                className={cn(
                  "ml-auto h-4 w-4 transition-transform duration-300 text-muted-foreground/50 group-hover:text-foreground",
                  privateOpen && "rotate-180"
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {privateOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 flex flex-col gap-0.5 pb-2">
                    {memberSessions.length === 0 ? (
                      <p className="py-3 pl-10 text-xs text-muted-foreground/50 italic">No joined sessions</p>
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* User */}
        <div className="border-t border-border px-4 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase() || "U"
              )}
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
      <SettingsDialog 
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
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
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group mx-1 mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm cursor-pointer transition-all duration-200 border border-transparent",
        active
          ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]"
          : "text-sidebar-foreground/80 hover:bg-secondary/80 hover:text-foreground hover:border-border/50"
      )}
      onClick={() => onSelect(session.id)}
    >
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
        active ? "bg-primary/20 text-primary" : "bg-secondary/50 text-muted-foreground group-hover:bg-secondary group-hover:text-foreground"
      )}>
        <MessageSquare className="h-4 w-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate font-medium">{session.name}</span>
          {session.member_count > 1 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded-full">
              <Users className="h-2.5 w-2.5" />
              {session.member_count}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
        {isOwner && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyCode(session.join_code);
            }}
            className="p-1.5 rounded-md hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
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
          className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
          title={isOwner ? "Delete session" : "Leave session"}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

export default ChatSidebar;
