import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Cookies } from '../lib/cookies';

export function useWebSocket(sessionId: string | null) {
    const queryClient = useQueryClient();
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!sessionId) return;

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
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('WS Message received:', data);

                if (data.type === 'new_message') {
                    // Invalidate messages query based on the exact key used in useMessages
                    queryClient.invalidateQueries({
                        queryKey: ['messages', sessionId]
                    });
                } else if (data.type === 'session_update') {
                    queryClient.invalidateQueries({
                        queryKey: ['sessions']
                    });
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
    }, [sessionId, queryClient]);

    return socketRef.current;
}
