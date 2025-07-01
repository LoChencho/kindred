from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi import Path
from pydantic import BaseModel
from typing import List
from typing import Optional
from datetime import datetime
import os
import shutil
from pathlib import Path as PathLib

router = APIRouter()

class Story(BaseModel):
    #id: int
    title: str
    content: str
    date: str = ""
    location: str = ""
    people: List[str] = []
    photos: List[str] = []  # List of photo file paths
    #author: str = "Anonymous"

class StoryIn(BaseModel):
    content: str
    people: List[str] = []
    location: str = ""
    photos: List[str] = []  # Accept list of photo paths optionally

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

class PersonIn(BaseModel):
    name: str
    picture: Optional[str] = None
    birth_date: Optional[str] = None
    death_date: Optional[str] = None
    gender: Optional[str] = None

class PersonUpdate(BaseModel):
    picture: Optional[str] = None
    birth_date: Optional[str] = None
    death_date: Optional[str] = None
    gender: Optional[str] = None

class Relationship(BaseModel):
    parent_name: str
    child_name: str
    relationship_type: str = "parent-child"  # Could be "parent-child", "spouse", etc.

class RelationshipIn(BaseModel):
    parent_name: str
    child_name: str
    relationship_type: str = "parent-child"

class Friendship(BaseModel):
    person1: str
    person2: str

class FriendshipIn(BaseModel):
    person1: str
    person2: str

# Temporary in-memory DB
stories: List[Story] = []
people: List[Person] = []
relationships: List[Relationship] = []
friendships: List[Friendship] = []

