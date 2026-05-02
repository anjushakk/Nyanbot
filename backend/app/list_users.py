from app.database import SessionLocal
from app import models

def list_users():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        print(f"Total Users: {len(users)}")
        for u in users:
            print(f"User: {u.name} ({u.email})")
    finally:
        db.close()

if __name__ == "__main__":
    list_users()
