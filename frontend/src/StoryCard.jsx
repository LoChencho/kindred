import { useState, useEffect } from 'react';
import { patchStoryTitle, uploadStoryPhotos, getPerson, fetchLocations, patchStoryLocation } from './api';
import PersonAvatar from './PersonAvatar';

const API_URL = 'http://localhost:8000'; // adjust if needed

function StoryCard({ story, onTitleUpdate, handleDelete, onDateUpdate, onPeopleUpdate, onLocationUpdate }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(story.title);
    const [isExpanded, setIsExpanded] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [showPeopleInput, setShowPeopleInput] = useState(false);
    const [peopleInputValue, setPeopleInputValue] = useState(() => {
        if (!story.people || !Array.isArray(story.people)) return '';
        return story.people.join(', ');
    });
    const [showLocationInput, setShowLocationInput] = useState(false);
    const [locationInputValue, setLocationInputValue] = useState(story.location_name || '');
    const [locationOptions, setLocationOptions] = useState([]);
    const [locationIdValue, setLocationIdValue] = useState(story.location_id || null);
    const [showDateInput, setShowDateInput] = useState(false);
    const [dateInputValue, setDateInputValue] = useState(() => {
        if (!story.date) return '';
        // Handle different date formats
        if (story.date instanceof Date) {
            return story.date.toISOString().split('T')[0];
        }
        if (typeof story.date === 'string') {
            return story.date.split('T')[0];
        }
        return '';
    });
    const [showPhotoInput, setShowPhotoInput] = useState(false);
    const [photoFiles, setPhotoFiles] = useState([]);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState('');

    useEffect(() => {
        const handleClickOutside = () => setMenuVisible(false);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
      }, []);

    useEffect(() => {
        // Fetch names for all person IDs in this story
        if (story.people && Array.isArray(story.people)) {
          Promise.all(
            story.people.map(pid =>
              getPerson(pid).then(p => [pid, p.name]).catch(() => [pid, "Unknown"])
            )
          ).then(entries => {
            const peopleNames = Object.fromEntries(entries);
            // Update story.people_names if it's not already set
            if (!story.people_names) {
              story.people_names = story.people.map(pid => peopleNames[pid] || pid);
            }
          });
        }
      }, [story.people]);

    useEffect(() => {
        fetchLocations().then(setLocationOptions);
    }, []);

    const handleSave = async () => {
        console.log("Saving new title:", editedTitle);

        try {
            await patchStoryTitle(story.id, editedTitle);
            onTitleUpdate(story.id, editedTitle); // update local state in App
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update title:", error);
        }
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const handleMenuClick = (e) => {
        e.stopPropagation();
        setMenuPosition({ x: e.clientX, y: e.clientY });
        setMenuVisible(!menuVisible);
    };

    const handlePhotoUpload = async () => {
        if (!photoFiles || photoFiles.length === 0) return;
        setUploadingPhoto(true);
        setPhotoError('');
        try {
            const uploadRes = await uploadStoryPhotos(story.id, photoFiles);
            if (uploadRes && uploadRes.all_photos) {
                story.photos = uploadRes.all_photos;
                setShowPhotoInput(false);
                setPhotoFiles([]);
            } else {
                setPhotoError('Failed to upload photos.');
            }
        } catch (err) {
            setPhotoError('Failed to upload photos.');
        } finally {
            setUploadingPhoto(false);
        }
    };

    return (
        <li className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            {/* Show story photos as an album if present */}
            {story.photos && story.photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {story.photos.map((photoUrl, idx) => (
                        <img
                            key={`${story.id}-photo-${idx}`}
                            src={photoUrl.startsWith('http') ? photoUrl : `${API_URL}${photoUrl}`}
                            alt={`Story Photo ${idx + 1}`}
                            className="w-32 h-32 object-cover rounded"
                        />
                    ))}
                </div>
            )}
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="flex-1 p-2 border rounded"
                                onClick={(e) => e.stopPropagation()}
                            />
                            {/* Save button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // prevent expanding when saving
                                    handleSave();
                                }}
                                className="!bg-green-600 !text-white px-3 py-1 rounded hover:!bg-green-700"
                            >
                                Save
                            </button>

                        </div>
                    ) : (
                        <div className="mb-2 flex justify-between items-center">
                            <h3 className="text-xl font-semibold">{story.title}</h3>

                            {/* Edit button */}
                            {/* <button
                                onClick={(e) => {
                                    e.stopPropagation(); // prevent expanding when clicking edit
                                    setIsEditing(true);
                                }}
                                className="text-blue-700 text-sm underline"
                            >
                                Edit Title
                            </button> */}

                        </div>
                    )}

                    <p className="mt-2 text-gray-800">
                        {story.content}
                    </p>
                    {story.people_names && story.people_names.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 items-center">
                            <span className="text-sm text-gray-600">People:</span>
                            {story.people_names.map((name, idx) => (
                                <div key={`${story.id}-person-${idx}`} className="flex items-center gap-1">
                                    {/* Use people_ids[idx] for PersonAvatar, not name */}
                                    <PersonAvatar person={story.people_ids && story.people_ids[idx]} size="small" />
                                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                        {name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    {story.location_name && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="text-sm text-gray-600">Location:</span>
                            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                📍 {story.location_name}
                            </span>
                        </div>
                    )}
                    {menuVisible && (
                        <ul
                            className="fixed z-50 bg-white border rounded shadow-md text-sm w-32"
                            style={{ top: menuPosition.y, left: menuPosition.x }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <li
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                    setMenuVisible(false);
                                }}
                            >
                                Rename
                            </li>
                            <li
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPeopleInput(true);
                                    setMenuVisible(false);
                                }}
                            >
                                Edit People
                            </li>
                            <li
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDateInput(true);
                                    setMenuVisible(false);
                                }}
                            >
                                {story.date ? 'Edit Date' : 'Add Date'}
                            </li>
                            <li
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowLocationInput(true);
                                    setMenuVisible(false);
                                }}
                            >
                                Edit Location
                            </li>
                            <li
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPhotoInput(true);
                                    setMenuVisible(false);
                                }}
                            >
                                {story.photos && story.photos.length > 0 ? 'Add More Photos' : 'Add Photos'}
                            </li>
                            <li
                                className="px-4 py-2 hover:bg-red-100 text-red-600 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(story.id);
                                    setMenuVisible(false);
                                }}
                            >
                                Delete
                            </li>
                        </ul>
                    )}
                    {showDateInput && (
                        <div className="absolute z-50 bg-white border rounded shadow-md p-4 mt-2 flex items-center gap-2" style={{ left: menuPosition.x, top: menuPosition.y }} onClick={e => e.stopPropagation()}>
                            <input
                                type="date"
                                value={dateInputValue}
                                onChange={e => setDateInputValue(e.target.value)}
                                className="border rounded p-1"
                            />
                            <button
                                className="!bg-blue-600 text-white px-2 py-1 rounded hover:!bg-blue-700"
                                onClick={() => {
                                    onDateUpdate(story.id, dateInputValue);
                                    setShowDateInput(false);
                                }}
                            >
                                Save
                            </button>
                            <button
                                className="ml-2 text-gray-500 hover:!text-gray-700"
                                onClick={() => setShowDateInput(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                    {showPeopleInput && (
                        <div className="absolute z-50 bg-white border rounded shadow-md p-4 mt-2 flex items-center gap-2" style={{ left: menuPosition.x, top: menuPosition.y }} onClick={e => e.stopPropagation()}>
                            <input
                                type="text"
                                value={peopleInputValue}
                                onChange={e => setPeopleInputValue(e.target.value)}
                                className="border rounded p-1"
                            />
                            <button
                                className="!bg-blue-600 text-white px-2 py-1 rounded hover:!bg-blue-700"
                                onClick={() => {
                                    const peopleArray = peopleInputValue.trim() 
                                        ? peopleInputValue.split(',').map(p => p.trim()).filter(p => p.length > 0)
                                        : [];
                                    onPeopleUpdate(story.id, peopleArray);
                                    setShowPeopleInput(false);
                                }}
                            >
                                Save
                            </button>
                            <button
                                className="ml-2 text-gray-500 hover:!text-gray-700"
                                onClick={() => setShowPeopleInput(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                    {showLocationInput && (
                        <div className="absolute z-50 bg-white border rounded shadow-md p-4 mt-2 flex items-center gap-2" style={{ left: menuPosition.x, top: menuPosition.y }} onClick={e => e.stopPropagation()}>
                            <select
                                value={locationIdValue || ''}
                                onChange={e => {
                                    const selectedId = e.target.value ? parseInt(e.target.value) : null;
                                    setLocationIdValue(selectedId);
                                    const selected = locationOptions.find(l => l.id === selectedId);
                                    setLocationInputValue(selected ? selected.name : '');
                                }}
                                className="border rounded p-1"
                            >
                                <option value="">-- Select Location --</option>
                                {locationOptions.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                value={locationInputValue}
                                onChange={e => {
                                    setLocationInputValue(e.target.value);
                                    setLocationIdValue(null); // Custom name, not from list
                                }}
                                className="border rounded p-1"
                                placeholder="Or enter new location"
                            />
                            <button
                                className="!bg-blue-600 text-white px-2 py-1 rounded hover:!bg-blue-700"
                                onClick={async () => {
                                    await patchStoryLocation(story.id, {
                                        location_id: locationIdValue,
                                        location_name: locationIdValue ? undefined : locationInputValue
                                    });
                                    onLocationUpdate && onLocationUpdate(story.id, locationInputValue);
                                    setShowLocationInput(false);
                                }}
                            >
                                Save
                            </button>
                            <button
                                className="ml-2 text-gray-500 hover:!text-gray-700"
                                onClick={() => setShowLocationInput(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                    {showPhotoInput && (
                        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50" onClick={() => setShowPhotoInput(false)}>
                            <div className="bg-white p-6 rounded shadow-lg text-center" onClick={e => e.stopPropagation()}>
                                <h2 className="text-lg font-semibold mb-4">{story.photos && story.photos.length > 0 ? 'Add More Photos' : 'Add Story Photos'}</h2>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={e => setPhotoFiles(Array.from(e.target.files))}
                                    className="mb-4"
                                />
                                {photoError && <div className="text-red-600 mb-2">{photoError}</div>}
                                <div className="flex justify-center gap-4">
                                    <button
                                        className="!bg-blue-600 text-white px-4 py-2 rounded hover:!bg-blue-700"
                                        onClick={handlePhotoUpload}
                                        disabled={uploadingPhoto || !photoFiles || photoFiles.length === 0}
                                    >
                                        {uploadingPhoto ? 'Uploading...' : 'Upload'}
                                    </button>
                                    <button
                                        className="!bg-gray-300 px-4 py-2 rounded hover:!bg-gray-400"
                                        onClick={() => setShowPhotoInput(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 ml-4">
                    <button
                        onClick={handleMenuClick}
                        className="text-gray-400 hover:text-gray-600 p-1"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                    </button>
                </div>
            </div>
        </li>

    );
}

export default StoryCard;