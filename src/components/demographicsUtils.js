// demographicsUtils.js
export const checkDemographicsExist = async (directoryHandle, userId) => {
  try {
    const fileName = `${userId}_demographics.csv`;
    await directoryHandle.getFileHandle(fileName);
    return true;
  } catch (err) {
    return false;
  }
};
