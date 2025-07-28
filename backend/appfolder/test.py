import asyncpg
import asyncio

async def test_connection():
    conn = await asyncpg.connect("postgresql://postgres:yourpassword@db.kzpgsqgegqauhdybspka.supabase.co:5432/postgres")
    print("Connected!")
    await conn.close()

asyncio.run(test_connection())