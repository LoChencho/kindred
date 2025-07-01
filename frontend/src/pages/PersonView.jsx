import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchStories, fetchPeople, postPerson } from '../api';
import PersonCard from '../PersonCard';

export default function PersonView() {
  const [stories, setStories] = useState([]);
  const [peopleMap, setPeopleMap] = useState({});
  const [people, setPeople] = useState([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchStories().then(setStories);
    fetchPeople().then(setPeople);
  }, []);

  // Group stories by people
  useEffect(() => {
    const grouped = {};
    
    stories.forEach(story => {
      if (story.people && story.people.length > 0) {
        story.people.forEach(person => {
          if (!grouped[person]) {
            grouped[person] = [];
          }
          grouped[person].push(story);
        });
      } else {
        // Stories without people go to "Uncategorized"
        if (!grouped["Uncategorized"]) {
          grouped["Uncategorized"] = [];
        }
        grouped["Uncategorized"].push(story);
      }
    });

    setPeopleMap(grouped);
  }, [stories]);

  const handleAddPerson = async (e) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;

    try {
      await postPerson({ name: newPersonName.trim() });
      setNewPersonName('');
      setShowAddForm(false);
      // Refresh people list
      fetchPeople().then(setPeople);
    } catch (error) {
      console.error('Failed to add person:', error);
      alert('Failed to add person. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:underline">&larr; Back to List</Link>
        <span className="mx-2 text-gray-400">|</span>
        <Link to="/timeline" className="text-blue-600 hover:underline">View Timeline</Link>
        <span className="mx-2 text-gray-400">|</span>
        <Link to="/location" className="text-blue-600 hover:underline">View by Location</Link>
        <span className="mx-2 text-gray-400">|</span>
        <Link to="/family-tree" className="text-blue-600 hover:underline">Family Tree</Link>
      </div>
      <h1 className="text-3xl font-bold mb-12 text-center">👥 Stories by People</h1>
      
      {/* Add Person Form */}
      <div className="max-w-md mx-auto mb-8">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? 'Cancel' : '+ Add New Person'}
        </button>
        
        {showAddForm && (
          <form onSubmit={handleAddPerson} className="mt-4 bg-white p-4 rounded-lg shadow">
            <input
              type="text"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="Enter person's name"
              className="w-full border rounded p-2 mb-3"
              required
            />
            <button
              type="submit"
              className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            >
              Add Person
            </button>
          </form>
        )}
      </div>
      
      {Object.keys(peopleMap).length === 0 ? (
        <div className="text-center text-gray-600">
          <p>No stories found. Add some stories with people to see them categorized here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(peopleMap).map(([person, personStories]) => (
            <PersonCard
              key={person}
              person={person}
              stories={personStories}
            />
          ))}
        </div>
      )}
    </div>
  );
}
