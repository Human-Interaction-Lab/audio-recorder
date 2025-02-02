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
    speechTherapy: '',
    hearingTested: '', // Options: 'screened', 'threshold', 'not_tested'
    hearingScreenResult: '', // Options: 'pass', 'fail', null
    hearingThresholds: {
      right: {
        hz250: '',
        hz500: '',
        hz1000: '',
        hz2000: '',
        hz4000: '',
        hz8000: ''
      },
      left: {
        hz250: '',
        hz500: '',
        hz1000: '',
        hz2000: '',
        hz4000: '',
        hz8000: ''
      }
    },
    cpib: {
      talkingKnownPeople: '',
      communicatingQuickly: '',
      talkingUnknownPeople: '',
      communicatingCommunity: '',
      askingQuestions: '',
      communicatingSmallGroup: '',
      longConversation: '',
      detailedInformation: '',
      fastMovingConversation: '',
      persuadingOthers: ''
    }
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

    // Check if this is a CPIB field
    if (name.startsWith('cpib.')) {
      const cpibField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        cpib: {
          ...prev.cpib,
          [cpibField]: value
        }
      }));
    } else {
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
    }
  };

  const handleThresholdChange = (ear, frequency, value) => {
    setFormData(prev => ({
      ...prev,
      hearingThresholds: {
        ...prev.hearingThresholds,
        [ear]: {
          ...prev.hearingThresholds[ear],
          [frequency]: value
        }
      }
    }));
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
        'Diagnosis Year,Medication,Medication Today,Deep Brain Stimulation,Speech Therapy,' +
        'Hearing Tested,Hearing Screen Result,' +
        'R250Hz,R500Hz,R1000Hz,R2000Hz,R4000Hz,R8000Hz,' +
        'L250Hz,L500Hz,L1000Hz,L2000Hz,L4000Hz,L8000Hz,' +
        'Talking with Known People,Communicating Quickly,Talking with Unknown People,' +
        'Communicating in Community,Asking Questions,Communicating in Small Group,' +
        'Long Conversation,Detailed Information,Fast Moving Conversation,Persuading Others',
        `${userId},${formData.dateOfBirth},${formData.ethnicity},${formData.race},` +
        `${formData.raceOther},${formData.sexAtBirth},${formData.parkinsonsDisease},` +
        `${formData.diagnosisYear},${formData.medication},${formData.medicationToday},` +
        `${formData.dbs},${formData.speechTherapy},` +
        `${formData.hearingTested},${formData.hearingScreenResult},` +
        `${formData.hearingThresholds.right.hz250},${formData.hearingThresholds.right.hz500},` +
        `${formData.hearingThresholds.right.hz1000},${formData.hearingThresholds.right.hz2000},` +
        `${formData.hearingThresholds.right.hz4000},${formData.hearingThresholds.right.hz8000},` +
        `${formData.hearingThresholds.left.hz250},${formData.hearingThresholds.left.hz500},` +
        `${formData.hearingThresholds.left.hz1000},${formData.hearingThresholds.left.hz2000},` +
        `${formData.hearingThresholds.left.hz4000},${formData.hearingThresholds.left.hz8000},` +
        `${formData.cpib.talkingKnownPeople},${formData.cpib.communicatingQuickly},` +
        `${formData.cpib.talkingUnknownPeople},${formData.cpib.communicatingCommunity},` +
        `${formData.cpib.askingQuestions},${formData.cpib.communicatingSmallGroup},` +
        `${formData.cpib.longConversation},${formData.cpib.detailedInformation},` +
        `${formData.cpib.fastMovingConversation},${formData.cpib.persuadingOthers}`
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

  const renderCPIBQuestion = (field, question) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{question}</label>
      <div className="grid grid-cols-4 gap-4">
        {[
          { value: '3', label: 'Not at all' },
          { value: '2', label: 'A little' },
          { value: '1', label: 'Quite a bit' },
          { value: '0', label: 'Very much' }
        ].map(option => (
          <label key={option.value} className="flex items-center space-x-2">
            <input
              type="radio"
              name={`cpib.${field}`}
              value={option.value}
              checked={formData.cpib[field] === option.value}
              onChange={handleInputChange}
              required
              className="form-radio"
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );


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



        {/* Hearing Section */}
        <div className="mt-8 space-y-6">
          <h2 className="text-xl font-bold">Hearing Assessment</h2>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Hearing Test Type:
            </label>
            <select
              name="hearingTested"
              value={formData.hearingTested}
              onChange={handleInputChange}
              required
              className="w-full p-2 border rounded"
            >
              <option value="">Select test type</option>
              <option value="screened">Hearing Screened</option>
              <option value="threshold">Full Threshold Testing</option>
              <option value="not_tested">Hearing Not Tested</option>
            </select>
          </div>

          {/* Conditional Screening Result */}
          {formData.hearingTested === 'screened' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Screening Result:
              </label>
              <select
                name="hearingScreenResult"
                value={formData.hearingScreenResult}
                onChange={handleInputChange}
                required
                className="w-full p-2 border rounded"
              >
                <option value="">Select result</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
              </select>
            </div>
          )}

          {/* Conditional Threshold Testing */}
          {formData.hearingTested === 'threshold' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter hearing thresholds in dB HL. Leave blank if not tested.
              </p>

              {/* Right Ear */}
              <div className="space-y-2">
                <h3 className="font-medium">Right Ear</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { freq: 'hz250', label: '250 Hz' },
                    { freq: 'hz500', label: '500 Hz' },
                    { freq: 'hz1000', label: '1000 Hz' },
                    { freq: 'hz2000', label: '2000 Hz' },
                    { freq: 'hz4000', label: '4000 Hz' },
                    { freq: 'hz8000', label: '8000 Hz' }
                  ].map(({ freq, label }) => (
                    <div key={freq} className="space-y-1">
                      <label className="text-sm">{label}</label>
                      <input
                        type="number"
                        min="-10"
                        max="120"
                        step="5"
                        value={formData.hearingThresholds.right[freq]}
                        onChange={(e) => handleThresholdChange('right', freq, e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="dB HL"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Left Ear */}
              <div className="space-y-2">
                <h3 className="font-medium">Left Ear</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { freq: 'hz250', label: '250 Hz' },
                    { freq: 'hz500', label: '500 Hz' },
                    { freq: 'hz1000', label: '1000 Hz' },
                    { freq: 'hz2000', label: '2000 Hz' },
                    { freq: 'hz4000', label: '4000 Hz' },
                    { freq: 'hz8000', label: '8000 Hz' }
                  ].map(({ freq, label }) => (
                    <div key={freq} className="space-y-1">
                      <label className="text-sm">{label}</label>
                      <input
                        type="number"
                        min="-10"
                        max="120"
                        step="5"
                        value={formData.hearingThresholds.left[freq]}
                        onChange={(e) => handleThresholdChange('left', freq, e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="dB HL"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>


        {/* CPIB Section */}
        <div className="mt-8 space-y-6">
          <h2 className="text-xl font-bold">Communication Assessment</h2>
          <p className="text-sm text-gray-600">
            The following questions describe situations where you might need to speak to others.
            For each question, please indicate how much your condition interferes with your
            participation in that situation. By "condition" we mean ALL issues that may affect
            how you communicate, including speech conditions, other health conditions, or
            features of the environment. If your speech varies, think about an AVERAGE day
            for your speech - not your best or worst days.
          </p>

          <div className="space-y-6">
            {renderCPIBQuestion('talkingKnownPeople',
              'Does your condition interfere with talking with people you know?')}

            {renderCPIBQuestion('communicatingQuickly',
              'Does your condition interfere with communicating when you need to say something quickly?')}

            {renderCPIBQuestion('talkingUnknownPeople',
              'Does your condition interfere with talking with people you do NOT know?')}

            {renderCPIBQuestion('communicatingCommunity',
              'Does your condition interfere with communicating when you are out in your community (e.g. errands; appointments)?')}

            {renderCPIBQuestion('askingQuestions',
              'Does your condition interfere with asking questions in a conversation?')}

            {renderCPIBQuestion('communicatingSmallGroup',
              'Does your condition interfere with communicating in a small group of people?')}

            {renderCPIBQuestion('longConversation',
              'Does your condition interfere with having a long conversation with someone you know about a book, movie, show or sports event?')}

            {renderCPIBQuestion('detailedInformation',
              'Does your condition interfere with giving someone DETAILED information?')}

            {renderCPIBQuestion('fastMovingConversation',
              'Does your condition interfere with getting your turn in a fast-moving conversation?')}

            {renderCPIBQuestion('persuadingOthers',
              'Does your condition interfere with trying to persuade a friend or family member to see a different point of view?')}
          </div>
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