import axios from 'axios';
import { supabase } from './supabaseClient';

const API_URL = 'http://localhost:8000'; // FastAPI default

// Get the current user ID from Supabase
const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

export const fetchStories = async () => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.get(`${API_URL}/stories${userId ? `?user_id=${userId}` : ''}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching stories:', error);
    throw error;
  }
};

export const postStory = async (storyData) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.post(`${API_URL}/stories`, {
      ...storyData,
      user_id: userId
    });
    return response.data;
  } catch (error) {
    console.error('Error posting story:', error);
    throw error;
  }
};

export const postPerson = async (person) => {
  const response = await axios.post(`${API_URL}/people`, person);
  return response.data;
};

export const fetchPeople = async () => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.get(`${API_URL}/people${userId ? `?user_id=${userId}` : ''}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching people:', error);
    throw error;
  }
};

export const getPerson = async (personName) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.get(`${API_URL}/people/${personName}${userId ? `?user_id=${userId}` : ''}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching person:', error);
    throw error;
  }
};

export const updatePersonPicture = async (personName, picture) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.patch(`${API_URL}/people/${personName}/picture${userId ? `?user_id=${userId}` : ''}`, { picture });
    return response.data;
  } catch (error) {
    console.error('Error updating person picture:', error);
    throw error;
  }
};

export const uploadPersonPicture = async (personName, file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const userId = await getCurrentUserId();
    const response = await axios.post(`${API_URL}/people/${personName}/upload-picture${userId ? `?user_id=${userId}` : ''}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading person picture:', error);
    throw error;
  }
};

export const deleteStory = async (storyId) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.delete(`${API_URL}/stories/${storyId}${userId ? `?user_id=${userId}` : ''}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting story:', error);
    throw error;
  }
};

export const patchStoryTitle = async (storyId, title) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.patch(`${API_URL}/stories/${storyId}/title${userId ? `?user_id=${userId}` : ''}`, { title });
    return response.data;
  } catch (error) {
    console.error('Error updating story title:', error);
    throw error;
  }
};

export const patchStoryDate = async (storyId, date) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.patch(`${API_URL}/stories/${storyId}/date${userId ? `?user_id=${userId}` : ''}`, { date });
    return response.data;
  } catch (error) {
    console.error('Error updating story date:', error);
    throw error;
  }
};

export const patchStoryPeople = async (storyId, people) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.patch(`${API_URL}/stories/${storyId}/people${userId ? `?user_id=${userId}` : ''}`, { people });
    return response.data;
  } catch (error) {
    console.error('Error updating story people:', error);
    throw error;
  }
};

export const patchStoryLocation = async (storyId, location) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.patch(`${API_URL}/stories/${storyId}/location${userId ? `?user_id=${userId}` : ''}`, { location });
    return response.data;
  } catch (error) {
    console.error('Error updating story location:', error);
    throw error;
  }
};

export const uploadStoryPhotos = async (storyId, files) => {
  try {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await axios.post(`${API_URL}/stories/${storyId}/upload-photos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading photos:', error);
    throw error;
  }
};

export const addPerson = async (personData) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.post(`${API_URL}/people`, {
      ...personData,
      user_id: userId
    });
    return response.data;
  } catch (error) {
    console.error('Error adding person:', error);
    throw error;
  }
};

export const updatePersonBirthDate = async (personName, birthDate) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.patch(`${API_URL}/people/${personName}/birth-date${userId ? `?user_id=${userId}` : ''}`, { birth_date: birthDate });
    return response.data;
  } catch (error) {
    console.error('Error updating person birth date:', error);
    throw error;
  }
};

export const updatePersonDeathDate = async (personName, deathDate) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.patch(`${API_URL}/people/${personName}/death-date${userId ? `?user_id=${userId}` : ''}`, { death_date: deathDate });
    return response.data;
  } catch (error) {
    console.error('Error updating person death date:', error);
    throw error;
  }
};

export const updatePersonGender = async (personName, gender) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.patch(`${API_URL}/people/${personName}/gender${userId ? `?user_id=${userId}` : ''}`, { gender });
    return response.data;
  } catch (error) {
    console.error('Error updating person gender:', error);
    throw error;
  }
};

export const fetchRelationships = async () => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.get(`${API_URL}/relationships${userId ? `?user_id=${userId}` : ''}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching relationships:', error);
    throw error;
  }
};

export const addRelationship = async (relationshipData) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.post(`${API_URL}/relationships`, {
      ...relationshipData,
      user_id: userId
    });
    return response.data;
  } catch (error) {
    console.error('Error adding relationship:', error);
    throw error;
  }
};

export const deleteRelationship = async (person1, person2) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.delete(`${API_URL}/relationships?person1=${person1}&person2=${person2}${userId ? `&user_id=${userId}` : ''}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting relationship:', error);
    throw error;
  }
};

export const fetchFriendships = async () => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.get(`${API_URL}/friendships${userId ? `?user_id=${userId}` : ''}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching friendships:', error);
    throw error;
  }
};

export const addFriendship = async (friendshipData) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.post(`${API_URL}/friendships`, {
      ...friendshipData,
      user_id: userId
    });
    return response.data;
  } catch (error) {
    console.error('Error adding friendship:', error);
    throw error;
  }
};

export const deleteFriendship = async (person1, person2) => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.delete(`${API_URL}/friendships?person1=${person1}&person2=${person2}${userId ? `&user_id=${userId}` : ''}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting friendship:', error);
    throw error;
  }
};

export const fetchFamilyTree = async () => {
  try {
    const userId = await getCurrentUserId();
    const response = await axios.get(`${API_URL}/family-tree${userId ? `?user_id=${userId}` : ''}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching family tree:', error);
    throw error;
  }
};

