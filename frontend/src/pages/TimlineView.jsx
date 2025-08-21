import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StoryCard from '../StoryCard';
import { fetchStories, deleteStory, patchStoryTitle, patchStoryDate, patchStoryPeople, patchStoryLocation } from '../api';

export default function TimelineView() {
  const [stories, setStories] = useState([]);
  const [storyToDelete, setStoryToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchStories().then(setStories);
  }, []);

  // Sort stories by date (newest first)
  const sortedStories = [...stories].sort((a, b) => {
    // If both have dates, compare them
    if (a.date && b.date) {
      return new Date(b.date) - new Date(a.date);
    }
    // If only one has a date, put the one with date first
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    // If neither has a date, keep original order
    return 0;
  });

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-6 py-12 transition-colors duration-300">
      <div className="mb-6">
        <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-200">&larr; Back to List</Link>
        <span className="mx-2 text-gray-400 dark:text-gray-500">|</span>
        <Link to="/people" className="text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-200">View by People</Link>
        <span className="mx-2 text-gray-400 dark:text-gray-500">|</span>
        <Link to="/location" className="text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-200">View by Location</Link>
        <span className="mx-2 text-gray-400 dark:text-gray-500">|</span>
        <Link to="/family-tree" className="text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-200">Family Tree</Link>
      </div>
      <h1 className="text-3xl font-bold mb-12 text-center text-gray-900 dark:text-gray-100">📜 Story Timeline</h1>
      <div className="relative border-l-4 border-blue-500 dark:border-blue-400 pl-6 space-y-12">
        {sortedStories.map((story) => (
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