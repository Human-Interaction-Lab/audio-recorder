// progressManager.js
const saveProgress = async (directoryHandle, userId, progress) => {
  try {
    const progressData = {
      userId,
      lastUpdated: new Date().toISOString(),
      recordedSentences: Array.from(progress.recordedSentences),
      selectedCategory: progress.selectedCategory,
      currentSentence: progress.currentSentence
    };

    const fileName = `${userId}_progress.json`;
    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
    const writableStream = await fileHandle.createWritable();
    await writableStream.write(JSON.stringify(progressData, null, 2));
    await writableStream.close();

    return true;
  } catch (err) {
    console.error('Error saving progress:', err);
    return false;
  }
};

const loadProgress = async (directoryHandle, userId) => {
  try {
    const fileName = `${userId}_progress.json`;
    const fileHandle = await directoryHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const content = await file.text();
    const progressData = JSON.parse(content);

    return {
      recordedSentences: new Set(progressData.recordedSentences),
      selectedCategory: progressData.selectedCategory,
      currentSentence: progressData.currentSentence,
      lastUpdated: progressData.lastUpdated
    };
  } catch (err) {
    // If file doesn't exist or there's an error, return null
    console.log('No existing progress found:', err);
    return null;
  }
};



// Update progress after successful recording
const saveRecording = async (blob) => {
  // ... existing code ...



} catch (err) {
  console.error('Error saving recording or progress:', err);
  throw err;
}
};