/**
 * PDF Export Module for KSP Portal
 * Phase 7: Production-grade HTML-to-PDF with KSP letterhead
 * Generates proper intelligence brief documents with classification banners
 */
const catalyst = require('../shared/catalyst-sdk').getInitializer();

/**
 * Generate a KSP-branded PDF from HTML content
 * Uses template-based approach for consistent government-grade formatting
 */
module.exports = async (htmlContent, metadata = {}) => {
  const startTime = Date.now();
  try {
    // Wrap raw content in KSP official document template
    const officialDocument = generateOfficialTemplate(htmlContent, metadata);
    
    const smartBrowz = catalyst.smartBrowz();
    const pdfBuffer = await smartBrowz.generatePdfFromHtml(officialDocument);
    const latency = Date.now() - startTime;
    const sizeKb = Math.round(pdfBuffer.length / 1024);
    
    // Log to SmartBrowz_Logs
    try {
      const db = catalyst.datastore();
      await db.run(
        "INSERT INTO SmartBrowz_Logs (timestamp, category, feature, status, latency_ms, size_kb, details) VALUES (datetime('now'), ?, ?, ?, ?, ?, ?)",
        ['Convert', 'PDF & Screenshot', 'SUCCESS', latency, sizeKb, `Intelligence brief PDF: ${metadata.title || 'Report'}`]
      );
    } catch (dbErr) {
      console.error('Failed to log PDF export to SmartBrowz_Logs:', dbErr);
    }

    return {
      success: true,
      pdfBase64: pdfBuffer.toString('base64'),
      metadata: {
        size_kb: sizeKb,
        latency_ms: latency,
        title: metadata.title || 'KSP Intelligence Brief',
        classification: metadata.classification || 'RESTRICTED',
        generated_at: new Date().toISOString()
      }
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

/**
 * Generate official KSP document template with letterhead
 */
function generateOfficialTemplate(bodyHtml, metadata = {}) {
  const title = metadata.title || 'Intelligence Brief';
  const classification = metadata.classification || 'RESTRICTED';
  const officer = metadata.officer || 'System Generated';
  const badgeId = metadata.badgeId || '';
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} — Karnataka State Police</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', Arial, sans-serif; font-size: 11px; color: #1e293b; line-height: 1.6; }
    
    /* Classification Banner */
    .classification-banner {
      background: ${classification === 'TOP SECRET' ? '#dc2626' : classification === 'SECRET' ? '#ea580c' : '#2563eb'};
      color: white;
      text-align: center;
      padding: 4px 0;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    
    /* State Colors Accent */
    .state-bar { height: 3px; display: flex; }
    .state-bar .yellow { flex: 1; background: #ffd700; }
    .state-bar .red { flex: 1; background: #d9251c; }
    
    /* Header */
    .letterhead {
      padding: 20px 30px;
      border-bottom: 2px solid #1e3a5f;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .letterhead .emblem { width: 50px; height: 50px; }
    .letterhead .title-block h1 { font-size: 14px; color: #1e3a5f; letter-spacing: 1px; margin-bottom: 2px; }
    .letterhead .title-block p { font-size: 9px; color: #64748b; }
    
    /* Document Info */
    .doc-info { padding: 10px 30px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 9px; display: flex; justify-content: space-between; }
    
    /* Content */
    .content { padding: 20px 30px; }
    .content h2 { font-size: 13px; color: #1e3a5f; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .content h3 { font-size: 11px; color: #334155; margin: 10px 0 5px; }
    .content table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    .content th { background: #1e3a5f; color: white; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
    .content td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
    .content tr:nth-child(even) { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: 600; }
    .badge-critical { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
    .badge-high { background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; }
    .badge-medium { background: #fefce8; color: #ca8a04; border: 1px solid #fef08a; }
    .badge-low { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    
    /* Footer */
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 8px 30px;
      border-top: 1px solid #e2e8f0;
      font-size: 8px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    
    /* Signature Block */
    .signature-block {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px dashed #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    .signature-block .sig-area { width: 200px; text-align: center; }
    .signature-block .sig-line { border-top: 1px solid #1e293b; margin-top: 30px; padding-top: 4px; font-size: 9px; }
    
    @media print { .footer { position: fixed; } }
  </style>
</head>
<body>
  <div class="classification-banner">${classification} — For Official Use Only</div>
  <div class="state-bar"><div class="yellow"></div><div class="red"></div></div>
  
  <div class="letterhead">
    <div class="title-block">
      <h1>KARNATAKA STATE POLICE</h1>
      <p>Crime Intelligence & Analytics Division — ${title}</p>
    </div>
  </div>
  
  <div class="doc-info">
    <span>Generated: ${timestamp} IST</span>
    <span>Officer: ${officer} ${badgeId ? `(${badgeId})` : ''}</span>
    <span>Ref: KSP/CI/${Date.now()}</span>
  </div>
  
  <div class="content">
    ${bodyHtml}
    
    <div class="signature-block">
      <div class="sig-area">
        <div class="sig-line">Generating Officer</div>
      </div>
      <div class="sig-area">
        <div class="sig-line">Reviewing Authority</div>
      </div>
    </div>
  </div>
  
  <div class="footer">
    <span>© 2026 Karnataka State Police — Crime Intelligence Division</span>
    <span>CLASSIFICATION: ${classification}</span>
  </div>
  
  <div class="classification-banner">${classification} — For Official Use Only</div>
</body>
</html>`;
}
