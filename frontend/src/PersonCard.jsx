import { useState, useEffect } from 'react';
import StoryCard from './StoryCard';
import { getPerson, uploadPersonPicture } from './api';

function PersonCard({ person, stories }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [personData, setPersonData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (person !== "Uncategorized") {
      console.log("Getting person data for", person);
      getPerson(person).then(setPersonData).catch(() => {
        setPersonData({ id: person, picture: null, name: "Unknown" });
      });
    }
  }, [person]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadPersonPicture(person, file);
      setPersonData(prev => ({ ...prev, picture: result.url }));
    } catch (error) {
      console.error('Failed to upload picture:', error);
      alert('Failed to upload picture. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <div 
        className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
        onClick={toggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {person !== "Uncategorized" && personData && (
              <div className="relative">
                {personData.picture ? (
                  <img 
                    src={`http://localhost:8000${personData.picture}`}
                    alt={personData.name || person}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center border-2 border-gray-300 dark:border-gray-500">
                    <span className="text-2xl">👤</span>
                  </div>
                )}
                {person !== "Uncategorized" && (
                  <label className="absolute bottom-0 right-0 bg-white dark:bg-gray-700 rounded-full p-1 shadow cursor-pointer border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-shadow duration-200">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <span role="img" aria-label="Upload" className="text-xs">📷</span>
                  </label>
                )}
              </div>
            )}
            {/* Display the person's name */}
            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
              {person === "Uncategorized"
                ? "Uncategorized"
                : (personData?.name || "Unknown")}
            </span>
          </div>
          <button
            className="ml-4 text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-200"
            onClick={toggleExpand}
          >
            {isExpanded ? "Hide Stories" : "Show Stories"}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          {stories && stories.length > 0 ? (
            stories.map(story => (
              <StoryCard key={story.id} story={story} />
            ))
          ) : (
            <div className="text-gray-500 dark:text-gray-400">No stories for this person.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default PersonCard;
