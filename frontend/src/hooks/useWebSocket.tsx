import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Cookies } from '../lib/cookies';
import { useAuth } from './useAuth';

export function useWebSocket(sessionId: string | null) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!sessionId || !user) return;

        const token = Cookies.get('access_token');
        if (!token) {
            console.error('No access token found for WebSocket');
            return;
        }

        // Construct WS URL - replace http/https with ws/wss
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
        const wsHost = baseUrl.replace(/^https?:\/\//, '');
        const wsUrl = `${wsProtocol}://${wsHost}/ws/${sessionId}?token=${token}`;

        console.log(`Connecting to WebSocket: ${wsUrl}`);
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log(`WebSocket connected to session ${sessionId}`);
            // Catch up on missed updates while disconnected
            queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['documents', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('WS Message received:', data);

                if (data.type === 'new_message') {
                    if (data.message) {
                        queryClient.setQueryData(['messages', sessionId], (old: any) => {
                            const currentMessages = Array.isArray(old) ? old : [];
                            // Check if message already exists to avoid duplicates
                            if (currentMessages.some((m: any) => m.id === data.message.id)) {
                                return currentMessages;
                            }
                            return [...currentMessages, data.message];
                        });
                    } else {
                        queryClient.invalidateQueries({
                            queryKey: ['messages', sessionId]
                        });
                    }
                } else if (data.type === 'session_update') {
                    queryClient.invalidateQueries({
                        queryKey: ['sessions']
                    });
                } else if (data.type === 'document_update') {
                    queryClient.invalidateQueries({
                        queryKey: ['documents', sessionId]
                    });
                } else if (data.type === 'document_uploading') {
                    // Sync the uploading state for all users
                    queryClient.setQueryData(['uploading', sessionId], (old: any) => {
                        const current = Array.isArray(old) ? old : [];
                        if (current.some((f: any) => f.name === data.filename)) return current;
                        return [...current, { name: data.filename, status: 'uploading', user: data.user }];
                    });
                } else if (data.type === 'typing') {
                    queryClient.setQueryData(['thinking', sessionId], true);
                } else if (data.type === 'typing_off') {
                    queryClient.setQueryData(['thinking', sessionId], false);
                }
            } catch (error) {
                console.error('Error parsing WS message:', error);
            }
        };

        socket.onclose = () => {
            console.log(`WebSocket disconnected from session ${sessionId}`);
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return () => {
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close();
            }
        };
    }, [sessionId, user?.id, queryClient]);

    return socketRef.current;
}
