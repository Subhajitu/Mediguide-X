import os
from dotenv import load_dotenv
import psycopg

load_dotenv()

def test_connection_sync():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found")
        return
        
    db_url_sync = db_url.replace("+psycopg", "").replace("+asyncpg", "")
    print(f"Connecting synchronously to {db_url_sync}...")
    try:
        with psycopg.connect(db_url_sync, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                result = cur.fetchone()
                print(f"Connection successful, result: {result}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_connection_sync()
