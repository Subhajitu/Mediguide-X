import asyncio
import os
import sys
from dotenv import load_dotenv
import psycopg

load_dotenv()

async def test_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found")
        sys.exit(1)
        
    print(f"Connecting to {db_url}...")
    try:
        async with await psycopg.AsyncConnection.connect(db_url.replace("+psycopg", ""), connect_timeout=5) as aconn:
            async with aconn.cursor() as cur:
                await cur.execute("SELECT 1;")
                result = await cur.fetchone()
                print(f"Connection successful, result: {result}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_connection())
