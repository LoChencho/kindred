import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchStories, fetchPeople, postPerson, addPerson, getPerson, updatePersonPicture, updatePersonBirthDate, updatePersonDeathDate, updatePersonGender, uploadPersonPicture } from '../api';
import { useAuth } from '../contexts/AuthContext';
import PersonCard from '../PersonCard';

export default function PersonView() {
  const [stories, setStories] = useState([]);
  const [peopleMap, setPeopleMap] = useState({});
  const [people, setPeople] = useState([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPerson, setNewPerson] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newDeathDate, setNewDeathDate] = useState('');
  const [newPicture, setNewPicture] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchStories().then(setStories);
      fetchPeople().then(setPeople);
    }
  }, [user]);

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
    if (!newPersonName.trim() || !user) return;

    try {
      const result = await addPerson({
        name: newPersonName.trim(),
        gender: newGender || null,
        birth_date: newBirthDate || null,
        death_date: newDeathDate || null,
        picture: null
      });

      if (newPicture) {
        try {
          const uploadRes = await uploadPersonPicture(result.name, newPicture);
          if (uploadRes && uploadRes.url) {
            result.picture = uploadRes.url;
          }
        } catch (err) {
          console.error('Picture upload failed:', err);
        }
      }

      setPeople([...people, result]);
      setNewPersonName('');
      setNewGender('');
      setNewBirthDate('');
      setNewDeathDate('');
      setNewPicture(null);
    } catch (error) {
      console.error('Error adding person:', error);
    }
  };

  if (!user) {
    return (
      <div className="p-4 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">People</h1>
        <p className="text-gray-600">Please log in to view and manage people.</p>
      </div>
    );
  }

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
            <div className="space-y-4">
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="Person's name"
                className="w-full border rounded p-2 mb-3"
                required
              />
              <select
                className="w-full border rounded p-2 mb-3"
                value={newGender}
                onChange={(e) => setNewGender(e.target.value)}
              >
                <option value="">Select gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
              <input
                type="date"
                value={newBirthDate}
                onChange={(e) => setNewBirthDate(e.target.value)}
                placeholder="Birth date"
                className="w-full border rounded p-2 mb-3"
              />
              <input
                type="date"
                value={newDeathDate}
                onChange={(e) => setNewDeathDate(e.target.value)}
                placeholder="Death date"
                className="w-full border rounded p-2 mb-3"
              />
              <input
                type="file"
                accept="image/*"
                className="w-full border rounded p-2 mb-3"
                onChange={(e) => setNewPicture(e.target.files[0])}
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
              >
                Add Person
              </button>
            </div>
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
