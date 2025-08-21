import { useState, useEffect } from "react";
import { fetchStories, postStory, deleteStory, patchStoryTitle, patchStoryDate, patchStoryPeople, patchStoryLocation, uploadStoryPhotos, fetchPeople } from '../api';
import { Link } from "react-router-dom";
import StoryCard from '../StoryCard';
import { useAuth } from '../contexts/AuthContext';

export default function Default() {
    const [stories, setStories] = useState([]);
    const [newStory, setNewStory] = useState('');
    const [newPeople, setNewPeople] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newPhoto, setNewPhoto] = useState(null);
    const [newPhotos, setNewPhotos] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editedTitle, setEditedTitle] = useState('');
    const [storyToDelete, setStoryToDelete] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { user } = useAuth();
    const [people, setPeople] = useState([]);
  
    useEffect(() => {
      if (user) {
        fetchStories().then(setStories);
        fetchPeople().then(setPeople);
      }
    }, [user]);
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!newStory.trim() || !user) return;
      
      // Parse people from comma-separated input
      const peopleNameToId = Object.fromEntries(people.map(p => [p.name, p.id]));
      const peopleIds = newPeople.trim()
        ? newPeople.split(',').map(p => p.trim()).filter(p => p.length > 0).map(name => peopleNameToId[name]).filter(Boolean)
        : [];
      
      const result = await postStory({ 
        content: newStory, 
        people_ids: peopleIds,
        location_name: newLocation.trim(),
        photos: []
      });
      let storyWithPhotos = result;
      if (newPhotos && newPhotos.length > 0) {
        try {
          const uploadRes = await uploadStoryPhotos(result.id, newPhotos);
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
  
    const handleDeleteStory = async (storyId) => {
      try {
        await deleteStory(storyId);
        const updatedStories = stories.filter(story => story.id !== storyId);
        setStories(updatedStories);
      } catch (error) {
        console.error('Error deleting story:', error);
      }
    };
  
    const handleSaveTitle = async (storyId, newTitle) => {
      console.log("Saving title for story", storyId, "to", newTitle);
      try {
        const updatedStory = await patchStoryTitle(storyId, newTitle);
        const updatedStories = stories.map(story => 
          story.id === storyId ? updatedStory : story
        );
        setStories(updatedStories);
        setEditingIndex(null);
      } catch (error) {
        console.error('Error saving title:', error);
      }
    };

    const handleSaveDate = async (storyId, newDate) => {
      console.log("Saving date for story", storyId, "to", newDate);
      try {
        const updatedStory = await patchStoryDate(storyId, newDate);
        const updatedStories = stories.map(story => 
          story.id === storyId ? updatedStory : story
        );
        setStories(updatedStories);
      } catch (error) {
        console.error('Error saving date:', error);
      }
    };

    const handleSavePeople = async (storyId, newPeople) => {
      console.log("Saving people for story", storyId, "to", newPeople);
      try {
        const updatedStory = await patchStoryPeople(storyId, newPeople);
        const updatedStories = stories.map(story => 
          story.id === storyId ? updatedStory : story
        );
        setStories(updatedStories);
      } catch (error) {
        console.error('Error saving people:', error);
      }
    };

    const handleSaveLocation = async (storyId, newLocation) => {
      console.log("Saving location for story", storyId, "to", newLocation);
      try {
        const updatedStory = await patchStoryLocation(storyId, newLocation);
        const updatedStories = stories.map(story => 
          story.id === storyId ? updatedStory : story
        );
        setStories(updatedStories);
      } catch (error) {
        console.error('Error saving location:', error);
      }
    };

    if (!user) {
      return (
        <div className="p-4 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-6">Family Stories</h1>
          <p className="text-gray-600 dark:text-gray-300">Please log in to view and create stories.</p>
        </div>
      );
    }

    return (
        <div className="p-4 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-6">Family Stories</h1>

            <form onSubmit={handleSubmit} className="mb-4">
                <textarea
                    className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 mb-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    rows={4}
                    value={newStory}
                    onChange={(e) => setNewStory(e.target.value)}
                    placeholder="Write a new story..."
                />
                <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 mb-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    value={newPeople}
                    onChange={(e) => setNewPeople(e.target.value)}
                    placeholder="People in this story (comma-separated, e.g., John, Mary, Dad)"
                />
                <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 mb-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Location (e.g., New York, Grandma's House, Beach)"
                />
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 mb-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
                    onChange={e => setNewPhotos(Array.from(e.target.files))}
                />
                <button type="submit" className="mt-3 bg-blue-800 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors duration-200">
                    Submit Story
                </button>
            </form>

            <div className="space-y-4">
                {stories.map((story) => (
                    <StoryCard
                        key={story.id}
                        story={story}
                        onTitleUpdate={handleSaveTitle}
                        handleDelete={handleDeleteStory}
                        onDateUpdate={handleSaveDate}
                        onPeopleUpdate={handleSavePeople}
                        onLocationUpdate={handleSaveLocation}
                    />
                ))}
            </div>
            {showDeleteConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 dark:bg-black/80 z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg text-center max-w-md mx-4">
                        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Are you sure you want to delete the story: <span className='font-bold'>&quot;{stories.find(s => s.id === storyToDelete)?.title}&quot;</span>?</h2>
                        <div className="flex justify-center gap-4">
                            <button
                                className="bg-red-600 dark:bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-200"
                                onClick={async () => {
                                    await handleDeleteStory(storyToDelete);
                                    setShowDeleteConfirm(false);
                                    setStoryToDelete(null);
                                }}
                            >
                                Yes, Delete
                            </button>
                            <button
                                className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-200"
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