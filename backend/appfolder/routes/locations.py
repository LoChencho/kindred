from fastapi import APIRouter, HTTPException, Request
import asyncpg
import os
from dotenv import load_dotenv

router = APIRouter()

load_dotenv(dotenv_path='appfolder/.env')
DATABASE_URL = os.getenv('SUPABASE_DB_URL1')

# --- Location helpers ---
async def get_or_create_location(conn, name, user_id, picture=None):
    if not name:
        return None
    row = await conn.fetchrow('SELECT id FROM locations WHERE name = $1 AND user_id = $2', name, user_id)
    if row:
        return row['id']
    new_row = await conn.fetchrow('INSERT INTO locations (name, user_id, picture) VALUES ($1, $2, $3) RETURNING id', name, user_id, picture)
    return new_row['id']

async def get_location_name(conn, location_id):
    if not location_id:
        return None
    row = await conn.fetchrow('SELECT name FROM locations WHERE id = $1', location_id)
    return row['name'] if row else None

@router.get('/locations')
async def get_locations(request: Request):
    user_id = request.query_params.get('user_id')
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        rows = await conn.fetch('SELECT * FROM locations WHERE user_id = $1 ORDER BY name', user_id)
    else:
        rows = await conn.fetch('SELECT * FROM locations ORDER BY name')
    await conn.close()
    return [dict(row) for row in rows]

@router.get('/locations/{location_id}')
async def get_location(location_id: int):
    conn = await asyncpg.connect(DATABASE_URL)
    row = await conn.fetchrow('SELECT * FROM locations WHERE id = $1', location_id)
    await conn.close()
    if row:
        return dict(row)
    raise HTTPException(status_code=404, detail='Location not found')

@router.post('/locations')
async def add_location(location: dict):
    conn = await asyncpg.connect(DATABASE_URL)
    row = await conn.fetchrow('INSERT INTO locations (name, user_id, picture) VALUES ($1, $2, $3) RETURNING *', location['name'], location['user_id'], location.get('picture'))
    await conn.close()
    return dict(row) 