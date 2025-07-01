import { useState, useEffect } from 'react';
import { getPerson } from './api';

function PersonAvatar({ personName, size = "small" }) {
  const [personData, setPersonData] = useState(null);

  useEffect(() => {
    if (personName) {
      getPerson(personName).then(setPersonData).catch(() => {
        setPersonData({ name: personName, picture: null });
      });
    }
  }, [personName]);

  const sizeClasses = {
    small: "w-6 h-6",
    medium: "w-8 h-8", 
    large: "w-12 h-12"
  };

  const textSizes = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-lg"
  };

  if (!personData) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center`}>
        <span className={`${textSizes[size]} text-gray-500`}>👤</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center">
      {personData.picture ? (
        <img 
          src={`http://localhost:8000${personData.picture}`}
          alt={personName}
          className={`${sizeClasses[size]} rounded-full object-cover border border-gray-200`}
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center border border-gray-300`}>
          <span className={`${textSizes[size]} text-gray-500`}>👤</span>
        </div>
      )}
    </div>
  );
}

export default PersonAvatar; 