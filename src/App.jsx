import React, { useState } from 'react';
import DemographicForm from './components/DemographicForm';
import AudioRecorder from './components/AudioRecorder';

const AppContainer = () => {
  const [showRecorder, setShowRecorder] = useState(false);
  const [userId, setUserId] = useState('');
  const [directoryHandle, setDirectoryHandle] = useState(null);

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
          />
        ) : (
          <div>
            <AudioRecorder
              initialUserId={userId}
              initialDirectoryHandle={directoryHandle}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AppContainer;