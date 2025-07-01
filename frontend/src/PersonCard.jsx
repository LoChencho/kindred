import { useState, useEffect } from 'react';
import StoryCard from './StoryCard';
import { getPerson, uploadPersonPicture } from './api';

function PersonCard({ person, stories }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [personData, setPersonData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (person !== "Uncategorized") {
      getPerson(person).then(setPersonData).catch(() => {
        // If person doesn't exist in the people list, create a default object
        setPersonData({ name: person, picture: null });
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
                    alt={person}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                    <span className="text-2xl">👤</span>
                  </div>
                )}
                {person !== "Uncategorized" && (
                  <label className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-1 cursor-pointer hover:bg-blue-600 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    {isUploading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                  </label>
                )}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {person === "Uncategorized" ? "📁 Uncategorized Stories" : `👤 ${person}`}
              </h2>
              <p className="text-gray-600 mt-1">
                {stories.length} {stories.length === 1 ? 'story' : 'stories'}
              </p>
            </div>
          </div>
          <div className="text-gray-400">
            <svg 
              className={`w-6 h-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="space-y-4">
            {stories.map((story, index) => (
              <div key={index} className="bg-white rounded border p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {story.title}
                </h3>
                <p className="text-gray-700 mb-2">
                  {story.content}
                </p>
                {story.date && (
                  <p className="text-sm text-gray-500">
                    📅 {new Date(story.date).toLocaleDateString()}
                  </p>
                )}
                {story.location && (
                  <p className="text-sm text-gray-500">
                    📍 {story.location}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PersonCard;
