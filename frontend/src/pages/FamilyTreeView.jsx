import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchFamilyTree, addRelationship, updatePersonGender, updatePersonBirthDate, updatePersonDeathDate, addPerson, addFriendship, fetchRelationships, fetchFriendships, deleteRelationship, deleteFriendship } from '../api';
import PersonAvatar from '../PersonAvatar';
import { useAuth } from '../contexts/AuthContext';

export default function FamilyTreeView() {
  const [familyData, setFamilyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddRelationship, setShowAddRelationship] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddFriendship, setShowAddFriendship] = useState(false);
  const [newRelationship, setNewRelationship] = useState({ parent: '', child: '' });
  const [newPerson, setNewPerson] = useState({ name: '', gender: '', birthDate: '' });
  const [newFriendship, setNewFriendship] = useState({ person1: '', person2: '' });
  const [editingPerson, setEditingPerson] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [relationships, setRelationships] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadFamilyTree();
      loadRelationships();
      loadFriendships();
    }
  }, [user]);

  const loadFamilyTree = async () => {
    try {
      const data = await fetchFamilyTree();
      setFamilyData(data);
    } catch (error) {
      console.error('Failed to load family tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRelationships = async () => {
    try {
      const data = await fetchRelationships();
      setRelationships(data);
    } catch (error) {
      setRelationships([]);
    }
  };

  const loadFriendships = async () => {
    try {
      const data = await fetchFriendships();
      setFriendships(data);
    } catch (error) {
      setFriendships([]);
    }
  };

  const handleAddPerson = async (e) => {
    e.preventDefault();
    if (!newPerson.name.trim() || !user) return;

    try {
      await addPerson({
        name: newPerson.name.trim(),
        gender: newPerson.gender || null,
        birth_date: newPerson.birthDate || null
      });
      setNewPerson({ name: '', gender: '', birthDate: '' });
      setShowAddPerson(false);
      loadFamilyTree(); // Reload to show new person
    } catch (error) {
      console.error('Failed to add person:', error);
      alert('Failed to add person. Please try again.');
    }
  };

  const handleAddRelationship = async (e) => {
    e.preventDefault();
    if (!newRelationship.parent || !newRelationship.child || !user) return;

    try {
      await addRelationship({
        parent_name: newRelationship.parent,
        child_name: newRelationship.child,
        relationship_type: "parent-child"
      });
      setNewRelationship({ parent: '', child: '' });
      setShowAddRelationship(false);
      loadFamilyTree(); // Reload to show new relationship
    } catch (error) {
      console.error('Failed to add relationship:', error);
      alert('Failed to add relationship. Please check that both people exist.');
    }
  };

  const handleAddFriendship = async (e) => {
    e.preventDefault();
    if (!newFriendship.person1 || !newFriendship.person2 || newFriendship.person1 === newFriendship.person2 || !user) return;
    try {
      await addFriendship({
        person1: newFriendship.person1,
        person2: newFriendship.person2
      });
      setNewFriendship({ person1: '', person2: '' });
      setShowAddFriendship(false);
      loadFamilyTree();
    } catch (error) {
      console.error('Failed to add friendship:', error);
      alert('Failed to add friendship. Please try again.');
    }
  };

  const handleEditPerson = async (personName) => {
    try {
      if (editForm.gender !== undefined) {
        await updatePersonGender(personName, editForm.gender);
      }
      if (editForm.birthDate !== undefined) {
        await updatePersonBirthDate(personName, editForm.birthDate);
      }
      if (editForm.deathDate !== undefined) {
        await updatePersonDeathDate(personName, editForm.deathDate);
      }
      setEditingPerson(null);
      setEditForm({});
      loadFamilyTree();
    } catch (error) {
      console.error('Failed to update person:', error);
    }
  };

  const handleDeleteRelationship = async (parent, child) => {
    if (!window.confirm(`Delete relationship between ${parent} and ${child}?`)) return;
    try {
      await deleteRelationship(parent, child);
      loadRelationships();
      loadFamilyTree();
    } catch (error) {
      alert('Failed to delete relationship.');
    }
  };

  const handleDeleteFriendship = async (person1, person2) => {
    if (!window.confirm(`Delete friendship between ${person1} and ${person2}?`)) return;
    try {
      await deleteFriendship(person1, person2);
      loadFriendships();
      loadFamilyTree();
    } catch (error) {
      alert('Failed to delete friendship.');
    }
  };

  const getRootNodes = () => {
    // Find people who have no parents (root of the tree)
    return familyData.filter(person => person.parents.length === 0);
  };

  const getChildren = (personName) => {
    return familyData.filter(person => 
      person.parents.some(parent => parent === personName)
    );
  };

  const renderPersonNode = (person, level = 0) => {
    const children = getChildren(person.name);
    const isEditing = editingPerson === person.name;

    return (
      <div key={person.name} className="flex flex-col items-center">
        <div className={`relative ${level > 0 ? 'mt-8' : ''}`}>
          {/* Connection line from parent */}
          {level > 0 && (
            <div className="absolute -top-4 left-1/2 w-px h-4 bg-gray-300 transform -translate-x-1/2"></div>
          )}
          
          {/* Person card */}
          <div className="bg-white border-2 border-blue-200 rounded-lg p-3 shadow-md min-w-[200px]">
            <div className="flex items-center space-x-2 mb-2">
              <PersonAvatar personName={person.name} size="medium" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{person.name}</h3>
                {person.birth_date && (
                  <p className="text-xs text-gray-600">
                    {person.birth_date}
                    {person.death_date && ` - ${person.death_date}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => setEditingPerson(person.name)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                ✏️
              </button>
            </div>
            
            {/* Gender indicator */}
            {person.gender && (
              <div className="text-xs text-gray-500 mb-1">
                {person.gender === 'M' ? '👨' : person.gender === 'F' ? '👩' : '👤'}
              </div>
            )}
          </div>

          {/* Edit form */}
          {isEditing && (
            <div className="absolute top-full left-0 mt-2 bg-white border rounded-lg p-3 shadow-lg z-10 min-w-[250px]">
              <h4 className="font-semibold mb-2">Edit {person.name}</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-600">Gender:</label>
                  <select
                    value={editForm.gender || person.gender || ''}
                    onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                    className="w-full border rounded p-1 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Birth Date:</label>
                  <input
                    type="date"
                    value={editForm.birthDate || person.birth_date || ''}
                    onChange={(e) => setEditForm({...editForm, birthDate: e.target.value})}
                    className="w-full border rounded p-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Death Date:</label>
                  <input
                    type="date"
                    value={editForm.deathDate || person.death_date || ''}
                    onChange={(e) => setEditForm({...editForm, deathDate: e.target.value})}
                    className="w-full border rounded p-1 text-sm"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditPerson(person.name)}
                    className="bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingPerson(null);
                      setEditForm({});
                    }}
                    className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-sm hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Children */}
        {children.length > 0 && (
          <div className="mt-4">
            {/* Connection lines to children */}
            <div className="flex justify-center mb-4">
              <div className="w-px h-4 bg-gray-300"></div>
            </div>
            <div className="flex space-x-8">
              {children.map(child => renderPersonNode(child, level + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="p-4 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">Family Tree</h1>
        <p className="text-gray-600">Please log in to view and manage your family tree.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading family tree...</div>
      </div>
    );
  }

  const rootNodes = getRootNodes();

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:underline">&larr; Back to List</Link>
        <span className="mx-2 text-gray-400">|</span>
        <Link to="/timeline" className="text-blue-600 hover:underline">View Timeline</Link>
        <span className="mx-2 text-gray-400">|</span>
        <Link to="/people" className="text-blue-600 hover:underline">View by People</Link>
        <span className="mx-2 text-gray-400">|</span>
        <Link to="/location" className="text-blue-600 hover:underline">View by Location</Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-8 text-center">🌳 Family Tree</h1>

      {/* Action Buttons */}
      <div className="max-w-2xl mx-auto mb-8 flex gap-4">
        <button
          onClick={() => setShowAddPerson(!showAddPerson)}
          className="flex-1 !bg-blue-600 text-white px-4 py-2 rounded-lg hover:!bg-blue-700 transition-colors"
        >
          {showAddPerson ? 'Cancel' : '+ Add New Person'}
        </button>
        
        <button
          onClick={() => setShowAddRelationship(!showAddRelationship)}
          className="flex-1 !bg-green-600 text-white px-4 py-2 rounded-lg hover:!bg-green-700 transition-colors"
        >
          {showAddRelationship ? 'Cancel' : '+ Add Family Relationship'}
        </button>
        <button
          onClick={() => setShowAddFriendship(!showAddFriendship)}
          className="flex-1 !bg-yellow-600 text-white px-4 py-2 rounded-lg hover:!bg-yellow-700 transition-colors"
        >
          {showAddFriendship ? 'Cancel' : '+ Add Friendship'}
        </button>
      </div>
      
      {/* Add Person Form */}
      {showAddPerson && (
        <div className="max-w-md mx-auto mb-8">
          <form onSubmit={handleAddPerson} className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">Add New Person</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name:</label>
                <input
                  type="text"
                  value={newPerson.name}
                  onChange={(e) => setNewPerson({...newPerson, name: e.target.value})}
                  className="w-full border rounded p-2"
                  placeholder="Enter person's name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender:</label>
                <select
                  value={newPerson.gender}
                  onChange={(e) => setNewPerson({...newPerson, gender: e.target.value})}
                  className="w-full border rounded p-2"
                >
                  <option value="">Select gender...</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date:</label>
                <input
                  type="date"
                  value={newPerson.birthDate}
                  onChange={(e) => setNewPerson({...newPerson, birthDate: e.target.value})}
                  className="w-full border rounded p-2"
                />
              </div>
              <button
                type="submit"
                className="w-full !bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Add Person
              </button>
            </div>
          </form>
        </div>
      )}
        
      {/* Add Relationship Form */}
      {showAddRelationship && (
        <div className="max-w-md mx-auto mb-8">
          <form onSubmit={handleAddRelationship} className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">Add Family Relationship</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent:</label>
                <select
                  value={newRelationship.parent}
                  onChange={(e) => setNewRelationship({...newRelationship, parent: e.target.value})}
                  className="w-full border rounded p-2"
                  required
                >
                  <option value="">Select parent...</option>
                  {familyData.map(person => (
                    <option key={person.name} value={person.name}>{person.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Child:</label>
                <select
                  value={newRelationship.child}
                  onChange={(e) => setNewRelationship({...newRelationship, child: e.target.value})}
                  className="w-full border rounded p-2"
                  required
                >
                  <option value="">Select child...</option>
                  {familyData.map(person => (
                    <option key={person.name} value={person.name}>{person.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full !bg-green-600 text-white px-4 py-2 rounded hover:!bg-green-700 transition-colors"
              >
                Add Relationship
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Friendship Form */}
      {showAddFriendship && (
        <div className="max-w-md mx-auto mb-8">
          <form onSubmit={handleAddFriendship} className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">Add Friendship</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Person 1:</label>
                <select
                  value={newFriendship.person1}
                  onChange={(e) => setNewFriendship({...newFriendship, person1: e.target.value})}
                  className="w-full border rounded p-2"
                  required
                >
                  <option value="">Select person...</option>
                  {familyData.map(person => (
                    <option key={person.name} value={person.name}>{person.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Person 2:</label>
                <select
                  value={newFriendship.person2}
                  onChange={(e) => setNewFriendship({...newFriendship, person2: e.target.value})}
                  className="w-full border rounded p-2"
                  required
                >
                  <option value="">Select person...</option>
                  {familyData.map(person => (
                    <option key={person.name} value={person.name}>{person.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full !bg-yellow-600 text-white px-4 py-2 rounded hover:!bg-yellow-700 transition-colors"
              >
                Add Friendship
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Relationships List */}
      <div className="max-w-2xl mx-auto mb-8">
        <h2 className="font-semibold mb-2 text-lg">Family Relationships</h2>
        {relationships.length === 0 ? (
          <div className="text-gray-500">No relationships found.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {relationships.map((rel, idx) => (
              <li key={idx} className="flex items-center justify-between py-2">
                <span>{rel.parent_name} ➔ {rel.child_name} <span className="text-xs text-gray-400">({rel.relationship_type})</span></span>
                <button
                  onClick={() => handleDeleteRelationship(rel.parent_name, rel.child_name)}
                  className="text-red-600 hover:underline text-sm ml-2"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Friendships List */}
      <div className="max-w-2xl mx-auto mb-8">
        <h2 className="font-semibold mb-2 text-lg">Friendships</h2>
        {friendships.length === 0 ? (
          <div className="text-gray-500">No friendships found.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {friendships.map((f, idx) => (
              <li key={idx} className="flex items-center justify-between py-2">
                <span>{f.person1} 🤝 {f.person2}</span>
                <button
                  onClick={() => handleDeleteFriendship(f.person1, f.person2)}
                  className="text-red-600 hover:underline text-sm ml-2"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Family Tree Display */}
      <div className="overflow-x-auto">
        <div className="flex justify-center min-w-max">
          {rootNodes.length > 0 ? (
            <div className="flex space-x-8">
              {rootNodes.map(person => renderPersonNode(person))}
            </div>
          ) : (
            <div className="text-center text-gray-600 py-12">
              <p className="text-lg mb-4">No family relationships found.</p>
              <p>Add some people and relationships to see your family tree!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 