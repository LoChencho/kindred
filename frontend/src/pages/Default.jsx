import { useState, useEffect } from "react";
import { fetchStories, postStory, deleteStory, patchStoryTitle, patchStoryDate, patchStoryPeople, patchStoryLocation, uploadStoryPhotos } from '../api';
import { Link } from "react-router-dom";
import StoryCard from '../StoryCard';

export default function Default() {
    const [stories, setStories] = useState([]);

    // useEffect(() => {   

    //     axios.get("http://localhost:8000/stories").then((res) => {
    //         setStories(res.data);
    //     });
    // }, []);

    const [newStory, setNewStory] = useState('');
    const [newPeople, setNewPeople] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newPhoto, setNewPhoto] = useState(null);
    const [newPhotos, setNewPhotos] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editedTitle, setEditedTitle] = useState('');
    const [storyToDelete, setStoryToDelete] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  
    useEffect(() => {
      fetchStories().then(setStories);
    }, []);
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!newStory.trim()) return;
      
      // Parse people from comma-separated input
      const people = newPeople.trim() 
        ? newPeople.split(',').map(p => p.trim()).filter(p => p.length > 0)
        : [];
      
      const result = await postStory({ 
        content: newStory, 
        people: people,
        location: newLocation.trim(),
        photos: []
      });
      let storyWithPhotos = result;
      if (newPhotos && newPhotos.length > 0) {
        try {
          const uploadRes = await uploadStoryPhotos(stories.length, newPhotos);
          if (uploadRes && uploadRes.all_photos) {
            storyWithPhotos = { ...result, photos: uploadRes.all_photos };
          }
        } catch (err) {
          console.error('Photo upload failed:', err);
        }
      }
      setStories([...stories, storyWithPhotos]);
      setNewStory('');
      setNewPeople('');
      setNewLocation('');
      setNewPhoto(null);
      setNewPhotos([]);
    };
  
    const handleDeleteStory = async (index) => {
      const story = stories[index];
    
      try {
        await deleteStory(index);
        const updatedStories = stories.filter((_, i) => i !== index);
        setStories(updatedStories);
      } catch (error) {
        console.error("Failed to delete story:", error);
      }
    };
  
    const handleSaveTitle = async (index, newTitle) => {
      console.log("Saving title at index", index, "to", newTitle);
    
      const story = stories[index];
      const updatedStory = { ...story, title: newTitle };
    
      await patchStoryTitle(index, newTitle);
    
      const updatedStories = [...stories];
      updatedStories[index] = updatedStory;
      setStories(updatedStories);
      setEditingIndex(null);
      setEditedTitle('');
    };

    const handleSaveDate = async (index, newDate) => {
      console.log("Saving date at index", index, "to", newDate);
    
      const story = stories[index];
      const updatedStory = { ...story, date: newDate };
    
      await patchStoryDate(index, newDate);
    
      const updatedStories = [...stories];
      updatedStories[index] = updatedStory;
      setStories(updatedStories);
    };

    const handleSavePeople = async (index, newPeople) => {
      console.log("Saving people at index", index, "to", newPeople);
    
      const story = stories[index];
      const updatedStory = { ...story, people: newPeople };

      await patchStoryPeople(index, newPeople);
    
      const updatedStories = [...stories];
      updatedStories[index] = updatedStory;
      setStories(updatedStories);
    };

    const handleSaveLocation = async (index, newLocation) => {
      console.log("Saving location at index", index, "to", newLocation);
    
      const story = stories[index];
      const updatedStory = { ...story, location: newLocation };

      await patchStoryLocation(index, newLocation);
    
      const updatedStories = [...stories];
      updatedStories[index] = updatedStory;
      setStories(updatedStories);
    };

    return (

        <div className="p-4 max-w-xl mx-auto">
            <div className="flex gap-4 mb-6">
                <Link to="/timeline" className="text-blue-600 hover:underline">View Timeline →</Link>
                <Link to="/people" className="text-blue-600 hover:underline">View by People →</Link>
                <Link to="/location" className="text-blue-600 hover:underline">View by Location →</Link>
                <Link to="/family-tree" className="text-blue-600 hover:underline">Family Tree →</Link>
            </div>
            <h1 className="text-2xl font-bold text-blue-600">Family Stories</h1>

            <form onSubmit={handleSubmit} className="mb-4">
                <textarea
                    className="w-full border rounded p-2 mb-3"
                    rows={4}
                    value={newStory}
                    onChange={(e) => setNewStory(e.target.value)}
                    placeholder="Write a new story..."
                />
                <input
                    type="text"
                    className="w-full border rounded p-2 mb-3"
                    value={newPeople}
                    onChange={(e) => setNewPeople(e.target.value)}
                    placeholder="People in this story (comma-separated, e.g., John, Mary, Dad)"
                />
                <input
                    type="text"
                    className="w-full border rounded p-2 mb-3"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Location (e.g., New York, Grandma's House, Beach)"
                />
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="w-full border rounded p-2 mb-3"
                    onChange={e => setNewPhotos(Array.from(e.target.files))}
                />
                <button type="submit" className="mt-3 !bg-blue-800 text-red-700 px-4 py-2 rounded hover:!bg-teal-600">
                    Submit Story
                </button>
            </form>

            <ul className="space-y-4">
                {stories.map((story, index) => (
                    <StoryCard
                        key={index}
                        story={story}
                        index={index}
                        onTitleUpdate={handleSaveTitle}
                        onDateUpdate={handleSaveDate}
                        onPeopleUpdate={handleSavePeople}
                        onLocationUpdate={handleSaveLocation}
                        handleDelete={() => {
                            setStoryToDelete(index);
                            setShowDeleteConfirm(true);
                        }}
                    />

                ))}
            </ul>
            {showDeleteConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
                    <div className="bg-white p-6 rounded shadow-lg text-center">
                        <h2 className="text-lg font-semibold mb-4">Are you sure you want to delete the story: <span className='font-bold'>&quot;{stories[storyToDelete]?.title}&quot;</span>?</h2>
                        <div className="flex justify-center gap-4">
                            <button
                                className="!bg-red-600 text-white px-4 py-2 rounded hover:!bg-red-700"
                                onClick={async () => {
                                    await handleDeleteStory(storyToDelete);
                                    setShowDeleteConfirm(false);
                                    setStoryToDelete(null);
                                }}
                            >
                                Yes, Delete
                            </button>
                            <button
                                className="!bg-gray-300 px-4 py-2 rounded hover:!bg-gray-400"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setStoryToDelete(null);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}