const catalyst = require('../shared/catalyst-sdk').getInitializer();

module.exports = async (queryText, limit = 5) => {
  try {
    const qml = catalyst.quickML();
    const records = await qml.rag.retrieve(queryText, limit);
    return {
      success: true,
      records
    };
  } catch (err) {
    console.error('RAG query execution failed:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
