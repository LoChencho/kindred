from fastapi import APIRouter, HTTPException, Request
from appfolder.models import Relationship, RelationshipIn
import asyncpg
import os
from dotenv import load_dotenv

router = APIRouter()

load_dotenv(dotenv_path='appfolder/.env')
DATABASE_URL = os.getenv('SUPABASE_DB_URL1')

def serialize_row(row):
    d = dict(row)
    if 'user_id' in d and d['user_id'] is not None:
        d['user_id'] = str(d['user_id'])
    return d

@router.post("/relationships", response_model=Relationship)
async def add_relationship(relationship_in: RelationshipIn):
    conn = await asyncpg.connect(DATABASE_URL)
    parent = await conn.fetchrow('SELECT * FROM people WHERE id = $1 AND user_id = $2', relationship_in.parent_id, relationship_in.user_id)
    child = await conn.fetchrow('SELECT * FROM people WHERE id = $1 AND user_id = $2', relationship_in.child_id, relationship_in.user_id)
    if not parent or not child:
        await conn.close()
        raise HTTPException(status_code=404, detail="One or both people not found")
    existing = await conn.fetchrow('SELECT * FROM relationships WHERE parent_id = $1 AND child_id = $2 AND user_id = $3', relationship_in.parent_id, relationship_in.child_id, relationship_in.user_id)
    if existing:
        await conn.close()
        raise HTTPException(status_code=400, detail="Relationship already exists")
    await conn.execute(
        'INSERT INTO relationships (parent_id, child_id, relationship_type, user_id) VALUES ($1, $2, $3, $4)',
        relationship_in.parent_id, relationship_in.child_id, relationship_in.relationship_type, relationship_in.user_id
    )
    await conn.close()
    return relationship_in

@router.get("/relationships")
async def get_relationships(request: Request):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        rows = await conn.fetch('SELECT * FROM relationships WHERE user_id = $1', user_id)
    else:
        rows = await conn.fetch('SELECT * FROM relationships')
    await conn.close()
    return [serialize_row(row) for row in rows]

@router.delete("/relationships")
async def delete_relationship(person1_id: int, person2_id: int, request: Request):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        result = await conn.execute('DELETE FROM relationships WHERE parent_id = $1 AND child_id = $2 AND user_id = $3', person1_id, person2_id, user_id)
    else:
        result = await conn.execute('DELETE FROM relationships WHERE parent_id = $1 AND child_id = $2', person1_id, person2_id)
    await conn.close()
    if result == 'DELETE 1':
        return {"message": "Relationship deleted"}
    else:
        raise HTTPException(status_code=404, detail="Relationship not found")
