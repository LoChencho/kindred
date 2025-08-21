from fastapi import APIRouter, HTTPException, UploadFile, File, Request, Body
from fastapi import Path
from appfolder.models import Person, PersonIn, PersonUpdate, NameUpdate
from typing import Optional
from pathlib import Path as PathLib
import asyncpg
import os
import shutil
from dotenv import load_dotenv

router = APIRouter()

UPLOAD_DIR = PathLib("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

load_dotenv(dotenv_path='appfolder/.env')
DATABASE_URL = os.getenv('SUPABASE_DB_URL')

def serialize_row(row):
    d = dict(row)
    if 'user_id' in d and d['user_id'] is not None:
        d['user_id'] = str(d['user_id'])
    return d

@router.post("/people", response_model=Person)
async def add_person(person_in: PersonIn):
    conn = await asyncpg.connect(DATABASE_URL)
    row = await conn.fetchrow(
        'INSERT INTO people (name, picture, birth_date, death_date, gender, user_id, nicknames) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        person_in.name, person_in.picture, person_in.birth_date, person_in.death_date, person_in.gender, person_in.user_id, person_in.nicknames
    )
    await conn.close()
    return serialize_row(row)

@router.get("/people")
async def get_people(request: Request):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        rows = await conn.fetch('SELECT * FROM people WHERE user_id = $1 ORDER BY name', user_id)
    else:
        rows = await conn.fetch('SELECT * FROM people ORDER BY name')
    await conn.close()
    return [serialize_row(row) for row in rows]

@router.get("/people/{person_id}")
async def get_person(person_id: int, request: Request):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        row = await conn.fetchrow('SELECT * FROM people WHERE id = $1 AND user_id = $2', person_id, user_id)
    else:
        row = await conn.fetchrow('SELECT * FROM people WHERE id = $1', person_id)
    await conn.close()
    if row:
        return serialize_row(row)
    raise HTTPException(status_code=404, detail="Person not found")

@router.patch("/people/{person_id}/picture", response_model=Person)
async def update_person_picture(person_id: int, update: PersonUpdate, request: Request):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        row = await conn.fetchrow('SELECT * FROM people WHERE id = $1 AND user_id = $2', person_id, user_id)
    else:
        row = await conn.fetchrow('SELECT * FROM people WHERE id = $1', person_id)
    if not row:
        await conn.close()
        raise HTTPException(status_code=404, detail="Person not found")
    person = dict(row)
    picture = update.picture if update.picture is not None else person.get('picture')
    birth_date = update.birth_date if update.birth_date is not None else person.get('birth_date')
    death_date = update.death_date if update.death_date is not None else person.get('death_date')
    gender = update.gender if update.gender is not None else person.get('gender')
    if user_id:
        await conn.execute('UPDATE people SET picture = $1, birth_date = $2, death_date = $3, gender = $4 WHERE id = $5 AND user_id = $6', picture, birth_date, death_date, gender, person_id, user_id)
    else:
        await conn.execute('UPDATE people SET picture = $1, birth_date = $2, death_date = $3, gender = $4 WHERE id = $5', picture, birth_date, death_date, gender, person_id)
    row = await conn.fetchrow('SELECT * FROM people WHERE id = $1', person_id)
    await conn.close()
    return serialize_row(row)

@router.post("/people/{person_id}/upload-picture")
async def upload_person_picture(person_id: int, request: Request, file: UploadFile = File(...)):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        row = await conn.fetchrow('SELECT * FROM people WHERE id = $1 AND user_id = $2', person_id, user_id)
    else:
        row = await conn.fetchrow('SELECT * FROM people WHERE id = $1', person_id)
    if not row:
        await conn.close()
        raise HTTPException(status_code=404, detail="Person not found")
    # Validate file type
    if not file.content_type.startswith('image/'):
        await conn.close()
        raise HTTPException(status_code=400, detail="File must be an image")
    # Create filename
    file_extension = file.filename.split('.')[-1]
    normalized_input = row['name'].strip().lower().replace(' ', '_')
    filename = f"{normalized_input}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        await conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    # Update person's picture field in DB
    url = f"/uploads/{filename}"
    if user_id:
        await conn.execute('UPDATE people SET picture = $1 WHERE id = $2 AND user_id = $3', url, person_id, user_id)
    else:
        await conn.execute('UPDATE people SET picture = $1 WHERE id = $2', url, person_id)
    await conn.close()
    return {"filename": filename, "url": url}

@router.patch("/people/{person_id}/birth-date", response_model=Person)
async def update_person_birth_date(person_id: int, request: Request, birth_date: Optional[str] = None):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        await conn.execute('UPDATE people SET birth_date = $1 WHERE id = $2 AND user_id = $3', birth_date, person_id, user_id)
    else:
        await conn.execute('UPDATE people SET birth_date = $1 WHERE id = $2', birth_date, person_id)
    row = await conn.fetchrow('SELECT * FROM people WHERE id = $1', person_id)
    await conn.close()
    if row:
        return serialize_row(row)
    raise HTTPException(status_code=404, detail="Person not found")

@router.patch("/people/{person_id}/death-date", response_model=Person)
async def update_person_death_date(person_id: int, request: Request, death_date: Optional[str] = None):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        await conn.execute('UPDATE people SET death_date = $1 WHERE id = $2 AND user_id = $3', death_date, person_id, user_id)
    else:
        await conn.execute('UPDATE people SET death_date = $1 WHERE id = $2', death_date, person_id)
    row = await conn.fetchrow('SELECT * FROM people WHERE id = $1', person_id)
    await conn.close()
    if row:
        return serialize_row(row)
    raise HTTPException(status_code=404, detail="Person not found")

@router.patch("/people/{person_id}/gender", response_model=Person)
async def update_person_gender(person_id: int, request: Request, gender: Optional[str] = None):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        await conn.execute('UPDATE people SET gender = $1 WHERE id = $2 AND user_id = $3', gender, person_id, user_id)
    else:
        await conn.execute('UPDATE people SET gender = $1 WHERE id = $2', gender, person_id)
    row = await conn.fetchrow('SELECT * FROM people WHERE id = $1', person_id)
    await conn.close()
    if row:
        return serialize_row(row)
    raise HTTPException(status_code=404, detail="Person not found")

@router.post("/people/{person_id}/add-nickname")
async def add_nickname(person_id: int, nickname: str = Body(..., embed=True)):
    conn = await asyncpg.connect(DATABASE_URL)
    person = await conn.fetchrow('SELECT * FROM people WHERE id = $1', person_id)
    if not person:
        await conn.close()
        raise HTTPException(status_code=404, detail="Person not found")
    nicknames = person['nicknames'] or []
    if nickname in nicknames:
        await conn.close()
        raise HTTPException(status_code=400, detail="Nickname already exists")
    nicknames.append(nickname)
    await conn.execute('UPDATE people SET nicknames = $1 WHERE id = $2', nicknames, person_id)
    updated = await conn.fetchrow('SELECT * FROM people WHERE id = $1', person_id)
    await conn.close()
    return serialize_row(updated)

@router.delete("/people/{person_id}/delete-nickname")
async def delete_nickname(person_id: int, nickname: str = Body(..., embed=True)):
    conn = await asyncpg.connect(DATABASE_URL)
    person = await conn.fetchrow('SELECT * FROM people WHERE id = $1', person_id)
    if not person:
        await conn.close()
        raise HTTPException(status_code=404, detail="Person not found")
    nicknames = person['nicknames'] or []
    if nickname not in nicknames:
        await conn.close()
        raise HTTPException(status_code=404, detail="Nickname not found")
    nicknames = [n for n in nicknames if n != nickname]
    await conn.execute('UPDATE people SET nicknames = $1 WHERE id = $2', nicknames, person_id)
    updated = await conn.fetchrow('SELECT * FROM people WHERE id = $1', person_id)
    await conn.close()
    return serialize_row(updated)

@router.delete("/people/{person_id}")
async def delete_person(person_id: int):
    conn = await asyncpg.connect(DATABASE_URL)
    result = await conn.execute('DELETE FROM people WHERE id = $1', person_id)
    await conn.close()
    if result == 'DELETE 1':
        return {"message": "Person deleted"}
    else:
        raise HTTPException(status_code=404, detail="Person not found")

@router.patch("/people/{person_id}/name", response_model=Person)
async def update_person_name(person_id: int, update: NameUpdate):
    conn = await asyncpg.connect(DATABASE_URL)
    await conn.execute('UPDATE people SET name = $1 WHERE id = $2', update.name, person_id)
    row = await conn.fetchrow('SELECT * FROM people WHERE id = $1', person_id)
    await conn.close()
    if row:
        return serialize_row(row)
    raise HTTPException(status_code=404, detail="Person not found")
