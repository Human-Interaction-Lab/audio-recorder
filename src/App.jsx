import React, { useState, useEffect } from 'react';
import DemographicForm from './components/DemographicForm';
import AudioRecorder from './components/AudioRecorder';
import { checkDemographicsExist } from './components/demographicsUtils';

const AppContainer = () => {
  const [showRecorder, setShowRecorder] = useState(false);
  const [userId, setUserId] = useState('');
  const [directoryHandle, setDirectoryHandle] = useState(null);

  // Check for existing demographics on mount or when directory/userId changes
  useEffect(() => {
    const checkExistingDemographics = async () => {
      if (directoryHandle && userId) {
        try {
          const exists = await checkDemographicsExist(directoryHandle, userId);
          if (exists) {
            setShowRecorder(true);
          }
        } catch (err) {
          console.error('Error checking demographics:', err);
        }
      }
    };

    checkExistingDemographics();
  }, [directoryHandle, userId]);

  // Handle completion of demographics form
  const handleDemographicsComplete = (newUserId, newDirectoryHandle) => {
    setUserId(newUserId);
    setDirectoryHandle(newDirectoryHandle);
    setShowRecorder(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto pt-8">
        {!showRecorder ? (
          <DemographicForm
            onComplete={handleDemographicsComplete}
            directoryHandle={directoryHandle}
            initialUserId={userId}
          />
        ) : (
          <AudioRecorder
            initialUserId={userId}
            initialDirectoryHandle={directoryHandle}
          />
        )}
      </div>
    </div>
  );
};

export default AppContainer;