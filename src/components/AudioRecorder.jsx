import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, AlertTriangle, Folder, Check } from 'lucide-react';
import { sentences } from './sentences';
import { saveProgress, loadProgress } from './progressUtils';

const AudioRecorder = ({ initialUserId, initialDirectoryHandle }) => {
  // State for sentence category selection
  const [selectedCategory, setSelectedCategory] = useState('Practice');
  const [currentSentenceData, setCurrentSentenceData] = useState(null);

  // State management
  const [recordedSentences, setRecordedSentences] = useState(new Set());
  const [userId, setUserId] = useState(initialUserId || '');
  const [directoryName, setDirectoryName] = useState(initialDirectoryHandle?.name || '');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [currentSentence, setCurrentSentence] = useState(0);
  // const [browserSupported, setBrowserSupported] = useState(true);
  const [status, setStatus] = useState('idle'); // idle, recording, processing, error
  const [error, setError] = useState(null);

  // References
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const directoryHandleRef = useRef(initialDirectoryHandle);

  // Get available categories from sentences object
  const categories = Object.keys(sentences);

  // Get current category's sentences
  const currentCategorySentences = sentences[selectedCategory] || [];

  // Update current sentence data when category or index changes
  useEffect(() => {
    if (currentCategorySentences.length > 0) {
      setCurrentSentenceData(currentCategorySentences[currentSentence]);
    }
  }, [selectedCategory, currentSentence]);

  // save progress file in directory
  const initializeProgress = async () => {
    if (initialDirectoryHandle && initialUserId) {
      try {
        const savedProgress = await loadProgress(initialDirectoryHandle, initialUserId);
        if (savedProgress) {
          setRecordedSentences(savedProgress.recordedSentences);
          setSelectedCategory(savedProgress.selectedCategory);
          setCurrentSentence(savedProgress.currentSentence);
        }
      } catch (err) {
        console.error('Error loading progress:', err);
        setError('Failed to load previous progress');
      }
    }
  };

  // update progress when changing categories
  const updateProgress = async () => {
    if (directoryHandleRef.current && userId) {
      try {
        await saveProgress(directoryHandleRef.current, userId, {
          recordedSentences,
          selectedCategory,
          currentSentence
        });
      } catch (err) {
        console.error('Error updating progress:', err);
      }
    }
  };

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
          autoGainControl: true,
          channelCount: 1
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

        if (audioRef.current) {
          const url = URL.createObjectURL(audioBlob);
          audioRef.current.src = url;
          console.log('Audio ready for playback');
        }

        try {
          await saveRecording(audioBlob);
          setRecordedSentences(prev => new Set([...prev, currentSentenceData.id]));
          setStatus('idle');
        } catch (error) {
          console.error('Error in onstop handler:', error);
          setStatus('error');
          setError('Failed to process recording');
        }
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setStatus('error');
      setError(err.message || 'Failed to start recording');
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
    if (!userId || !directoryHandleRef.current || !currentSentenceData) {
      console.warn('Missing required data for saving');
      return;
    }

    console.log('Starting save process...');
    try {
      const audioContext = new AudioContext();
      const audioBuffer = await blob.arrayBuffer();
      const decodedBuffer = await audioContext.decodeAudioData(audioBuffer);

      const createWavFile = (audioBuffer) => {
        const numberOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numberOfChannels * 2;
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);
        const sampleRate = audioBuffer.sampleRate;

        // WAV header
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(view, 8, 'WAVE');

        // "fmt " sub-chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * 2, true);
        view.setUint16(32, numberOfChannels * 2, true);
        view.setUint16(34, 16, true);

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

      // Save recording with sentence ID in filename
      const fileName = `${userId}_${currentSentenceData.id}.wav`;
      const wavBlob = createWavFile(decodedBuffer);
      const fileHandle = await directoryHandleRef.current.getFileHandle(fileName, { create: true });
      const writableStream = await fileHandle.createWritable();
      await writableStream.write(wavBlob);
      await writableStream.close();
      console.log(`Recording saved as ${fileName}`);


      try {
        // Save the progress
        console.log(`Saving progress`);
        const updatedRecordedSentences = new Set([...recordedSentences, currentSentenceData.id]);
        setRecordedSentences(updatedRecordedSentences);

        await saveProgress(directoryHandleRef.current, userId, {
          recordedSentences: updatedRecordedSentences,
          selectedCategory,
          currentSentence
        });
      } catch (progressError) {
        console.error('Error saving progress:', progressError);
      }

    } catch (err) {
      console.error('Error saving recording:', err);
      throw err;
    }
  };

  // Call initializeProgress in useEffect
  useEffect(() => {
    initializeProgress();
  }, [initialDirectoryHandle, initialUserId]);

  // Navigation functions
  const handleNavigation = (direction) => {
    if (recording) {
      stopRecording();
    }
    setAudioBlob(null);
    updateProgress();

    setCurrentSentence(curr => {
      if (direction === 'next' && curr < currentCategorySentences.length - 1) {
        return curr + 1;
      } else if (direction === 'previous' && curr > 0) {
        return curr - 1;
      }
      return curr;
    });
  };

  const nextSentence = () => handleNavigation('next');
  const previousSentence = () => handleNavigation('previous');

  // Clean up function
  useEffect(() => {
    return () => {
      if (recording) {
        stopRecording();
      }
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

      {/* Category Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Select Category:</label>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setCurrentSentence(0);
            updateProgress();
            // setRecordedSentences(new Set());
          }}
          className="w-full p-2 border rounded"
        >
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Sentence Display */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <p className="text-base font-medium">
            Sentence {currentSentence + 1} of {currentCategorySentences.length}
          </p>
          {recordedSentences.has(currentSentenceData?.id) && (
            <div className="flex items-center text-green-600">
              <Check className="h-5 w-5 mr-1" />
              <span className="text-sm">Recorded</span>
            </div>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-500">ID: {currentSentenceData?.id}</p>
        <p className="mt-3 text-3xl">{currentSentenceData?.sentence}</p>
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

        {audioBlob && recordedSentences.has(currentSentenceData?.id) && (
          <button
            onClick={() => audioRef.current?.play()}
            className="p-4 rounded-full bg-green-500 hover:bg-green-600 text-white"
          >
            <Play size={24} />
          </button>
        )}

        {/* No longer need redo button}}
        {audioBlob && recordedSentences.has(currentSentenceData?.id) && (
          <button
            onClick={() => setAudioBlob(null)}
            className="p-4 rounded-full bg-gray-500 hover:bg-gray-600 text-white"
          >
            <RotateCcw size={24} />
          </button>
        )}
          */}
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
        {recordedSentences.has(currentSentenceData?.id) && (
          <button
            onClick={nextSentence}
            disabled={currentSentence === sentences.length - 1}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        )}
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default AudioRecorder;