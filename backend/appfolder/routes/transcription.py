import os
from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from dotenv import load_dotenv

router = APIRouter()

load_dotenv(dotenv_path='appfolder/.env')
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_KEY")
DEEPGRAM_API_URL = "https://api.deepgram.com/v1/listen"

@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()

    headers = {
        "Authorization": f"Token {DEEPGRAM_API_KEY}",
        "Content-Type": "application/octet-stream",
    }

    response = requests.post(
        DEEPGRAM_API_URL,
        headers=headers,
        data=audio_bytes,
        params={"punctuate": True, "language": "en"}
    )

    return response.json()