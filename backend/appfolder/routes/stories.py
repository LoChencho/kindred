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

router = APIRouter()

# Load spaCy model globally (load once at startup)
nlp = spacy.load("en_core_web_sm")

def serialize_row(row):
    d = dict(row)
    if 'user_id' in d and d['user_id'] is not None:
        d['user_id'] = str(d['user_id'])
    return d

class Story(BaseModel):
    id: int
    title: str
    content: str
    date: Optional[str] = None
    location: str = ""
    people: List[str] = []
    photos: List[str] = []  # List of photo file paths
    user_id: Optional[str] = None  # Add user_id field

class StoryIn(BaseModel):
    content: str
    people: List[str] = []
    location: str = ""
    photos: List[str] = []  # Accept list of photo paths optionally
    date: Optional[str] = None  # Allow date to be submitted optionally
    user_id: str  # Add user_id field

class TitleUpdate(BaseModel):
    title: Optional[str] = None

class DateUpdate(BaseModel):
    date: Optional[str] = None

class PeopleUpdate(BaseModel):
    people: Optional[List[str]] = None

class LocationUpdate(BaseModel):
    location: Optional[str] = None

class Person(BaseModel):
    name: str
    picture: Optional[str] = None
    birth_date: Optional[str] = None
    death_date: Optional[str] = None
    gender: Optional[str] = None  # 'M', 'F', or None
    user_id: Optional[str] = None  # Add user_id field
    nicknames: Optional[List[str]] = []  # Add nicknames field

class PersonIn(BaseModel):
    name: str
    picture: Optional[str] = None
    birth_date: Optional[str] = None
    death_date: Optional[str] = None
    gender: Optional[str] = None
    user_id: str  # Add user_id field
    nicknames: Optional[List[str]] = []  # Add nicknames field

class PersonUpdate(BaseModel):
    picture: Optional[str] = None
    birth_date: Optional[str] = None
    death_date: Optional[str] = None
    gender: Optional[str] = None

class Relationship(BaseModel):
    parent_name: str
    child_name: str
    relationship_type: str = "parent-child"  # Could be "parent-child", "spouse", etc.
    user_id: Optional[str] = None  # Add user_id field

class RelationshipIn(BaseModel):
    parent_name: str
    child_name: str
    relationship_type: str = "parent-child"
    user_id: str  # Add user_id field

class Friendship(BaseModel):
    person1: str
    person2: str
    user_id: Optional[str] = None  # Add user_id field

class FriendshipIn(BaseModel):
    person1: str
    person2: str
    user_id: str  # Add user_id field

