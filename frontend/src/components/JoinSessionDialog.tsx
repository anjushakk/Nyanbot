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
import { useJoinSession } from "@/hooks/useSessions";
import { Loader2 } from "lucide-react";

interface JoinSessionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (sessionId: string) => void;
}

export default function JoinSessionDialog({
    open,
    onOpenChange,
    onSuccess,
}: JoinSessionDialogProps) {
    const [joinCode, setJoinCode] = useState("");
    const joinMutation = useJoinSession();

    const handleJoin = async () => {
        if (!joinCode.trim()) return;

        joinMutation.mutate(
            { join_code: joinCode.trim().toUpperCase() },
            {
                onSuccess: (session) => {
                    setJoinCode("");
                    onOpenChange(false);
                    onSuccess?.(session.id);
                },
            }
        );
    };

    const handleClose = () => {
        setJoinCode("");
        onOpenChange(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Auto-uppercase and limit to 6 characters
        const value = e.target.value.toUpperCase().slice(0, 6);
        setJoinCode(value);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md glass neon-border">
                <DialogHeader>
                    <DialogTitle className="text-foreground">Join Session</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Enter the 6-character join code to join an existing session
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="join-code" className="text-foreground">
                            Join Code
                        </Label>
                        <Input
                            id="join-code"
                            placeholder="ABC123"
                            value={joinCode}
                            onChange={handleInputChange}
                            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                            className="bg-secondary/50 border-border focus:border-primary font-mono text-lg tracking-wider text-center uppercase"
                            maxLength={6}
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground">
                            6 alphanumeric characters (e.g., AAFUKF)
                        </p>
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
                        onClick={handleJoin}
                        disabled={joinCode.length !== 6 || joinMutation.isPending}
                        className="bg-primary hover:bg-primary/90 neon-glow"
                    >
                        {joinMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Joining...
                            </>
                        ) : (
                            "Join Session"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
