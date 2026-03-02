import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionApi } from "@/lib/api";
import type { Session, SessionListItem, SessionCreate, SessionJoin } from "@/types";
import { useToast } from "@/hooks/use-toast";

// Query keys
export const sessionKeys = {
    all: ["sessions"] as const,
    lists: () => [...sessionKeys.all, "list"] as const,
    list: () => [...sessionKeys.lists()] as const,
    details: () => [...sessionKeys.all, "detail"] as const,
    detail: (id: string) => [...sessionKeys.details(), id] as const,
};

// ============ Queries ============

export function useSessionsList() {
    return useQuery({
        queryKey: sessionKeys.list(),
        queryFn: () => sessionApi.listSessions(),
        staleTime: 30000, // 30 seconds
        refetchOnWindowFocus: true, // Refetch when user returns to tab
        refetchOnReconnect: true, // Refetch when reconnecting
    });
}

export function useSession(sessionId: string | null) {
    return useQuery({
        queryKey: sessionKeys.detail(sessionId || ""),
        queryFn: () => sessionApi.getSession(sessionId!),
        enabled: !!sessionId,
        staleTime: 30000,
    });
}

// ============ Mutations ============

export function useCreateSession() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (data: SessionCreate) => sessionApi.createSession(data),
        onSuccess: (newSession) => {
            // Update the sessions list cache
            queryClient.setQueryData<SessionListItem[]>(sessionKeys.list(), (old = []) => [
                {
                    id: newSession.id,
                    name: newSession.name,
                    join_code: newSession.join_code,
                    owner_id: newSession.owner_id,
                    created_at: newSession.created_at,
                    member_count: newSession.members.length,
                    role: "owner" as const,
                },
                ...old,
            ]);

            toast({
                title: "Session created!",
                description: `Join code: ${newSession.join_code}`,
            });
        },
        onError: (error: any) => {
            toast({
                title: "Failed to create session",
                description: error.response?.data?.detail || "Something went wrong",
                variant: "destructive",
            });
        },
    });
}

export function useJoinSession() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (data: SessionJoin) => sessionApi.joinSession(data),
        onSuccess: (session) => {
            // Invalidate sessions list to refetch
            queryClient.invalidateQueries({ queryKey: sessionKeys.list() });

            toast({
                title: "Joined session!",
                description: `You joined "${session.name}"`,
            });
        },
        onError: (error: any) => {
            const message = error.response?.data?.detail || "Failed to join session";
            toast({
                title: "Join failed",
                description: message,
                variant: "destructive",
            });
        },
    });
}

export function useLeaveSession() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (sessionId: string) => sessionApi.leaveSession(sessionId),
        onSuccess: (_, sessionId) => {
            // Remove from cache
            queryClient.setQueryData<SessionListItem[]>(sessionKeys.list(), (old = []) =>
                old.filter((s) => s.id !== sessionId)
            );

            toast({
                title: "Left session",
                description: "You have left the session",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Failed to leave session",
                description: error.response?.data?.detail || "Something went wrong",
                variant: "destructive",
            });
        },
    });
}

export function useDeleteSession() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (sessionId: string) => sessionApi.deleteSession(sessionId),
        onSuccess: (_, sessionId) => {
            // Remove from cache
            queryClient.setQueryData<SessionListItem[]>(sessionKeys.list(), (old = []) =>
                old.filter((s) => s.id !== sessionId)
            );

            toast({
                title: "Session deleted",
                description: "The session has been deleted",
            });
        },
        onError: (error: any) => {
            const message =
                error.response?.status === 403
                    ? "Only the owner can delete this session"
                    : error.response?.data?.detail || "Failed to delete session";

            toast({
                title: "Delete failed",
                description: message,
                variant: "destructive",
            });
        },
    });
}
