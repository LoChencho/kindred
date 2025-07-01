from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from appfolder.routes import stories  # <-- import the router

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

@app.get("/")
def read_root():
    return {"message": "Backend is running!"}