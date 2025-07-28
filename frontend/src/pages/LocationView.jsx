import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchStories } from '../api';
import LocationCard from '../LocationCard';

export default function LocationView() {
  const [stories, setStories] = useState([]);
  const [locationMap, setLocationMap] = useState({});

  useEffect(() => {
    fetchStories().then(setStories);
  }, []);

  // Group stories by location
  useEffect(() => {
    const grouped = {};
    
    stories.forEach(story => {
      if (story.location_name && story.location_name.trim()) {
        const location = story.location_name.trim();
        if (!grouped[location]) {
          grouped[location] = [];
        }
        grouped[location].push(story);
      } else {
        // Stories without location go to "Uncategorized"
        if (!grouped["Uncategorized"]) {
          grouped["Uncategorized"] = [];
        }
        grouped["Uncategorized"].push(story);
      }
    });

    setLocationMap(grouped);
  }, [stories]);

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:underline">&larr; Back to List</Link>
        <span className="mx-2 text-gray-400">|</span>
        <Link to="/timeline" className="text-blue-600 hover:underline">View Timeline</Link>
        <span className="mx-2 text-gray-400">|</span>
        <Link to="/people" className="text-blue-600 hover:underline">View by People</Link>
        <span className="mx-2 text-gray-400">|</span>
        <Link to="/family-tree" className="text-blue-600 hover:underline">Family Tree</Link>
      </div>
      <h1 className="text-3xl font-bold mb-12 text-center">📍 Stories by Location</h1>
      
      {Object.keys(locationMap).length === 0 ? (
        <div className="text-center text-gray-600">
          <p>No stories found. Add some stories with locations to see them categorized here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(locationMap).map(([location, locationStories]) => (
            <LocationCard
              key={location}
              location={location}
              stories={locationStories}
            />
          ))}
        </div>
      )}
    </div>
  );
} 