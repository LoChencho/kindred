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
    <div className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:underline">&larr; Back to List</Link>
        <span className="mx-2 text-gray-400">|</span>
        <Link to="/people" className="text-blue-600 hover:underline">View by People</Link>
        <span className="mx-2 text-gray-400">|</span>
        <Link to="/location" className="text-blue-600 hover:underline">View by Location</Link>
        <span className="mx-2 text-gray-400">|</span>
        <Link to="/family-tree" className="text-blue-600 hover:underline">Family Tree</Link>
      </div>
      <h1 className="text-3xl font-bold mb-12 text-center">📜 Story Timeline</h1>
      <div className="relative border-l-4 !border-blue-500 pl-6 space-y-12">
        {sortedStories.map((story, index) => (
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
      </div>
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