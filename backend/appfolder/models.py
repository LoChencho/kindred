from pydantic import BaseModel
from typing import List, Optional

class Story(BaseModel):
    id: int
    title: str
    content: str
    date: Optional[str] = None
    location_id: Optional[int] = None
    location_name: Optional[str] = None  # For serialization/display
    people_ids: List[int] = []
    photos: List[str] = []  # List of photo file paths
    user_id: Optional[str] = None  # Add user_id field

class StoryIn(BaseModel):
    content: str
    people_ids: List[int] = []
    location_id: Optional[int] = None
    location_name: Optional[str] = None  # Accept name for creation
    photos: List[str] = []  # Accept list of photo paths optionally
    date: Optional[str] = None  # Allow date to be submitted optionally
    user_id: str  # Add user_id field

class TitleUpdate(BaseModel):
    title: Optional[str] = None

class DateUpdate(BaseModel):
    date: Optional[str] = None

class PeopleUpdate(BaseModel):
    people_ids: Optional[List[int | str]] = None

class LocationUpdate(BaseModel):
    location_id: Optional[int] = None
    location_name: Optional[str] = None

class Person(BaseModel):
    id: int
    name: str
    picture: Optional[str] = None
    birth_date: Optional[str] = None
    death_date: Optional[str] = None
    gender: Optional[str] = None  # 'M', 'F', or None
    user_id: Optional[str] = None  # Add user_id field
    nicknames: Optional[List[str]] = []  # Add nicknames field

class PersonIn(BaseModel):
    id: int
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

class NameUpdate(BaseModel):
    name: str

class Relationship(BaseModel):
    parent_id: int
    child_id: int
    relationship_type: str = "parent-child"  # Could be "parent-child", "spouse", etc.
    user_id: Optional[str] = None  # Add user_id field

class RelationshipIn(BaseModel):
    parent_id: int
    child_id: int
    relationship_type: str = "parent-child"
    user_id: str  # Add user_id field

class Friendship(BaseModel):
    person1_id: int
    person2_id: int
    user_id: Optional[str] = None  # Add user_id field

class FriendshipIn(BaseModel):
    person1_id: int
    person2_id: int
    user_id: str  # Add user_id field

class Location(BaseModel):
    id: int
    name: str
    user_id: str
    picture: Optional[str] = None
    created_at: Optional[str] = None

class LocationIn(BaseModel):
    name: str
    user_id: str
    picture: Optional[str] = None
