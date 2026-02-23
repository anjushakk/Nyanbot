import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentApi } from "@/lib/api";
import { toast } from "sonner";

// Query keys
const documentKeys = {
    all: ["documents"] as const,
    bySession: (sessionId: string) => [...documentKeys.all, sessionId] as const,
};

// ============ Queries ============

export function useDocuments(sessionId: string | null) {
    return useQuery({
        queryKey: documentKeys.bySession(sessionId || ""),
        queryFn: () => documentApi.listDocuments(sessionId!),
        enabled: !!sessionId, // Only fetch if sessionId exists
        refetchOnWindowFocus: true,
    });
}

// ============ Mutations ============

export function useUploadDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId, file }: { sessionId: string; file: File }) =>
            documentApi.uploadDocument(sessionId, file),
        onSuccess: (_, variables) => {
            // Invalidate documents query to refetch
            queryClient.invalidateQueries({
                queryKey: documentKeys.bySession(variables.sessionId),
            });
            toast.success("Document uploaded successfully");
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.detail || "Failed to upload document";
            toast.error(errorMessage);
        },
    });
}

export function useDeleteDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId, documentId }: { sessionId: string; documentId: string }) =>
            documentApi.deleteDocument(sessionId, documentId),
        onSuccess: (_, variables) => {
            // Invalidate documents query to refetch
            queryClient.invalidateQueries({
                queryKey: documentKeys.bySession(variables.sessionId),
            });
            toast.success("Document deleted successfully");
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.detail || "Failed to delete document";
            toast.error(errorMessage);
        },
    });
}