# Create uploads directory if it doesn't exist
UPLOAD_DIR = PathLib("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

load_dotenv(dotenv_path='appfolder/.env')
DATABASE_URL = os.getenv('SUPABASE_DB_URL')
print("DATABASE_URL", DATABASE_URL)
print("CWD", os.getcwd())

def generate_title(content: str) -> str:
    first_sentence = content.strip().split('.')[0]
    if len(first_sentence) > 60:
        return first_sentence[:57].rstrip() + "..."
    return first_sentence

def generate_date(content: str) -> str:
    # Simple date extraction - you might want to improve this
    return datetime.now().strftime("%Y-%m-%d")

def normalize_name(name):
    return name.strip().lower().replace(' ', '_')

@router.get("/stories")
async def get_stories(request: Request):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        rows = await conn.fetch('SELECT * FROM stories WHERE user_id = $1 ORDER BY date DESC', user_id)
    else:
        rows = await conn.fetch('SELECT * FROM stories ORDER BY date DESC')
    await conn.close()
    return [serialize_row(row) for row in rows]

@router.post("/stories", response_model=Story)
async def add_story(story_in: StoryIn):
    date_value = story_in.date if story_in.date else datetime.now().strftime("%Y-%m-%d")
    title = generate_title(story_in.content)
    # Run NER on the story content
    doc = nlp(story_in.content)
    entities = [
        {"text": ent.text, "label": ent.label_}
        for ent in doc.ents
    ]
    # Add PERSON entities to the people table for this user
    raw_person_names = set(ent["text"] for ent in entities if ent["label"] == "PERSON")
    # Deduplicate: keep only the longest name if a shorter is a substring of a longer
    person_names = set()
    for name in raw_person_names:
        if not any((name != other and name in other) for other in raw_person_names):
            person_names.add(name)
    for name in raw_person_names:
        if all((name == other or name not in other) for other in raw_person_names):
            person_names.add(name)
    # Merge with any people already provided in story_in.people
    all_people = set(story_in.people)
    conn = await asyncpg.connect(DATABASE_URL)
    # Fetch all people and their nicknames for this user
    people_rows = await conn.fetch('SELECT name, nicknames FROM people WHERE user_id = $1', story_in.user_id)
    name_to_canonical = {row['name']: row['name'] for row in people_rows}
    nickname_to_canonical = {}
    for row in people_rows:
        if row['nicknames']:
            for nickname in row['nicknames']:
                nickname_to_canonical[nickname] = row['name']
    # For each detected person, check if it's a canonical name or a nickname
    for person_name in person_names:
        canonical_name = None
        if person_name in name_to_canonical:
            canonical_name = person_name
        elif person_name in nickname_to_canonical:
            canonical_name = nickname_to_canonical[person_name]
        if canonical_name:
            all_people.add(canonical_name)
        else:
            # Insert new person with this name
            await conn.execute(
                'INSERT INTO people (name, user_id, nicknames) VALUES ($1, $2, $3)',
                person_name, story_in.user_id, []
            )
            all_people.add(person_name)
    # Insert the story with the updated people list
    row = await conn.fetchrow(
        'INSERT INTO stories (title, content, date, location, people, photos, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        title, story_in.content, date_value, story_in.location, list(all_people), story_in.photos, story_in.user_id
    )
    await conn.close()
    story_data = serialize_row(row)
    story_data["entities"] = entities
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

@router.patch("/stories/{story_id}/people", response_model=Story)
async def update_story_people(update: PeopleUpdate, request: Request, story_id: int = Path(...)):
    user_id = request.query_params.get("user_id")
    if update.people is None:
        raise HTTPException(status_code=400, detail="People is required")
    conn = await asyncpg.connect(DATABASE_URL)
    # Ensure each person exists in the people table
    for person_name in update.people:
        person_row = await conn.fetchrow('SELECT * FROM people WHERE name = $1', person_name)
        if not person_row:
            # Insert with default values
            await conn.execute(
                'INSERT INTO people (name, picture, birth_date, death_date, gender) VALUES ($1, $2, $3, $4, $5)',
                person_name, None, None, None, None
            )
    if user_id:
        await conn.execute('UPDATE stories SET people = $1 WHERE id = $2 AND user_id = $3', update.people, story_id, user_id)
    else:
        await conn.execute('UPDATE stories SET people = $1 WHERE id = $2', update.people, story_id)
    row = await conn.fetchrow('SELECT * FROM stories WHERE id = $1', story_id)
    await conn.close()
    if row:
        return serialize_row(row)
    else:
        raise HTTPException(status_code=404, detail="Story not found")

@router.patch("/stories/{story_id}/location", response_model=Story)
async def update_story_location(update: LocationUpdate, request: Request, story_id: int = Path(...)):
    user_id = request.query_params.get("user_id")
    if update.location is None:
        raise HTTPException(status_code=400, detail="Location is required")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        await conn.execute('UPDATE stories SET location = $1 WHERE id = $2 AND user_id = $3', update.location, story_id, user_id)
    else:
        await conn.execute('UPDATE stories SET location = $1 WHERE id = $2', update.location, story_id)
    row = await conn.fetchrow('SELECT * FROM stories WHERE id = $1', story_id)
    await conn.close()
    if row:
        return serialize_row(row)
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

@router.post("/relationships", response_model=Relationship)
async def add_relationship(relationship_in: RelationshipIn):
    conn = await asyncpg.connect(DATABASE_URL)
    # Check if both people exist for this user
    parent = await conn.fetchrow('SELECT * FROM people WHERE name = $1 AND user_id = $2', relationship_in.parent_name, relationship_in.user_id)
    child = await conn.fetchrow('SELECT * FROM people WHERE name = $1 AND user_id = $2', relationship_in.child_name, relationship_in.user_id)
    if not parent or not child:
        await conn.close()
        raise HTTPException(status_code=404, detail="One or both people not found")
    # Check if relationship already exists for this user
    existing = await conn.fetchrow('SELECT * FROM relationships WHERE parent_name = $1 AND child_name = $2 AND user_id = $3', relationship_in.parent_name, relationship_in.child_name, relationship_in.user_id)
    if existing:
        await conn.close()
        raise HTTPException(status_code=400, detail="Relationship already exists")
    await conn.execute(
        'INSERT INTO relationships (parent_name, child_name, relationship_type, user_id) VALUES ($1, $2, $3, $4)',
        relationship_in.parent_name, relationship_in.child_name, relationship_in.relationship_type, relationship_in.user_id
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
async def delete_relationship(person1: str, person2: str, request: Request):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        result = await conn.execute('DELETE FROM relationships WHERE parent_name = $1 AND child_name = $2 AND user_id = $3', person1, person2, user_id)
    else:
        result = await conn.execute('DELETE FROM relationships WHERE parent_name = $1 AND child_name = $2', person1, person2)
    await conn.close()
    if result == 'DELETE 1':
        return {"message": "Relationship deleted"}
    else:
        raise HTTPException(status_code=404, detail="Relationship not found")

@router.post("/friendships", response_model=Friendship)
async def add_friendship(friendship_in: FriendshipIn):
    conn = await asyncpg.connect(DATABASE_URL)
    # Check if both people exist for this user
    person1 = await conn.fetchrow('SELECT * FROM people WHERE name = $1 AND user_id = $2', friendship_in.person1, friendship_in.user_id)
    person2 = await conn.fetchrow('SELECT * FROM people WHERE name = $1 AND user_id = $2', friendship_in.person2, friendship_in.user_id)
    if not person1 or not person2:
        await conn.close()
        raise HTTPException(status_code=404, detail="One or both people not found")
    # Check if friendship already exists for this user (undirected)
    existing = await conn.fetchrow('SELECT * FROM friendships WHERE ((person1 = $1 AND person2 = $2) OR (person1 = $2 AND person2 = $1)) AND user_id = $3', friendship_in.person1, friendship_in.person2, friendship_in.user_id)
    if existing:
        await conn.close()
        raise HTTPException(status_code=400, detail="Friendship already exists")
    await conn.execute(
        'INSERT INTO friendships (person1, person2, user_id) VALUES ($1, $2, $3)',
        friendship_in.person1, friendship_in.person2, friendship_in.user_id
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
async def delete_friendship(person1: str, person2: str, request: Request):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        result = await conn.execute('DELETE FROM friendships WHERE ((person1 = $1 AND person2 = $2) OR (person1 = $2 AND person2 = $1)) AND user_id = $3', person1, person2, user_id)
    else:
        result = await conn.execute('DELETE FROM friendships WHERE (person1 = $1 AND person2 = $2) OR (person1 = $2 AND person2 = $1)', person1, person2)
    await conn.close()
    if result == 'DELETE 1':
        return {"message": "Friendship deleted"}
    else:
        raise HTTPException(status_code=404, detail="Friendship not found")

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
        children = [r['child_name'] for r in relationships if r['parent_name'] == person['name']]
        parents = [r['parent_name'] for r in relationships if r['child_name'] == person['name']]
        tree_data.append({
            "id": person['name'],
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

@router.get("/people/{person_name}")
async def get_person(person_name: str, request: Request):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        row = await conn.fetchrow('SELECT * FROM people WHERE name = $1 AND user_id = $2', person_name, user_id)
    else:
        row = await conn.fetchrow('SELECT * FROM people WHERE name = $1', person_name)
    await conn.close()
    if row:
        return serialize_row(row)
    raise HTTPException(status_code=404, detail="Person not found")

@router.patch("/people/{person_name}/picture", response_model=Person)
async def update_person_picture(person_name: str, update: PersonUpdate, request: Request):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        row = await conn.fetchrow('SELECT * FROM people WHERE name = $1 AND user_id = $2', person_name, user_id)
    else:
        row = await conn.fetchrow('SELECT * FROM people WHERE name = $1', person_name)
    if not row:
        await conn.close()
        raise HTTPException(status_code=404, detail="Person not found")
    person = dict(row)
    picture = update.picture if update.picture is not None else person.get('picture')
    birth_date = update.birth_date if update.birth_date is not None else person.get('birth_date')
    death_date = update.death_date if update.death_date is not None else person.get('death_date')
    gender = update.gender if update.gender is not None else person.get('gender')
    if user_id:
        await conn.execute('UPDATE people SET picture = $1, birth_date = $2, death_date = $3, gender = $4 WHERE name = $5 AND user_id = $6', picture, birth_date, death_date, gender, person_name, user_id)
    else:
        await conn.execute('UPDATE people SET picture = $1, birth_date = $2, death_date = $3, gender = $4 WHERE name = $5', picture, birth_date, death_date, gender, person_name)
    row = await conn.fetchrow('SELECT * FROM people WHERE name = $1', person_name)
    await conn.close()
    return serialize_row(row)

@router.post("/people/{person_name}/upload-picture")
async def upload_person_picture(person_name: str, request: Request, file: UploadFile = File(...)):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        row = await conn.fetchrow('SELECT * FROM people WHERE name = $1 AND user_id = $2', person_name, user_id)
    else:
        row = await conn.fetchrow('SELECT * FROM people WHERE name = $1', person_name)
    if not row:
        await conn.close()
        raise HTTPException(status_code=404, detail="Person not found")
    # Validate file type
    if not file.content_type.startswith('image/'):
        await conn.close()
        raise HTTPException(status_code=400, detail="File must be an image")
    # Create filename
    file_extension = file.filename.split('.')[-1]
    normalized_input = normalize_name(person_name)
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
        await conn.execute('UPDATE people SET picture = $1 WHERE name = $2 AND user_id = $3', url, person_name, user_id)
    else:
        await conn.execute('UPDATE people SET picture = $1 WHERE name = $2', url, person_name)
    await conn.close()
    return {"filename": filename, "url": url}

@router.patch("/people/{person_name}/birth-date", response_model=Person)
async def update_person_birth_date(person_name: str, request: Request, birth_date: Optional[str] = None):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        await conn.execute('UPDATE people SET birth_date = $1 WHERE name = $2 AND user_id = $3', birth_date, person_name, user_id)
    else:
        await conn.execute('UPDATE people SET birth_date = $1 WHERE name = $2', birth_date, person_name)
    row = await conn.fetchrow('SELECT * FROM people WHERE name = $1', person_name)
    await conn.close()
    if row:
        return serialize_row(row)
    raise HTTPException(status_code=404, detail="Person not found")

@router.patch("/people/{person_name}/death-date", response_model=Person)
async def update_person_death_date(person_name: str, request: Request, death_date: Optional[str] = None):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        await conn.execute('UPDATE people SET death_date = $1 WHERE name = $2 AND user_id = $3', death_date, person_name, user_id)
    else:
        await conn.execute('UPDATE people SET death_date = $1 WHERE name = $2', death_date, person_name)
    row = await conn.fetchrow('SELECT * FROM people WHERE name = $1', person_name)
    await conn.close()
    if row:
        return serialize_row(row)
    raise HTTPException(status_code=404, detail="Person not found")

@router.patch("/people/{person_name}/gender", response_model=Person)
async def update_person_gender(person_name: str, request: Request, gender: Optional[str] = None):
    user_id = request.query_params.get("user_id")
    conn = await asyncpg.connect(DATABASE_URL)
    if user_id:
        await conn.execute('UPDATE people SET gender = $1 WHERE name = $2 AND user_id = $3', gender, person_name, user_id)
    else:
        await conn.execute('UPDATE people SET gender = $1 WHERE name = $2', gender, person_name)
    row = await conn.fetchrow('SELECT * FROM people WHERE name = $1', person_name)
    await conn.close()
    if row:
        return serialize_row(row)
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