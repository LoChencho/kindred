from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from appfolder.routes import stories, people, relationships, friendships  # <-- import the router

app = FastAPI()

# Allow frontend to connect (Vite runs on port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(stories.router)
app.include_router(people.router)
app.include_router(relationships.router)
app.include_router(friendships.router)

@app.get("/")
def read_root():
    return {"message": "Backend is running!"}