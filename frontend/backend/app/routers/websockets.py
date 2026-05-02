from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from app.services.websocket_manager import manager
from app.routers.auth import get_current_user_from_token
from app.database import get_db
from sqlalchemy.orm import Session
from app import models

router = APIRouter(tags=["websockets"])

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    session_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    # Authenticate user from token provided in query param
    try:
        user = get_current_user_from_token(token, db)
    except Exception:
        await websocket.close(code=1008) # Policy Violation
        return

    # Check if user is member of session
    membership = db.query(models.SessionMember).filter(
        models.SessionMember.session_id == session_id,
        models.SessionMember.user_id == user.id
    ).first()

    if not membership:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, session_id)
    try:
        while True:
            # Keep connection alive and wait for client messages if needed
            data = await websocket.receive_text()
            # We don't necessarily need to handle client messages here yet, 
            # as everything currently happens through HTTP POST /messages
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
