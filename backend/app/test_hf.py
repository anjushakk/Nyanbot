import os
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

load_dotenv("backend/.env")

def test_hf_embeddings():
    token = os.getenv("HF_API_KEY")
    if not token:
        print("HF_API_KEY not found in .env")
        return
    
    print(f"Using token: {token[:5]}...")
    client = InferenceClient(token=token)
    model = "sentence-transformers/all-MiniLM-L6-v2"
    
    try:
        text = "This is a test document about artificial intelligence."
        embedding = client.feature_extraction(text, model=model)
        print(f"Success! Embedding length: {len(embedding)}")
        print(f"Sample: {embedding[:5]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_hf_embeddings()
