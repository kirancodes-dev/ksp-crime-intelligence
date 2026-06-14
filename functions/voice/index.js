const catalyst = require('../shared/catalyst-sdk').getInitializer();

module.exports = async (action, data) => {
  try {
    const zia = catalyst.zia();
    if (action === 'stt') {
      const text = await zia.speechToText();
      return {
        success: true,
        text
      };
    } else if (action === 'tts') {
      const audioContent = await zia.textToSpeech(data);
      return {
        success: true,
        audioContent
      };
    } else {
      return {
        success: false,
        error: "Invalid voice action. Must be 'stt' or 'tts'."
      };
    }
  } catch (err) {
    console.error('Voice function execution failed:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
