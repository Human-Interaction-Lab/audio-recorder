import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Folder } from 'lucide-react';

const DemographicForm = ({ onComplete, directoryHandle: initialDirectoryHandle }) => {
  const directoryHandleRef = useRef(initialDirectoryHandle);
  const [showFullForm, setShowFullForm] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [directoryName, setDirectoryName] = useState(initialDirectoryHandle?.name || '');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState(null);

  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    dateOfBirth: '',
    ethnicity: '',
    race: '',
    raceOther: '',
    sexAtBirth: '',
    parkinsonsDisease: '',
    diagnosisYear: '',
    medication: '',
    medicationToday: '',
    dbs: '',
    speechTherapy: ''
  });

  // Check browser compatibility on mount
  useEffect(() => {
    const isFileSystemSupported = 'showDirectoryPicker' in window;
    setBrowserSupported(isFileSystemSupported);
  }, []);

  const handleUserIdChange = (e) => {
    setUserId(e.target.value);
  };


  const checkExistingDemographics = async () => {
    try {
      const fileName = `${userId}_demographics.csv`;
      const fileHandle = await directoryHandleRef.current.getFileHandle(fileName);
      // If we get here, the file exists
      onComplete(userId, directoryHandleRef.current);
      return true;
    } catch (err) {
      // File doesn't exist, show the full form
      setShowFullForm(true);
      return false;
    }
  };

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!userId.trim()) {
      setError('Please enter a user ID');
      return;
    }

    if (!directoryHandleRef.current) {
      setError('Please select a directory');
      return;
    }

    await checkExistingDemographics();
  };

  // Select directory for saving recordings
  const selectDirectory = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      directoryHandleRef.current = dirHandle;
      setDirectoryName(dirHandle.name);
      console.log('Selected directory:', dirHandle.name);
    } catch (err) {
      console.error('Error selecting directory:', err);
      setError('Failed to select directory');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Reset diagnosis year if Parkinson's answer changes to 'No'
    if (name === 'parkinsonsDisease' && value === 'No') {
      setFormData(prev => ({
        ...prev,
        diagnosisYear: ''
      }));
    }
  };

  const saveToCSV = async () => {
    if (!directoryHandleRef.current) {
      setError('Please select a directory first');
      return false;
    }

    if (!userId) {
      setError('Please enter a user ID first');
      return false;
    }

    try {
      // Create CSV content
      const csvContent = [
        'User ID,Date of Birth,Ethnicity,Race,Race Other,Sex at Birth,Parkinsons Disease,' +
        'Diagnosis Year,Medication,Medication Today,Deep Brain Stimulation,Speech Therapy',
        `${userId},${formData.dateOfBirth},${formData.ethnicity},${formData.race},` +
        `${formData.raceOther},${formData.sexAtBirth},${formData.parkinsonsDisease},` +
        `${formData.diagnosisYear},${formData.medication},${formData.medicationToday},` +
        `${formData.dbs},${formData.speechTherapy}`
      ].join('\n');

      const fileName = `${userId}_demographics.csv`;
      const fileHandle = await directoryHandleRef.current.getFileHandle(fileName, { create: true });
      const writableStream = await fileHandle.createWritable();
      await writableStream.write(new Blob([csvContent], { type: 'text/csv' }));
      await writableStream.close();

      return true;
    } catch (err) {
      console.error('Error saving CSV:', err);
      setError('Failed to save demographic information');
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await saveToCSV();
    if (success) {
      onComplete(userId, directoryHandleRef.current);
    }
  };

  const diagnosisYearOptions = [
    { value: currentYear, label: currentYear },
    { value: currentYear - 1, label: currentYear - 1 },
    { value: currentYear - 2, label: currentYear - 2 },
    { value: currentYear - 3, label: currentYear - 3 },
    { value: currentYear - 4, label: currentYear - 4 },
    { value: currentYear - 5, label: currentYear - 5 },
    { value: currentYear - 6, label: currentYear - 6 },
    { value: currentYear - 7, label: currentYear - 7 },
    { value: currentYear - 8, label: currentYear - 8 },
    { value: currentYear - 9, label: currentYear - 9 },
    { value: currentYear - 10, label: currentYear - 10 },
    { value: currentYear - 11, label: currentYear - 11 },
    { value: currentYear - 12, label: currentYear - 12 },
    { value: currentYear - 13, label: currentYear - 13 },
    { value: currentYear - 14, label: currentYear - 14 },
    { value: currentYear - 15, label: currentYear - 15 },
    { value: currentYear - 16, label: currentYear - 16 },
    { value: currentYear - 17, label: currentYear - 17 },
    { value: currentYear - 18, label: currentYear - 18 },
    { value: currentYear - 19, label: currentYear - 19 },
    { value: currentYear - 20, label: currentYear - 20 },
    { value: currentYear - 21, label: currentYear - 21 },
    { value: currentYear - 22, label: currentYear - 22 },
    { value: currentYear - 23, label: currentYear - 23 },
    { value: currentYear - 24, label: currentYear - 24 },
    { value: currentYear - 25, label: currentYear - 25 },
    { value: 'Before 2000', label: 'Before 2000' }
  ];


  if (!showFullForm) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold mb-6">Speaker Information</h1>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <p className="font-bold">Error</p>
            </div>
            <p>{error}</p>
          </div>
        )}

        {!browserSupported && (
          <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4 rounded">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <p className="font-bold">Browser Compatibility Issue</p>
            </div>
            <p>
              Your browser doesn't support all required features. Please use Chrome, Edge, or Opera for full functionality.
            </p>
          </div>
        )}

        <form onSubmit={handleInitialSubmit} className="space-y-6">
          {/* User ID Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">User ID:</label>
            <input
              type="text"
              value={userId}
              onChange={handleUserIdChange}
              className="w-full p-2 border rounded"
              placeholder="Enter user ID"
            />
          </div>

          {/* Directory Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium">Save Location:</label>
                <p className="text-sm text-gray-500">
                  {directoryName ? `Selected: ${directoryName}` : 'No directory selected'}
                </p>
              </div>
              <button
                onClick={selectDirectory}
                type="button"
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 flex items-center"
              >
                <Folder className="h-4 w-4 mr-2" />
                Select Folder
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Continue
          </button>
        </form>
      </div>
    );
  }


  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Speaker Information</h1>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p className="font-bold">Error</p>
          </div>
          <p>{error}</p>
        </div>
      )}

      {!browserSupported && (
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4 rounded">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p className="font-bold">Browser Compatibility Issue</p>
          </div>
          <p>
            Your browser doesn't support all required features. Please use Chrome, Edge, or Opera for full functionality.
          </p>
        </div>
      )}

      {/* User ID Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">User ID:</label>
        <input
          type="text"
          value={userId}
          onChange={handleUserIdChange}
          className="w-full p-2 border rounded"
          placeholder="Enter user ID"
        />
      </div>

      {/* Directory Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium">Save Location:</label>
            <p className="text-sm text-gray-500">
              {directoryName ? `Selected: ${directoryName}` : 'No directory selected'}
            </p>
          </div>
          <button
            onClick={selectDirectory}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 flex items-center"
            type="button"
          >
            <Folder className="h-4 w-4 mr-2" />
            Select Folder
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date of Birth */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Date of Birth:</label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
            required
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Ethnicity */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Ethnicity:</label>
          <select
            name="ethnicity"
            value={formData.ethnicity}
            onChange={handleInputChange}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">Select ethnicity</option>
            <option value="Hispanic or Latino">Hispanic or Latino</option>
            <option value="NOT Hispanic or Latino">NOT Hispanic or Latino</option>
            <option value="Unknown/prefer not to say">Unknown/prefer not to say</option>
          </select>
        </div>

        {/* Race */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Race:</label>
          <select
            name="race"
            value={formData.race}
            onChange={handleInputChange}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">Select race</option>
            <option value="Native American/Alaska Native">Native American/Alaska Native</option>
            <option value="Asian">Asian</option>
            <option value="Native Hawaiian or other Pacific Islander">
              Native Hawaiian or other Pacific Islander
            </option>
            <option value="Black or African American">Black or African American</option>
            <option value="White">White</option>
            <option value="More than one race">More than one race</option>
            <option value="Other/prefer not to say">Other/prefer not to say</option>
          </select>
        </div>

        {/* Race Other/Multiple (conditional) */}
        {(formData.race === 'More than one race' || formData.race === 'Other/prefer not to say') && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Please specify:</label>
            <input
              type="text"
              name="raceOther"
              value={formData.raceOther}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        )}

        {/* Sex at Birth */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Sex assigned at birth:</label>
          <select
            name="sexAtBirth"
            value={formData.sexAtBirth}
            onChange={handleInputChange}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">Select sex assigned at birth</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>

        {/* Parkinson's Disease */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Have you been diagnosed with Parkinson's disease by a neurologist?
          </label>
          <select
            name="parkinsonsDisease"
            value={formData.parkinsonsDisease}
            onChange={handleInputChange}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">Select answer</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>

        {/* Diagnosis Year (conditional) */}
        {formData.parkinsonsDisease === 'Yes' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">When were you diagnosed?</label>
            <select
              name="diagnosisYear"
              value={formData.diagnosisYear}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Select year (if unsure, give an estimate)</option>
              {diagnosisYearOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Medication */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Are you on medication for Parkinson's Disease?
          </label>
          <select
            name="medication"
            value={formData.medication}
            onChange={handleInputChange}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">Select answer</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>

        {/* Medication(conditional) */}
        {formData.medication === 'Yes' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Have you taken the medication today?</label>
            <select
              name="medicationToday"
              value={formData.medicationToday}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Select answer</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        )}

        {/* Deep Brain Stimulation */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Have you had deep brain stimulation to treat Parkinson's disease?
          </label>
          <select
            name="dbs"
            value={formData.dbs}
            onChange={handleInputChange}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">Select answer</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>

        {/* Speech Therapy */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Have you ever completed speech therapy?
          </label>
          <select
            name="speechTherapy"
            value={formData.speechTherapy}
            onChange={handleInputChange}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">Select answer</option>
            <option value="Yes, currently">Yes, currently</option>
            <option value="Yes, previously but no longer attend">
              Yes, previously but no longer attend
            </option>
            <option value="No">No</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Save Responses
        </button>
      </form>
    </div>
  );
};

export default DemographicForm;