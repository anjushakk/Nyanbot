import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Cookies } from '../lib/cookies';
import { useAuth } from './useAuth';

export function useWebSocket(sessionId: string | null) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const socketRef = useRef<WebSocket | null>(null);
    const [reconnectCount, setReconnectCount] = useState(0);

    useEffect(() => {
        if (!sessionId || !user) return;

        let reconnectTimeout: NodeJS.Timeout;
        const token = Cookies.get('access_token');
        if (!token) {
            console.error('No access token found for WebSocket');
            return;
        }

        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
        const wsHost = baseUrl.replace(/^https?:\/\//, '');
        const wsUrl = `${wsProtocol}://${wsHost}/ws/${sessionId}?token=${token}`;

        console.log(`Connecting to WebSocket: ${wsUrl} (Attempt ${reconnectCount + 1})`);
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log(`WebSocket connected to session ${sessionId}`);
            queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['documents', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'new_message') {
                    if (data.message) {
                        queryClient.setQueryData(['messages', sessionId], (old: any) => {
                            const currentMessages = Array.isArray(old) ? old : [];
                            if (currentMessages.some((m: any) => m.id === data.message.id)) return currentMessages;
                            return [...currentMessages, data.message];
                        });
                    } else {
                        queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
                    }
                } else if (data.type === 'session_update') {
                    queryClient.invalidateQueries({ queryKey: ['sessions'] });
                } else if (data.type === 'document_update') {
                    queryClient.invalidateQueries({ queryKey: ['documents', sessionId] });
                } else if (data.type === 'document_uploading' || data.type === 'document_processing') {
                    queryClient.invalidateQueries({ queryKey: ['documents', sessionId] });
                } else if (data.type === 'document_ready') {
                    queryClient.setQueryData(['uploading', sessionId], (old: any) => {
                        const current = Array.isArray(old) ? old : [];
                        return current.filter((f: any) => f.name !== data.filename);
                    });
                    queryClient.invalidateQueries({ queryKey: ['documents', sessionId] });
                } else if (data.type === 'typing') {
                    queryClient.setQueryData(['thinking', sessionId], true);
                } else if (data.type === 'typing_off') {
                    queryClient.setQueryData(['thinking', sessionId], false);
                }
            } catch (error) {
                console.error('Error parsing WS message:', error);
            }
        };

        socket.onclose = (event) => {
            console.log(`WebSocket disconnected from session ${sessionId}. Code: ${event.code}`);
            if (event.code !== 1000) {
                reconnectTimeout = setTimeout(() => {
                    setReconnectCount(prev => prev + 1);
                }, 3000);
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return () => {
            clearTimeout(reconnectTimeout);
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close(1000);
            }
        };
    }, [sessionId, user?.id, queryClient, reconnectCount]);

    return socketRef.current;
}
