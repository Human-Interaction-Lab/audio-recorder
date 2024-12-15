import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, RotateCcw, AlertTriangle } from 'lucide-react';

const AudioRecorder = () => {
  // State management
  const [userId, setUserId] = useState('');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [browserSupported, setBrowserSupported] = useState(true);

  // Check browser compatibility on mount
  useEffect(() => {
    const isFileSystemSupported = 'showSaveFilePicker' in window;
    setBrowserSupported(isFileSystemSupported);
  }, []);

  // References
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  // Sample sentences - can be moved to external data source
  const sentences = [
    "The quick brown fox jumps over the lazy dog.",
    "A watched pot never boils.",
    "Actions speak louder than words.",
    "Better late than never.",
    "Every cloud has a silver lining.",
    "Fortune favors the bold.",
    "Practice makes perfect.",
    "Time heals all wounds.",
    "Where there's smoke there's fire.",
    "You can't judge a book by its cover."
  ];

  // Helper functions for silence removal
  const findFirstNonSilence = (data, threshold) => {
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) > threshold) return i;
    }
    return 0;
  };

  const findLastNonSilence = (data, threshold) => {
    for (let i = data.length - 1; i >= 0; i--) {
      if (Math.abs(data[i]) > threshold) return i;
    }
    return data.length - 1;
  };

  // Start recording function
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);

        // Create audio URL for playback
        if (audioRef.current) {
          const url = URL.createObjectURL(audioBlob);
          audioRef.current.src = url;
          console.log('Audio ready for playback');
        }

        try {
          // Save the recording
          await saveRecording(audioBlob);
        } catch (error) {
          console.error('Error in onstop handler:', error);
        }
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
    }
  };

  // Save recording function
  const saveRecording = async (blob) => {
    if (!userId) {
      console.warn('No user ID provided, cannot save recording');
      return;
    }

    console.log('Starting save process...');
    try {
      // Create file handle for saving
      const fileName = `${userId}_sentence${currentSentence + 1}.wav`;

      // Use showSaveFilePicker to let user choose save location
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'Wave Audio File',
          accept: { 'audio/wav': ['.wav'] },
        }],
      });

      // Create a FileSystemWritableFileStream to write to
      const writableStream = await handle.createWritable();

      // Write the blob to the file
      await writableStream.write(blob);
      await writableStream.close();

      console.log(`Recording saved as ${fileName}`);

      // Save the trimmed version
      const trimmedHandle = await window.showSaveFilePicker({
        suggestedName: `${userId}_sentence${currentSentence + 1}_trimmed.wav`,
        types: [{
          description: 'Wave Audio File',
          accept: { 'audio/wav': ['.wav'] },
        }],
      });

      // Example of silence removal (basic implementation)
      // In a production environment, you'd want a more sophisticated algorithm
      const audioContext = new AudioContext();
      const audioBuffer = await blob.arrayBuffer();
      const decodedBuffer = await audioContext.decodeAudioData(audioBuffer);

      // Simple silence threshold detection
      const threshold = 0.01;
      const startIndex = findFirstNonSilence(decodedBuffer.getChannelData(0), threshold);
      const endIndex = findLastNonSilence(decodedBuffer.getChannelData(0), threshold);

      // Create new buffer without silence
      const trimmedBuffer = audioContext.createBuffer(
        decodedBuffer.numberOfChannels,
        endIndex - startIndex,
        decodedBuffer.sampleRate
      );

      for (let channel = 0; channel < decodedBuffer.numberOfChannels; channel++) {
        const channelData = decodedBuffer.getChannelData(channel);
        trimmedBuffer.copyToChannel(
          channelData.slice(startIndex, endIndex),
          channel
        );
      }

      // Convert trimmed buffer back to a blob
      const trimmedBlob = await new Promise(resolve => {
        const mediaStreamSource = audioContext.createMediaStreamDestination();
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = trimmedBuffer;
        sourceNode.connect(mediaStreamSource);
        sourceNode.start(0);

        const mediaRecorder = new MediaRecorder(mediaStreamSource.stream);
        const chunks = [];

        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/wav' }));

        mediaRecorder.start();
        setTimeout(() => mediaRecorder.stop(), trimmedBuffer.duration * 1000);
      });
    } catch (err) {
      console.error('Error saving recording:', err);
    }
  };

  // Navigation functions
  const nextSentence = () => {
    if (currentSentence < sentences.length - 1) {
      setCurrentSentence(curr => curr + 1);
      setAudioBlob(null);
    }
  };

  const previousSentence = () => {
    if (currentSentence > 0) {
      setCurrentSentence(curr => curr - 1);
      setAudioBlob(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Browser Compatibility Warning */}
      {!browserSupported && (
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4 rounded">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p className="font-bold">Browser Compatibility Issue</p>
          </div>
          <p>
            Your browser doesn't support all required features. Please use Chrome, Edge, or Opera for full functionality.
            Current features like recording and playback will work, but saving files may be limited.
          </p>
        </div>
      )}

      {/* User ID Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">User ID:</label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Enter user ID"
        />
      </div>

      {/* Sentence Display */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-lg font-medium">Sentence {currentSentence + 1} of {sentences.length}</p>
        <p className="mt-2">{sentences[currentSentence]}</p>
      </div>

      {/* Recording Controls */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={!userId}
          className={`p-4 rounded-full ${recording
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-blue-500 hover:bg-blue-600'
            } text-white disabled:opacity-50`}
        >
          {recording ? <Square size={24} /> : <Mic size={24} />}
        </button>

        {audioBlob && (
          <button
            onClick={() => audioRef.current?.play()}
            className="p-4 rounded-full bg-green-500 hover:bg-green-600 text-white"
          >
            <Play size={24} />
          </button>
        )}

        {audioBlob && (
          <button
            onClick={() => setAudioBlob(null)}
            className="p-4 rounded-full bg-gray-500 hover:bg-gray-600 text-white"
          >
            <RotateCcw size={24} />
          </button>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between">
        <button
          onClick={previousSentence}
          disabled={currentSentence === 0}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={nextSentence}
          disabled={currentSentence === sentences.length - 1}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default AudioRecorder;