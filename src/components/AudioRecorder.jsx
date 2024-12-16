import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, RotateCcw, AlertTriangle, Folder, Check } from 'lucide-react';

const AudioRecorder = () => {
  // Add new state for recorded sentences
  const [recordedSentences, setRecordedSentences] = useState(new Set());

  // Existing state management
  const [userId, setUserId] = useState('');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [directoryName, setDirectoryName] = useState('');

  // References
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const directoryHandleRef = useRef(null);

  // Check browser compatibility on mount
  useEffect(() => {
    const isFileSystemSupported = 'showSaveFilePicker' in window;
    setBrowserSupported(isFileSystemSupported);
  }, []);

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

  // Select directory for saving recordings
  const selectDirectory = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      directoryHandleRef.current = dirHandle;
      setDirectoryName(dirHandle.name);
      console.log('Selected directory:', dirHandle.name);
    } catch (err) {
      console.error('Error selecting directory:', err);
    }
  };

  // State for recording status and errors
  const [status, setStatus] = useState('idle'); // idle, recording, processing, error
  const [error, setError] = useState(null);

  // Start recording function
  const startRecording = async () => {
    try {
      setStatus('recording');
      setError(null);

      // Check for required inputs
      if (!userId.trim()) {
        throw new Error('Please enter a user ID');
      }
      if (!directoryHandleRef.current) {
        throw new Error('Please select a save directory');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          //noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1 // Force mono recording
        }
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      });

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
          // Mark the sentence as recorded
          setRecordedSentences(prev => new Set([...prev, currentSentence]));
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
    if (!userId || !directoryHandleRef.current) {
      console.warn('Missing user ID or save directory');
      return;
    }

    console.log('Starting save process...');
    try {
      // Convert to proper WAV format
      const audioContext = new AudioContext();
      const audioBuffer = await blob.arrayBuffer();
      const decodedBuffer = await audioContext.decodeAudioData(audioBuffer);

      // Function to create WAV file
      const createWavFile = (audioBuffer) => {
        const numberOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numberOfChannels * 2; // 2 bytes per sample
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);
        const sampleRate = audioBuffer.sampleRate;

        // WAV header
        // "RIFF" chunk descriptor
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(view, 8, 'WAVE');

        // "fmt " sub-chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // fmt chunk size
        view.setUint16(20, 1, true); // audio format (1 for PCM)
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * 2, true); // byte rate
        view.setUint16(32, numberOfChannels * 2, true); // block align
        view.setUint16(34, 16, true); // bits per sample

        // "data" sub-chunk
        writeString(view, 36, 'data');
        view.setUint32(40, length, true);

        // Write audio data
        const offset = 44;
        const channels = [];
        for (let i = 0; i < numberOfChannels; i++) {
          channels.push(audioBuffer.getChannelData(i));
        }

        for (let i = 0; i < audioBuffer.length; i++) {
          for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, channels[channel][i]));
            const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(offset + (i * numberOfChannels + channel) * 2, int16, true);
          }
        }

        return new Blob([buffer], { type: 'audio/wav' });
      };

      const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      // Save original recording
      const fileName = `${userId}_sentence${currentSentence + 1}.wav`;
      const wavBlob = createWavFile(decodedBuffer);
      const fileHandle = await directoryHandleRef.current.getFileHandle(fileName, { create: true });
      const writableStream = await fileHandle.createWritable();
      await writableStream.write(wavBlob);
      await writableStream.close();
      console.log(`Recording saved as ${fileName}`);

      // Process trimmed version with silence padding
      const threshold = 0.01;
      const startIndex = findFirstNonSilence(decodedBuffer.getChannelData(0), threshold);
      const endIndex = findLastNonSilence(decodedBuffer.getChannelData(0), threshold);

      // Calculate padding samples based on sample rate
      const silencePaddingStart = Math.floor(decodedBuffer.sampleRate * 0.5); // 500ms
      // const silencePaddingEnd = Math.floor(decodedBuffer.sampleRate * 0.1);   // 100ms trim

      // Create new buffer with padding
      const trimmedBuffer = audioContext.createBuffer(
        decodedBuffer.numberOfChannels,
        (endIndex - startIndex) + silencePaddingStart,  // Add start padding
        decodedBuffer.sampleRate
      );

      // Fill the buffer with zeros (silence)
      for (let channel = 0; channel < decodedBuffer.numberOfChannels; channel++) {
        const channelData = trimmedBuffer.getChannelData(channel);
        // First 500ms is already zeros (silence)
        const audioData = decodedBuffer.getChannelData(channel).slice(
          startIndex,
          endIndex - 0 // silencePaddingEnd  // Trim last 100ms
        );
        // Copy the audio data after the silence padding
        channelData.set(audioData, silencePaddingStart);
      }

      // Save trimmed version
      const trimmedFileName = `${userId}_sentence${currentSentence + 1}_trimmed.wav`;
      const trimmedWavBlob = createWavFile(trimmedBuffer);
      const trimmedFileHandle = await directoryHandleRef.current.getFileHandle(trimmedFileName, { create: true });
      const trimmedWritableStream = await trimmedFileHandle.createWritable();
      await trimmedWritableStream.write(trimmedWavBlob);
      await trimmedWritableStream.close();
      console.log(`Trimmed recording saved as ${trimmedFileName}`);

    } catch (err) {
      console.error('Error saving recording:', err);
    }
  };

  // Navigation functions
  const handleNavigation = (direction) => {
    // Stop recording if active
    if (recording) {
      stopRecording();
    }

    // Clear current audio blob
    setAudioBlob(null);

    // Update sentence index
    setCurrentSentence(curr => {
      if (direction === 'next' && curr < sentences.length - 1) {
        return curr + 1;
      } else if (direction === 'previous' && curr > 0) {
        return curr - 1;
      }
      return curr;
    });
  };

  const nextSentence = () => handleNavigation('next');
  const previousSentence = () => handleNavigation('previous');

  // Helper function to get audio duration
  // const getAudioDuration = async (blob) => {
  //   return new Promise((resolve, reject) => {
  //     const audio = new Audio();
  //     audio.onloadedmetadata = () => resolve(audio.duration);
  //     audio.onerror = reject;
  //     audio.src = URL.createObjectURL(blob);
  //   });
  // };

  // Clean up function
  useEffect(() => {
    return () => {
      // Stop any ongoing recording when component unmounts
      if (recording) {
        stopRecording();
      }
      // Clean up any object URLs
      if (audioRef.current?.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, [recording]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.code === 'Space' && !event.repeat && !event.target.matches('input, textarea')) {
        event.preventDefault();
        if (recording) {
          stopRecording();
        } else {
          startRecording();
        }
      } else if (event.code === 'ArrowLeft' && !event.repeat) {
        previousSentence();
      } else if (event.code === 'ArrowRight' && !event.repeat) {
        nextSentence();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [recording]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p className="font-bold">Error</p>
          </div>
          <p>{error}</p>
        </div>
      )}

      {status === 'processing' && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4 rounded">
          <p>Processing audio...</p>
        </div>
      )}

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
          >
            <Folder className="h-4 w-4 mr-2" />
            Select Folder
          </button>
        </div>
      </div>

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
        <div className="flex items-center justify-between">
          <p className="text-base font-medium">Sentence {currentSentence + 1} of {sentences.length}</p>
          {recordedSentences.has(currentSentence) && (
            <div className="flex items-center text-green-600">
              <Check className="h-5 w-5 mr-1" />
              <span className="text-sm">Recorded</span>
            </div>
          )}
        </div>
        <p className="mt-3 text-3xl">{sentences[currentSentence]}</p>
      </div>

      {/* Recording Controls */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={!userId || !directoryName}
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