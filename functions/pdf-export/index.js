const catalyst = require('../shared/catalyst-sdk').getInitializer();

module.exports = async (htmlContent) => {
  const startTime = Date.now();
  try {
    const smartBrowz = catalyst.smartBrowz();
    const pdfBuffer = await smartBrowz.generatePdfFromHtml(htmlContent);
    const latency = Date.now() - startTime;
    const sizeKb = Math.round(pdfBuffer.length / 1024);
    
    // Log to SmartBrowz_Logs
    try {
      const db = catalyst.datastore();
      await db.run(
        "INSERT INTO SmartBrowz_Logs (timestamp, category, feature, status, latency_ms, size_kb, details) VALUES (datetime('now'), ?, ?, ?, ?, ?, ?)",
        ['Convert', 'PDF & Screenshot', 'SUCCESS', latency, sizeKb, 'Exported intelligence brief PDF']
      );
    } catch (dbErr) {
      console.error('Failed to log PDF export to SmartBrowz_Logs:', dbErr);
    }

    return {
      success: true,
      pdfBase64: pdfBuffer.toString('base64')
    };
  } catch (err) {
    console.error('PDF Export function execution failed:', err);
    const latency = Date.now() - startTime;
    
    // Log failure to SmartBrowz_Logs
    try {
      const db = catalyst.datastore();
      await db.run(
        "INSERT INTO SmartBrowz_Logs (timestamp, category, feature, status, latency_ms, size_kb, details) VALUES (datetime('now'), ?, ?, ?, ?, ?, ?)",
        ['Convert', 'PDF & Screenshot', 'FAILED', latency, null, `PDF Generation Failed: ${err.message}`]
      );
    } catch (dbErr) {
      console.error('Failed to log PDF export failure to SmartBrowz_Logs:', dbErr);
    }

    return {
      success: false,
      error: err.message
    };
  }
};
