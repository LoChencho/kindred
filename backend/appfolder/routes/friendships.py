from fastapi import APIRouter, HTTPException, Request
from appfolder.models import Friendship, FriendshipIn
import asyncpg
import os
from dotenv import load_dotenv

router = APIRouter()

load_dotenv(dotenv_path='appfolder/.env')
DATABASE_URL = os.getenv('SUPABASE_DB_URL')

def serialize_row(row):
    d = dict(row)
    if 'user_id' in d and d['user_id'] is not None:
        d['user_id'] = str(d['user_id'])
    return d

@router.post("/friendships", response_model=Friendship)
async def add_friendship(friendship_in: FriendshipIn):
    conn = await asyncpg.connect(DATABASE_URL)
    person1 = await conn.fetchrow('SELECT * FROM people WHERE id = $1 AND user_id = $2', friendship_in.person1_id, friendship_in.user_id)
    person2 = await conn.fetchrow('SELECT * FROM people WHERE id = $1 AND user_id = $2', friendship_in.person2_id, friendship_in.user_id)
    if not person1 or not person2:
        await conn.close()
        raise HTTPException(status_code=404, detail="One or both people not found")
    existing = await conn.fetchrow('SELECT * FROM friendships WHERE ((person1_id = $1 AND person2_id = $2) OR (person1_id = $2 AND person2_id = $1)) AND user_id = $3', friendship_in.person1_id, friendship_in.person2_id, friendship_in.user_id)
    if existing:
        await conn.close()
        raise HTTPException(status_code=400, detail="Friendship already exists")
    await conn.execute(
        'INSERT INTO friendships (person1_id, person2_id, user_id) VALUES ($1, $2, $3)',
        friendship_in.person1_id, friendship_in.person2_id, friendship_in.user_id
    )
    await conn.close()
    return friendship_in

@router.get("/friendships")
async def get_friendships(request: Request):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        rows = await conn.fetch('SELECT * FROM friendships WHERE user_id = $1', user_id)
    else:
        rows = await conn.fetch('SELECT * FROM friendships')
    await conn.close()
    return [serialize_row(row) for row in rows]

@router.delete("/friendships")
async def delete_friendship(person1_id: int, person2_id: int, request: Request):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        result = await conn.execute('DELETE FROM friendships WHERE ((person1_id = $1 AND person2_id = $2) OR (person1_id = $2 AND person2_id = $1)) AND user_id = $3', person1_id, person2_id, user_id)
    else:
        result = await conn.execute('DELETE FROM friendships WHERE (person1_id = $1 AND person2_id = $2) OR (person1_id = $2 AND person2_id = $1)', person1_id, person2_id)
    await conn.close()
    if result == 'DELETE 1':
        return {"message": "Friendship deleted"}
    else:
        raise HTTPException(status_code=404, detail="Friendship not found")
