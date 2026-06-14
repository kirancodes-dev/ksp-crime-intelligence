const catalyst = require('../shared/catalyst-sdk').getInitializer();

module.exports = async (htmlContent) => {
  try {
    const smartBrowz = catalyst.smartBrowz();
    const pdfBuffer = await smartBrowz.generatePdfFromHtml(htmlContent);
    return {
      success: true,
      pdfBase64: pdfBuffer.toString('base64')
    };
  } catch (err) {
    console.error('PDF Export function execution failed:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
