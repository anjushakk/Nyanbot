import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateSession } from "@/hooks/useSessions";
import { Loader2, Copy, Check } from "lucide-react";

interface SessionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (sessionId: string) => void;
}

export default function SessionDialog({ open, onOpenChange, onSuccess }: SessionDialogProps) {
    const [name, setName] = useState("");
    const [createdSession, setCreatedSession] = useState<{ id: string; join_code: string } | null>(
        null
    );
    const [copied, setCopied] = useState(false);

    const createMutation = useCreateSession();

    const handleCreate = async () => {
        if (!name.trim()) return;

        createMutation.mutate(
            { name: name.trim() },
            {
                onSuccess: (session) => {
                    setCreatedSession({ id: session.id, join_code: session.join_code });
                    onSuccess?.(session.id);
                },
            }
        );
    };

    const handleCopyCode = () => {
        if (createdSession) {
            navigator.clipboard.writeText(createdSession.join_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setName("");
        setCreatedSession(null);
        setCopied(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md glass neon-border">
                {!createdSession ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-foreground">Create New Session</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Start a new collaborative chat session
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="session-name" className="text-foreground">
                                    Session Name
                                </Label>
                                <Input
                                    id="session-name"
                                    placeholder="e.g., Project Discussion"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                                    className="bg-secondary/50 border-border focus:border-primary"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                className="border-border hover:bg-secondary/50"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={!name.trim() || createMutation.isPending}
                                className="bg-primary hover:bg-primary/90 neon-glow"
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create Session"
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-foreground">Session Created! 🎉</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Share this join code with others to invite them
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label className="text-foreground">Join Code</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={createdSession.join_code}
                                        readOnly
                                        className="bg-secondary/50 border-border font-mono text-lg tracking-wider text-center"
                                    />
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={handleCopyCode}
                                        className="border-border hover:bg-secondary/50"
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleClose} className="w-full bg-primary hover:bg-primary/90">
                                Done
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
