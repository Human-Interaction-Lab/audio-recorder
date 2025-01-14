import React, { useState } from 'react';
import DemographicForm from './demographics';
import AudioRecorder from './AudioRecorder';

const AppContainer = () => {
  const [showRecorder, setShowRecorder] = useState(false);
  const [userId, setUserId] = useState('');
  const [directoryHandle, setDirectoryHandle] = useState(null);

  const handleUserIdChange = (newUserId) => {
    setUserId(newUserId);
  };

  const handleDirectorySelect = (handle) => {
    setDirectoryHandle(handle);
  };

  const handleDemographicsComplete = () => {
    setShowRecorder(true);
  };

  return (
    <div>
      {!showRecorder ? (
        <DemographicForm
          onComplete={handleDemographicsComplete}
          directoryHandle={directoryHandle}
          userId={userId}
        />
      ) : (
        <AudioRecorder
          userId={userId}
          onUserIdChange={handleUserIdChange}
          directoryHandle={directoryHandle}
          onDirectorySelect={handleDirectorySelect}
        />
      )}
    </div>
  );
};

export default AppContainer;