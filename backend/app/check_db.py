from app.database import SessionLocal
from app import models

def check_db():
    db = SessionLocal()
    try:
        sessions = db.query(models.Session).all()
        print(f"Total Sessions: {len(sessions)}")
        for s in sessions:
            print(f"\nSession: {s.name} ({s.id})")
            docs = db.query(models.Document).filter(models.Document.session_id == s.id).all()
            print(f"  Documents: {len(docs)}")
            for d in docs:
                chunks = db.query(models.Chunk).filter(models.Chunk.document_id == d.id).count()
                print(f"    - {d.filename}: {chunks} chunks")
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
