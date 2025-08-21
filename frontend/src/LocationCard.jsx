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
        stories.flatMap(story => (story.people_ids && Array.isArray(story.people_ids) ? story.people_ids : []))
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <div 
        className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
        onClick={toggleExpand}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {location === "Uncategorized" ? "📁 Uncategorized Stories" : `📍 ${location}`}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {stories.length} {stories.length === 1 ? 'story' : 'stories'}
            </p>
          </div>
          <div className="text-gray-400 dark:text-gray-500">
            <svg 
              className={`w-6 h-6 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
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
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700">
          <div className="space-y-4">
            {stories.map((story) => (
              <div key={story.id} className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 p-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                  {story.title}
                </h3>
                <p className="text-gray-700 dark:text-gray-200 mb-2">
                  {story.content}
                </p>
                {story.date && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    📅 {new Date(story.date).toLocaleDateString()}
                  </p>
                )}
                {story.people_ids && story.people_ids.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 items-center">
                    {story.people_ids.map((person, idx) => (
                      <div key={`${story.id}-person-${idx}`} className="flex items-center gap-1">
                        <PersonAvatar person={person} size="small" />
                        <span 
                          className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full"
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