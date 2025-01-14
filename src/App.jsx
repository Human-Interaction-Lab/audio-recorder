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

  // Return to demographics form
  const handleReturnToDemographics = () => {
    setShowRecorder(false);
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
            <div className="mb-4 flex justify-end">
              <button
                onClick={handleReturnToDemographics}
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Return to Speaker Information
              </button>
            </div>
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