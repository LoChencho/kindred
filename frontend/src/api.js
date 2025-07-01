import axios from 'axios';

const API_URL = 'http://localhost:8000'; // FastAPI default

export const fetchStories = async () => {
  const response = await axios.get(`${API_URL}/stories`);
  return response.data;
};

export const postStory = async (story) => {
  const response = await axios.post(`${API_URL}/stories`, story);
  return response.data;
};

export const postPerson = async (person) => {
  const response = await axios.post(`${API_URL}/people`, person);
  return response.data;
};

export const fetchPeople = async () => {
  const response = await axios.get(`${API_URL}/people`);
  return response.data;
};

export const getPerson = async (personName) => {
  const response = await axios.get(`${API_URL}/people/${encodeURIComponent(personName)}`);
  return response.data;
};

export const updatePersonPicture = async (personName, pictureUrl) => {
  const response = await axios.patch(`${API_URL}/people/${encodeURIComponent(personName)}/picture`, { picture: pictureUrl });
  return response.data;
};

export const uploadPersonPicture = async (personName, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${API_URL}/people/${encodeURIComponent(personName)}/upload-picture`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteStory = async (index) => {
  const response = await axios.delete(`${API_URL}/stories/${index}`);
  return response.data;
};

export const patchStoryTitle = async (index, newTitle) => {
  const response = await axios.patch(`${API_URL}/stories/${index}/title?title=${encodeURIComponent(newTitle)}`);
  return response.data;
};

export const patchStoryDate = async (index, newDate) => {
  const response = await axios.patch(`${API_URL}/stories/${index}/date`, { date: newDate });
  return response.data;
};

export const patchStoryPeople = async (index, newPeople) => {
  const response = await axios.patch(`${API_URL}/stories/${index}/people`, { people: newPeople });
  return response.data;
};

export const patchStoryLocation = async (index, newLocation) => {
  const response = await axios.patch(`${API_URL}/stories/${index}/location`, { location: newLocation });
  return response.data;
};

// Family Tree API functions
export const getFamilyTree = async () => {
  const response = await axios.get(`${API_URL}/family-tree`);
  return response.data;
};

export const addRelationship = async (parentName, childName, relationshipType = "parent-child") => {
  const response = await axios.post(`${API_URL}/relationships`, {
    parent_name: parentName,
    child_name: childName,
    relationship_type: relationshipType
  });
  return response.data;
};

export const getRelationships = async () => {
  const response = await axios.get(`${API_URL}/relationships`);
  return response.data;
};

export const updatePersonBirthDate = async (personName, birthDate) => {
  const response = await axios.patch(`${API_URL}/people/${encodeURIComponent(personName)}/birth-date`, { birth_date: birthDate });
  return response.data;
};

export const updatePersonDeathDate = async (personName, deathDate) => {
  const response = await axios.patch(`${API_URL}/people/${encodeURIComponent(personName)}/death-date`, { death_date: deathDate });
  return response.data;
};

export const updatePersonGender = async (personName, gender) => {
  const response = await axios.patch(`${API_URL}/people/${encodeURIComponent(personName)}/gender`, { gender: gender });
  return response.data;
};

export const addFriendship = async (person1, person2) => {
  const response = await axios.post(`${API_URL}/friendships`, {
    person1,
    person2
  });
  return response.data;
};

export const deleteFriendship = async (person1, person2) => {
  const response = await axios.delete(`${API_URL}/friendships`, {
    params: { person1, person2 }
  });
  return response.data;
};

export const getFriendships = async () => {
  const response = await axios.get(`${API_URL}/friendships`);
  return response.data;
};

export const deleteRelationship = async (person1, person2) => {
  const response = await axios.delete(`${API_URL}/relationships`, {
    params: { person1, person2 }
  });
  return response.data;
};

export const uploadStoryPhotos = async (storyIndex, files) => {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  const response = await axios.post(`${API_URL}/stories/${storyIndex}/upload-photos`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

