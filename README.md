# Family Stories App

A web application for collecting and organizing family stories with people, locations, and timelines.

## Features

- **Story Management**: Add, edit, and delete family stories
- **People Tracking**: Associate stories with family members and friends
- **Location Tracking**: Tag stories with locations
- **Timeline View**: View stories chronologically
- **Person Pictures**: Add profile pictures for people mentioned in stories
- **Multiple Views**: 
  - List view (default)
  - Timeline view
  - People view (with pictures)
  - Location view

## Person Picture Feature

### Adding Pictures to People

1. **Automatic Person Creation**: When you add a story and mention people, they are automatically added to the people database
2. **Upload Pictures**: 
   - Go to the "View by People" page
   - Click the "+" button on any person's avatar to upload a picture
   - Supported formats: JPG, PNG, GIF, etc.
3. **Picture Display**: 
   - Pictures appear as circular avatars next to people's names
   - Pictures are shown in stories, timeline view, and location view
   - Default avatar (👤) is shown when no picture is uploaded

### How It Works

- Pictures are stored in the backend `uploads/` directory
- Each person can have one profile picture
- Pictures are served as static files from the backend
- The system automatically creates person records when they're mentioned in stories

## Setup

### Backend (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install fastapi uvicorn python-multipart
   ```

4. Run the backend server:
   ```bash
   uvicorn appfolder.main:app --reload
   ```

The backend will run on `http://localhost:8000`

### Frontend (React + Vite)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:5173`

## Usage

1. **Adding Stories**: Use the form on the main page to add new stories
2. **Adding People**: Mention people in stories (comma-separated) or add them directly from the People view
3. **Adding Pictures**: Click the "+" button on person avatars to upload pictures
4. **Viewing Stories**: Use the navigation links to switch between different views
5. **Editing**: Use the menu (three dots) on story cards to edit titles, people, dates, and locations

## API Endpoints

### Stories
- `GET /stories` - Get all stories
- `POST /stories` - Add a new story
- `DELETE /stories/{index}` - Delete a story
- `PATCH /stories/{index}/title` - Update story title
- `PATCH /stories/{index}/date` - Update story date
- `PATCH /stories/{index}/people` - Update story people
- `PATCH /stories/{index}/location` - Update story location

### People
- `GET /people` - Get all people
- `POST /people` - Add a new person
- `GET /people/{person_name}` - Get a specific person
- `PATCH /people/{person_name}/picture` - Update person's picture URL
- `POST /people/{person_name}/upload-picture` - Upload a picture for a person

## File Structure

```
repository-project/
├── backend/
│   ├── appfolder/
│   │   ├── main.py
│   │   ├── routes/
│   │   │   └── stories.py
│   │   └── uploads/          # Picture storage
│   └── venv/
└── frontend/
    ├── src/
    │   ├── api.js
    │   ├── App.jsx
    │   ├── PersonAvatar.jsx  # New component for person pictures
    │   ├── PersonCard.jsx
    │   ├── StoryCard.jsx
    │   └── pages/
    │       ├── Default.jsx
    │       ├── PersonView.jsx
    │       ├── LocationView.jsx
    │       └── TimelineView.jsx
    └── package.json
```