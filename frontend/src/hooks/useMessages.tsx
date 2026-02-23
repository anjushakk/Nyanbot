import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messageApi } from "@/lib/api";
import { toast } from "sonner";

// Query keys
const messageKeys = {
    all: ["messages"] as const,
    bySession: (sessionId: string) => [...messageKeys.all, sessionId] as const,
};

// ============ Queries ============

export function useMessages(sessionId: string | null) {
    return useQuery({
        queryKey: messageKeys.bySession(sessionId || ""),
        queryFn: () => messageApi.getMessages(sessionId!),
        enabled: !!sessionId, // Only fetch if sessionId exists
        refetchInterval: 3000, // Poll every 3 seconds for new messages
        refetchOnWindowFocus: true,
        staleTime: 1000, // Consider data stale after 1 second
    });
}

// ============ Mutations ============

export function useSendMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId, content }: { sessionId: string; content: string }) =>
            messageApi.sendMessage(sessionId, content),
        onSuccess: (_, variables) => {
            // Invalidate messages query to refetch
            queryClient.invalidateQueries({
                queryKey: messageKeys.bySession(variables.sessionId),
            });
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.detail || "Failed to send message";
            toast.error(errorMessage);
        },
    });
}
