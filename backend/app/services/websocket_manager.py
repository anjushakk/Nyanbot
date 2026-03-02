from typing import Dict, List
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        # dictionary where key is session_id and value is a list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        print(f"WS client connected to session {session_id}. Total connections: {len(self.active_connections[session_id])}")

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        print(f"WS client disconnected from session {session_id}")

    async def broadcast_to_session(self, session_id: str, message: dict):
        """Broadcasts a JSON message to all connected clients in a specific session."""
        if session_id in self.active_connections:
            print(f"WS: Broadcasting {message.get('type')} to {len(self.active_connections[session_id])} clients in session {session_id}")
            disconnected_sockets = []
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error broadcasting to a connection in session {session_id}: {e}")
                    disconnected_sockets.append(connection)
            
            # Clean up any dead connections found during broadcast
            for dead_socket in disconnected_sockets:
                self.disconnect(dead_socket, session_id)
        else:
            print(f"WS: No active connections for session {session_id} to broadcast to")

manager = ConnectionManager()
