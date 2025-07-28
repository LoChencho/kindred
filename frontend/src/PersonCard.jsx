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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div 
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
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
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                    <span className="text-2xl">👤</span>
                  </div>
                )}
                {person !== "Uncategorized" && (
                  <label className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow cursor-pointer">
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
            <span className="font-bold text-lg">
              {person === "Uncategorized"
                ? "Uncategorized"
                : (personData?.name || "Unknown")}
            </span>
          </div>
          <button
            className="ml-4 text-blue-600 hover:underline"
            onClick={toggleExpand}
          >
            {isExpanded ? "Hide Stories" : "Show Stories"}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="p-4 border-t">
          {stories && stories.length > 0 ? (
            stories.map(story => (
              <StoryCard key={story.id} story={story} />
            ))
          ) : (
            <div className="text-gray-500">No stories for this person.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default PersonCard;
