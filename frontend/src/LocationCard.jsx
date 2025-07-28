import { useState, useEffect } from 'react';
import PersonAvatar from './PersonAvatar';
import { getPerson } from './api';

function LocationCard({ location, stories }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [peopleNames, setPeopleNames] = useState({});

  useEffect(() => {
    // Collect all unique person IDs from all stories
    const allIds = Array.from(
      new Set(
        stories.flatMap(story => (story.people && Array.isArray(story.people) ? story.people : []))
      )
    );
    Promise.all(
      allIds.map(pid =>
        getPerson(pid).then(p => [pid, p.name]).catch(() => [pid, "Unknown"])
      )
    ).then(entries => setPeopleNames(Object.fromEntries(entries)));
  }, [stories]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div 
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={toggleExpand}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {location === "Uncategorized" ? "📁 Uncategorized Stories" : `📍 ${location}`}
            </h2>
            <p className="text-gray-600 mt-1">
              {stories.length} {stories.length === 1 ? 'story' : 'stories'}
            </p>
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
            {stories.map((story) => (
              <div key={story.id} className="bg-white rounded border p-4">
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
                {story.people && story.people.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 items-center">
                    {story.people.map((person, idx) => (
                      <div key={`${story.id}-person-${idx}`} className="flex items-center gap-1">
                        <PersonAvatar person={person} size="small" />
                        <span 
                          className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                        >
                          {peopleNames[person] || person}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationCard; 