from fastapi import APIRouter, HTTPException, UploadFile, File, Request, Body
from fastapi import Path
from pydantic import BaseModel
from typing import List
from typing import Optional
from datetime import datetime, date
import os
import shutil
from pathlib import Path as PathLib
import asyncpg
from dotenv import load_dotenv
import spacy  # Add this import for spaCy
from appfolder.models import Story, StoryIn, TitleUpdate, DateUpdate, PeopleUpdate, LocationUpdate, Person, PersonIn, PersonUpdate, NameUpdate, Relationship, RelationshipIn, Friendship, FriendshipIn
from appfolder.utils import serialize_row, generate_title, generate_date, normalize_name
from appfolder.routes.locations import router as locations_router, get_or_create_location, get_location_name

router = APIRouter()
router.include_router(locations_router)

# Load spaCy model globally (load once at startup)
nlp = spacy.load("en_core_web_sm")

UPLOAD_DIR = PathLib("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

load_dotenv(dotenv_path='appfolder/.env')
DATABASE_URL = os.getenv('SUPABASE_DB_URL1')
print("DATABASE_URL", DATABASE_URL)
print("CWD", os.getcwd())

# --- Location helpers ---
# async def get_or_create_location(conn, name, user_id, picture=None):
#     if not name:
#         return None
#     row = await conn.fetchrow('SELECT id FROM locations WHERE name = $1 AND user_id = $2', name, user_id)
#     if row:
#         return row['id']
#     new_row = await conn.fetchrow('INSERT INTO locations (name, user_id, picture) VALUES ($1, $2, $3) RETURNING id', name, user_id, picture)
#     return new_row['id']

# async def get_location_name(conn, location_id):
#     if not location_id:
#         return None
#     row = await conn.fetchrow('SELECT name FROM locations WHERE id = $1', location_id)
#     return row['name'] if row else None

# --- Location endpoints ---
# @router.get('/locations')
# async def get_locations(request: Request):
#     user_id = request.query_params.get('user_id')
#     conn = await asyncpg.connect(DATABASE_URL)
#     if user_id:
#         rows = await conn.fetch('SELECT * FROM locations WHERE user_id = $1 ORDER BY name', user_id)
#     else:
#         rows = await conn.fetch('SELECT * FROM locations ORDER BY name')
#     await conn.close()
#     return [dict(row) for row in rows]

# @router.get('/locations/{location_id}')
# async def get_location(location_id: int):
#     conn = await asyncpg.connect(DATABASE_URL)
#     row = await conn.fetchrow('SELECT * FROM locations WHERE id = $1', location_id)
#     await conn.close()
#     if row:
#         return dict(row)
#     raise HTTPException(status_code=404, detail='Location not found')

# @router.post('/locations')
# async def add_location(location: dict):
#     conn = await asyncpg.connect(DATABASE_URL)
#     row = await conn.fetchrow('INSERT INTO locations (name, user_id, picture) VALUES ($1, $2, $3) RETURNING *', location['name'], location['user_id'], location.get('picture'))
#     await conn.close()
#     return dict(row)

async def get_people_names(conn, people_ids):
    if not people_ids:
        return []
    rows = await conn.fetch('SELECT id, name FROM people WHERE id = ANY($1)', people_ids)
    id_to_name = {row['id']: row['name'] for row in rows}
    return [id_to_name.get(pid, str(pid)) for pid in people_ids]

@router.get("/stories")
async def get_stories(request: Request):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        rows = await conn.fetch('SELECT * FROM stories WHERE user_id = $1 ORDER BY date DESC', user_id)
    else:
        rows = await conn.fetch('SELECT * FROM stories ORDER BY date DESC')
    # Attach people_names and location_name for each story
    stories = []
    for row in rows:
        story = serialize_row(row)
        story["location_name"] = await get_location_name(conn, story.get("location_id")) if story.get("location_id") else None
        story["people_names"] = await get_people_names(conn, story.get("people_ids") or [])
        stories.append(story)
    await conn.close()
    return stories

@router.post("/stories", response_model=Story)
async def add_story(story_in: StoryIn):
    date_value = story_in.date if story_in.date else datetime.now().strftime("%Y-%m-%d")
    title = generate_title(story_in.content)
    doc = nlp(story_in.content)
    entities = [
        {"text": ent.text, "label": ent.label_}
        for ent in doc.ents
    ]
    raw_person_names = set(ent["text"] for ent in entities if ent["label"] == "PERSON")
    person_names = set()
    for name in raw_person_names:
        if not any((name != other and name in other) for other in raw_person_names):
            person_names.add(name)
    for name in raw_person_names:
        if all((name == other or name not in other) for other in raw_person_names):
            person_names.add(name)
    conn = await asyncpg.connect(DATABASE_URL)
    # Fetch all people and their nicknames for this user
    people_rows = await conn.fetch('SELECT id, name, nicknames FROM people WHERE user_id = $1', story_in.user_id)
    name_to_id = {row['name']: row['id'] for row in people_rows}
    nickname_to_id = {}
    for row in people_rows:
        if row['nicknames']:
            for nickname in row['nicknames']:
                nickname_to_id[nickname] = row['id']
    # Build a set of all people IDs to associate with the story
    all_people_ids = set()
    # Accept both IDs and names in story_in.people_ids
    for val in story_in.people_ids:
        if isinstance(val, int):
            all_people_ids.add(val)
        elif isinstance(val, str):
            # Try to resolve as name or nickname
            person_id = name_to_id.get(val) or nickname_to_id.get(val)
            if person_id:
                all_people_ids.add(person_id)
            else:
                # Insert new person and get ID
                new_row = await conn.fetchrow(
                    'INSERT INTO people (name, user_id, nicknames) VALUES ($1, $2, $3) RETURNING id',
                    val, story_in.user_id, []
                )
                all_people_ids.add(new_row['id'])
    # Add NER-detected people (by name) as well
    for person_name in person_names:
        person_id = name_to_id.get(person_name) or nickname_to_id.get(person_name)
        if person_id:
            all_people_ids.add(person_id)
        else:
            new_row = await conn.fetchrow(
                'INSERT INTO people (name, user_id, nicknames) VALUES ($1, $2, $3) RETURNING id',
                person_name, story_in.user_id, []
            )
            all_people_ids.add(new_row['id'])
    # --- Location logic ---
    location_id = None
    if story_in.location_id:
        location_id = story_in.location_id
    elif story_in.location_name:
        location_id = await get_or_create_location(conn, story_in.location_name, story_in.user_id)
    # Insert the story with the updated people_ids list (IDs only)
    row = await conn.fetchrow(
        'INSERT INTO stories (title, content, date, location_id, people_ids, photos, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        title, story_in.content, date_value, location_id, list(all_people_ids), story_in.photos, story_in.user_id
    )
    # Attach location_name and people_names for serialization
    location_name = await get_location_name(conn, location_id) if location_id else None
    people_names = await get_people_names(conn, list(all_people_ids)) if all_people_ids else []
    await conn.close()
    story_data = serialize_row(row)
    story_data["entities"] = entities
    story_data["location_name"] = location_name
    story_data["people_names"] = people_names
    return story_data

@router.delete("/stories/{story_id}")
async def delete_story(request: Request, story_id: int = Path(...)):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        # Only delete if the story belongs to the user
        result = await conn.execute('DELETE FROM stories WHERE id = $1 AND user_id = $2', story_id, user_id)
    else:
        result = await conn.execute('DELETE FROM stories WHERE id = $1', story_id)
    await conn.close()
    if result == 'DELETE 1':
        return {"message": "Story deleted"}
    else:
        raise HTTPException(status_code=404, detail="Story not found")

# PATCH /stories/{story_id}/title
@router.patch("/stories/{story_id}/title", response_model=Story)
async def update_story_title(update: TitleUpdate, request: Request, story_id: int = Path(...)):
    user_id = request.query_params.get("user_id")
    if update.title is None:
        raise HTTPException(status_code=400, detail="Title is required")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        await conn.execute('UPDATE stories SET title = $1 WHERE id = $2 AND user_id = $3', update.title, story_id, user_id)
    else:
        await conn.execute('UPDATE stories SET title = $1 WHERE id = $2', update.title, story_id)
    row = await conn.fetchrow('SELECT * FROM stories WHERE id = $1', story_id)
    await conn.close()
    if row:
        return serialize_row(row)
    else:
        raise HTTPException(status_code=404, detail="Story not found")

# PATCH /stories/{story_id}/date
@router.patch("/stories/{story_id}/date", response_model=Story)
async def update_story_date(update: DateUpdate, request: Request, story_id: int = Path(...)):
    user_id = request.query_params.get("user_id")
    if update.date is None:
        raise HTTPException(status_code=400, detail="Date is required")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        await conn.execute('UPDATE stories SET date = $1 WHERE id = $2 AND user_id = $3', update.date, story_id, user_id)
    else:
        await conn.execute('UPDATE stories SET date = $1 WHERE id = $2', update.date, story_id)
    row = await conn.fetchrow('SELECT * FROM stories WHERE id = $1', story_id)
    await conn.close()
    if row:
        return serialize_row(row)
    else:
        raise HTTPException(status_code=404, detail="Story not found")

# PATCH /stories/{story_id}/people
@router.patch("/stories/{story_id}/people", response_model=Story)
async def update_story_people(update: PeopleUpdate, request: Request, story_id: int = Path(...)):
    user_id = request.query_params.get("user_id")
    if update.people_ids is None:
        raise HTTPException(status_code=400, detail="People is required")
    conn = await asyncpg.connect(DATABASE_URL)
    # Fetch all people and their nicknames for this user
    people_rows = await conn.fetch('SELECT id, name, nicknames FROM people WHERE user_id = $1', user_id)
    name_to_id = {row['name']: row['id'] for row in people_rows}
    nickname_to_id = {}
    for row in people_rows:
        if row['nicknames']:
            for nickname in row['nicknames']:
                nickname_to_id[nickname] = row['id']
    all_people_ids = set()
    for val in update.people_ids:
        if isinstance(val, int):
            all_people_ids.add(val)
        elif isinstance(val, str):
            person_id = name_to_id.get(val) or nickname_to_id.get(val)
            if person_id:
                all_people_ids.add(person_id)
            else:
                new_row = await conn.fetchrow(
                    'INSERT INTO people (name, user_id, nicknames) VALUES ($1, $2, $3) RETURNING id',
                    val, user_id, []
                )
                all_people_ids.add(new_row['id'])
    if user_id:
        await conn.execute('UPDATE stories SET people_ids = $1 WHERE id = $2 AND user_id = $3', list(all_people_ids), story_id, user_id)
    else:
        await conn.execute('UPDATE stories SET people_ids = $1 WHERE id = $2', list(all_people_ids), story_id)
    row = await conn.fetchrow('SELECT * FROM stories WHERE id = $1', story_id)
    people_names = await get_people_names(conn, list(all_people_ids)) if all_people_ids else []
    await conn.close()
    if row:
        story_data = serialize_row(row)
        story_data["people_names"] = people_names
        return story_data
    else:
        raise HTTPException(status_code=404, detail="Story not found")

# PATCH /stories/{story_id}/location
@router.patch("/stories/{story_id}/location", response_model=Story)
async def update_story_location(update: LocationUpdate, request: Request, story_id: int = Path(...)):
    user_id = request.query_params.get("user_id")
    if not update.location_name and not update.location_id:
        raise HTTPException(status_code=400, detail="Location name or ID is required")
    conn = await asyncpg.connect(DATABASE_URL)
    # Resolve location_id
    location_id = update.location_id if hasattr(update, 'location_id') and update.location_id else None
    if not location_id and update.location_name:
        location_id = await get_or_create_location(conn, update.location_name, user_id)
    if user_id:
        await conn.execute('UPDATE stories SET location_id = $1 WHERE id = $2 AND user_id = $3', location_id, story_id, user_id)
    else:
        await conn.execute('UPDATE stories SET location_id = $1 WHERE id = $2', location_id, story_id)
    row = await conn.fetchrow('SELECT * FROM stories WHERE id = $1', story_id)
    location_name = await get_location_name(conn, location_id) if location_id else None
    await conn.close()
    if row:
        story_data = serialize_row(row)
        story_data["location_name"] = location_name
        return story_data
    else:
        raise HTTPException(status_code=404, detail="Story not found")

@router.post("/stories/{story_id}/upload-photos")
async def upload_story_photos(story_id: int, files: list[UploadFile] = File(...)):
    conn = await asyncpg.connect(DATABASE_URL)
    row = await conn.fetchrow('SELECT * FROM stories WHERE id = $1', story_id)
    if not row:
        await conn.close()
        raise HTTPException(status_code=404, detail="Story not found")
    story = dict(row)
    uploaded_files = []
    photos = story.get('photos', []) or []
    if isinstance(photos, str):
        import json
        try:
            photos = json.loads(photos)
        except Exception:
            photos = []
    for file in files:
        if not file.content_type.startswith('image/'):
            continue  # skip non-images
        file_extension = file.filename.split('.')[-1]
        filename = f"story_{story_id}_{len(photos)}_{file.filename}"
        file_path = UPLOAD_DIR / filename
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception:
            continue  # skip failed uploads
        url = f"/uploads/{filename}"
        photos.append(url)
        uploaded_files.append(url)
    # Update DB
    await conn.execute('UPDATE stories SET photos = $1 WHERE id = $2', photos, story_id)
    await conn.close()
    return {"uploaded": uploaded_files, "all_photos": photos}

@router.get("/family-tree")
async def get_family_tree(request: Request):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        people_rows = await conn.fetch('SELECT * FROM people WHERE user_id = $1', user_id)
        relationships_rows = await conn.fetch('SELECT * FROM relationships WHERE user_id = $1', user_id)
    else:
        people_rows = await conn.fetch('SELECT * FROM people')
        relationships_rows = await conn.fetch('SELECT * FROM relationships')
    await conn.close()
    people = [dict(row) for row in people_rows]
    relationships = [dict(row) for row in relationships_rows]
    tree_data = []
    for person in people:
        children = [r['child_id'] for r in relationships if r['parent_id'] == person['id']]
        parents = [r['parent_id'] for r in relationships if r['child_id'] == person['id']]
        tree_data.append({
            "id": person['id'],
            "name": person['name'],
            "picture": person['picture'],
            "birth_date": person['birth_date'],
            "death_date": person['death_date'],
            "gender": person['gender'],
            "children": children,
            "parents": parents
        })
    return tree_data

@router.post("/people", response_model=Person)
async def add_person(person_in: PersonIn):
    conn = await asyncpg.connect(DATABASE_URL)
    await conn.execute(
        'INSERT INTO people (name, picture, birth_date, death_date, gender, user_id, nicknames) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        person_in.name, person_in.picture, person_in.birth_date, person_in.death_date, person_in.gender, person_in.user_id, person_in.nicknames
    )
    await conn.close()
    return person_in

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
    normalized_input = normalize_name(row['name'])
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

@router.patch("/people/{person_id}/name", response_model=Person)
async def update_person_name(person_id: int, update: NameUpdate):
    conn = await asyncpg.connect(DATABASE_URL)
    await conn.execute('UPDATE people SET name = $1 WHERE id = $2', update.name, person_id)
    row = await conn.fetchrow('SELECT * FROM people WHERE id = $1', person_id)
    await conn.close()
    if row:
        return serialize_row(row)
    raise HTTPException(status_code=404, detail="Person not found")

@router.delete("/people/{person_id}")
async def delete_person(person_id: int):
    conn = await asyncpg.connect(DATABASE_URL)
    result = await conn.execute('DELETE FROM people WHERE id = $1', person_id)
    await conn.close()
    if result == 'DELETE 1':
        return {"message": "Person deleted"}
    else:
        raise HTTPException(status_code=404, detail="Person not found")

@router.post("/ner")
async def named_entity_recognition(text: str = Body(..., embed=True)):
    """
    Accepts a POST request with a JSON body: {"text": "..."}
    Returns a list of entities with their text and label.
    """
    doc = nlp(text)
    entities = [
        {"text": ent.text, "label": ent.label_}
        for ent in doc.ents
    ]
    return {"entities": entities}