# Create uploads directory if it doesn't exist
UPLOAD_DIR = PathLib("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

def rebuild_people_from_stories():
    global people
    unique_names = set()
    for story in stories:
        for name in story.people:
            unique_names.add(name)
    # Keep existing pictures if possible
    name_to_person = {p.name: p for p in people}
    new_people = []
    for name in unique_names:
        if name in name_to_person:
            new_people.append(name_to_person[name])
        else:
            new_people.append(Person(name=name, picture=None))
    people = new_people

# Call on startup
rebuild_people_from_stories()

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

@router.post("/stories", response_model=Story)
def add_story(story_in: StoryIn):
    title = generate_title(story_in.content)
    current_date = generate_date(story_in.content)
    story = Story(title=title, content=story_in.content, date=current_date, people=story_in.people, location=story_in.location, photos=story_in.photos)
    stories.append(story)
    rebuild_people_from_stories()
    return story

@router.post("/people", response_model=Person)
def add_person(person_in: PersonIn):
    person = Person(name=person_in.name, picture=person_in.picture, birth_date=person_in.birth_date, death_date=person_in.death_date, gender=person_in.gender)
    people.append(person)
    return person

@router.get("/stories")
def get_stories():
    return stories

@router.get("/people")
def get_people():
    return people

@router.get("/people/{person_name}")
def get_person(person_name: str):
    normalized_input = normalize_name(person_name)
    for person in people:
        if normalize_name(person.name) == normalized_input:
            return person
    
    # If person not found, check if they exist in any story and create them
    for story in stories:
        for story_person in story.people:
            if normalize_name(story_person) == normalized_input:
                # Create the person with the original name from the story
                new_person = Person(name=story_person, picture=None)
                people.append(new_person)
                return new_person
    
    raise HTTPException(status_code=404, detail="Person not found")

@router.patch("/people/{person_name}/picture", response_model=Person)
def update_person_picture(person_name: str, update: PersonUpdate):
    normalized_input = normalize_name(person_name)
    for person in people:
        if normalize_name(person.name) == normalized_input:
            if update.picture is not None:
                person.picture = update.picture
            if update.birth_date is not None:
                person.birth_date = update.birth_date
            if update.death_date is not None:
                person.death_date = update.death_date
            if update.gender is not None:
                person.gender = update.gender
            return person
    raise HTTPException(status_code=404, detail="Person not found")

@router.post("/people/{person_name}/upload-picture")
async def upload_person_picture(person_name: str, file: UploadFile = File(...)):
    normalized_input = normalize_name(person_name)
    person_obj = None
    for p in people:
        if normalize_name(p.name) == normalized_input:
            person_obj = p
            break
    if not person_obj:
        raise HTTPException(status_code=404, detail="Person not found")
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    # Create filename
    file_extension = file.filename.split('.')[-1]
    filename = f"{normalized_input}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    # Update person's picture field
    person_obj.picture = f"/uploads/{filename}"
    return {"filename": filename, "url": f"/uploads/{filename}"}

@router.delete("/stories/{story_index}")
def delete_story(story_index: int = Path(...)):
    if 0 <= story_index < len(stories):
        deleted_story = stories.pop(story_index)
        rebuild_people_from_stories()
        return {"message": "Story deleted", "deleted_story": deleted_story}
    else:
        raise HTTPException(status_code=404, detail="Story not found")

@router.patch("/stories/{story_index}/title", response_model=Story)
def update_story_title(story_index: int = Path(...), title: Optional[str] = None):
    if 0 <= story_index < len(stories):
        if title:
            stories[story_index].title = title
        return stories[story_index]
    else:
        raise HTTPException(status_code=404, detail="Story not found")

@router.patch("/stories/{story_index}/date", response_model=Story)
def update_story_date(story_index: int = Path(...), update: Optional[DateUpdate] = None):
    if 0 <= story_index < len(stories):
        if update and update.date is not None:
            stories[story_index].date = update.date
        return stories[story_index]
    else:
        raise HTTPException(status_code=404, detail="Story not found")

@router.patch("/stories/{story_index}/people", response_model=Story)
def update_story_people(story_index: int = Path(...), update: Optional[PeopleUpdate] = None):
    if 0 <= story_index < len(stories):
        if update and update.people is not None:
            stories[story_index].people = update.people
        return stories[story_index]
    else:
        raise HTTPException(status_code=404, detail="Story not found")

@router.patch("/stories/{story_index}/location", response_model=Story)
def update_story_location(story_index: int = Path(...), update: Optional[LocationUpdate] = None):
    if 0 <= story_index < len(stories):
        if update and update.location is not None:
            stories[story_index].location = update.location
        return stories[story_index]
    else:
        raise HTTPException(status_code=404, detail="Story not found")

@router.post("/stories/{story_index}/upload-photos")
async def upload_story_photos(story_index: int, files: list[UploadFile] = File(...)):
    if not (0 <= story_index < len(stories)):
        raise HTTPException(status_code=404, detail="Story not found")
    uploaded_files = []
    for file in files:
        if not file.content_type.startswith('image/'):
            continue  # skip non-images
        file_extension = file.filename.split('.')[-1]
        filename = f"story_{story_index}_{len(stories[story_index].photos)}_{file.filename}"
        file_path = UPLOAD_DIR / filename
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            continue  # skip failed uploads
        url = f"/uploads/{filename}"
        stories[story_index].photos.append(url)
        uploaded_files.append(url)
    return {"uploaded": uploaded_files, "all_photos": stories[story_index].photos}

@router.post("/relationships", response_model=Relationship)
def add_relationship(relationship_in: RelationshipIn):
    # Check if both people exist
    parent_exists = any(normalize_name(p.name) == normalize_name(relationship_in.parent_name) for p in people)
    child_exists = any(normalize_name(p.name) == normalize_name(relationship_in.child_name) for p in people)
    
    if not parent_exists or not child_exists:
        raise HTTPException(status_code=404, detail="One or both people not found")
    
    # Check if relationship already exists
    existing = any(
        normalize_name(r.parent_name) == normalize_name(relationship_in.parent_name) and 
        normalize_name(r.child_name) == normalize_name(relationship_in.child_name)
        for r in relationships
    )
    
    if existing:
        raise HTTPException(status_code=400, detail="Relationship already exists")
    
    relationship = Relationship(
        parent_name=relationship_in.parent_name,
        child_name=relationship_in.child_name,
        relationship_type=relationship_in.relationship_type
    )
    relationships.append(relationship)
    return relationship

@router.post("/friendships", response_model=Friendship)
def add_friendship(friendship_in: FriendshipIn):
    # Check if both people exist
    person1_exists = any(normalize_name(p.name) == normalize_name(friendship_in.person1) for p in people)
    person2_exists = any(normalize_name(p.name) == normalize_name(friendship_in.person2) for p in people)
    
    if not person1_exists or not person2_exists:
        raise HTTPException(status_code=404, detail="One or both people not found")
    
    # Check if friendship already exists (undirected)
    normalized1 = normalize_name(friendship_in.person1)
    normalized2 = normalize_name(friendship_in.person2)
    existing = any(
        (normalize_name(f.person1) == normalized1 and normalize_name(f.person2) == normalized2) or
        (normalize_name(f.person1) == normalized2 and normalize_name(f.person2) == normalized1)
        for f in friendships
    )
    
    if existing:
        raise HTTPException(status_code=400, detail="Friendship already exists")
    
    friendship = Friendship(
        person1=friendship_in.person1,
        person2=friendship_in.person2
    )
    friendships.append(friendship)
    return friendship

@router.get("/relationships")
def get_relationships():
    return relationships

@router.get("/family-tree")
def get_family_tree():
    """Get the family tree structure for visualization"""
    tree_data = []
    
    # Group people by their role in the tree
    for person in people:
        children = [r.child_name for r in relationships 
                   if normalize_name(r.parent_name) == normalize_name(person.name)]
        parents = [r.parent_name for r in relationships 
                  if normalize_name(r.child_name) == normalize_name(person.name)]
        
        tree_data.append({
            "id": person.name,
            "name": person.name,
            "picture": person.picture,
            "birth_date": person.birth_date,
            "death_date": person.death_date,
            "gender": person.gender,
            "children": children,
            "parents": parents
        })
    
    return tree_data

@router.patch("/people/{person_name}/birth-date", response_model=Person)
def update_person_birth_date(person_name: str, birth_date: Optional[str] = None):
    normalized_input = normalize_name(person_name)
    for person in people:
        if normalize_name(person.name) == normalized_input:
            if birth_date is not None:
                person.birth_date = birth_date
            return person
    raise HTTPException(status_code=404, detail="Person not found")

@router.patch("/people/{person_name}/death-date", response_model=Person)
def update_person_death_date(person_name: str, death_date: Optional[str] = None):
    normalized_input = normalize_name(person_name)
    for person in people:
        if normalize_name(person.name) == normalized_input:
            if death_date is not None:
                person.death_date = death_date
            return person
    raise HTTPException(status_code=404, detail="Person not found")

@router.patch("/people/{person_name}/gender", response_model=Person)
def update_person_gender(person_name: str, gender: Optional[str] = None):
    normalized_input = normalize_name(person_name)
    for person in people:
        if normalize_name(person.name) == normalized_input:
            if gender is not None:
                person.gender = gender
            return person
    raise HTTPException(status_code=404, detail="Person not found")

@router.delete("/friendships")
def delete_friendship(person1: str, person2: str):
    normalized_input1 = normalize_name(person1)
    normalized_input2 = normalize_name(person2)
    for friendship in friendships:
        f1 = normalize_name(friendship.person1)
        f2 = normalize_name(friendship.person2)
        if (f1 == normalized_input1 and f2 == normalized_input2) or (f1 == normalized_input2 and f2 == normalized_input1):
            friendships.remove(friendship)
            return {"message": "Friendship deleted"}
    raise HTTPException(status_code=404, detail="Friendship not found")

@router.delete("/relationships")
def delete_relationship(person1: str, person2: str):
    normalized_input1 = normalize_name(person1)
    normalized_input2 = normalize_name(person2)
    for relationship in relationships:
        if normalize_name(relationship.person1) == normalized_input1 and normalize_name(relationship.person2) == normalized_input2:
            relationships.remove(relationship)
            return {"message": "Relationship deleted"}
    raise HTTPException(status_code=404, detail="Relationship not found")

@router.get("/friendships")
def get_friendships():
    return friendships