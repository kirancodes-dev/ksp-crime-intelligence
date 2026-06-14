const catalyst = require('../shared/catalyst-sdk').getInitializer();

module.exports = async (text, fromLanguage, toLanguage) => {
  try {
    const zia = catalyst.zia();
    const translation = await zia.translate(text, fromLanguage, toLanguage);
    return {
      success: true,
      translation
    };
  } catch (err) {
    console.error('Translation execution failed:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
