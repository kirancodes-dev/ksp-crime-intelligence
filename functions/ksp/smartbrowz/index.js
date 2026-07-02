const catalyst = require('../shared/catalyst-sdk').getInitializer();

/**
 * Fetch aggregated statistics, trend coordinates, and recent logs from database.
 */
const getStats = async (timeFilter) => {
  try {
    const db = catalyst.datastore();
    
    // 1. Build SQLite time filter condition
    let timeCondition = "1=1";
    let groupFormat = "%Y-%m-%d";
    let limitHours = 720;
    
    if (timeFilter === '24h') {
      timeCondition = "timestamp >= datetime('now', '-24 hours')";
      groupFormat = "%Y-%m-%d %H:00:00";
      limitHours = 24;
    } else if (timeFilter === '7d') {
      timeCondition = "timestamp >= datetime('now', '-7 days')";
      groupFormat = "%Y-%m-%d";
      limitHours = 168;
    } else if (timeFilter === '30d') {
      timeCondition = "timestamp >= datetime('now', '-30 days')";
      groupFormat = "%Y-%m-%d";
      limitHours = 720;
    }

    // 2. Fetch general KPIs
    const kpiRow = await db.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successCount,
        AVG(latency_ms) as avgLatency,
        SUM(size_kb) as totalSize
      FROM SmartBrowz_Logs
      WHERE ${timeCondition}
    `);

    const total = kpiRow[0]?.total || 0;
    const successCount = kpiRow[0]?.successCount || 0;
    const successRate = total > 0 ? parseFloat(((successCount / total) * 100).toFixed(1)) : 100;
    const avgLatency = total > 0 ? Math.round(kpiRow[0]?.avgLatency || 0) : 0;
    const totalSize = kpiRow[0]?.totalSize || 0;

    // 3. Fetch breakdown by feature
    const featuresBreakdown = await db.execute(`
      SELECT 
        category,
        feature,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successCount
      FROM SmartBrowz_Logs
      WHERE ${timeCondition}
      GROUP BY category, feature
      ORDER BY count DESC
    `);

    const features = featuresBreakdown.map(f => ({
      category: f.category,
      feature: f.feature,
      count: f.count,
      successRate: f.count > 0 ? parseFloat(((f.successCount / f.count) * 100).toFixed(1)) : 100
    }));

    // 4. Fetch time-series trend coordinates
    const trendRows = await db.execute(`
      SELECT 
        strftime('${groupFormat}', timestamp) as groupTime,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
      FROM SmartBrowz_Logs
      WHERE ${timeCondition}
      GROUP BY groupTime
      ORDER BY groupTime ASC
    `);

    // Format times nicely for the charts
    const chartData = trendRows.map(row => {
      let label = row.groupTime;
      if (timeFilter === '24h') {
        const dateObj = new Date(row.groupTime + ' UTC');
        label = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
      } else {
        const dateObj = new Date(row.groupTime + ' UTC');
        label = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }
      return {
        time: label,
        requests: row.count,
        success: row.success,
        failed: row.failed
      };
    });

    // 5. Fetch 20 most recent logs
    const recentLogs = await db.execute(`
      SELECT * 
      FROM SmartBrowz_Logs 
      WHERE ${timeCondition} 
      ORDER BY timestamp DESC 
      LIMIT 20
    `);

    return {
      success: true,
      stats: {
        total,
        successRate,
        avgLatency,
        totalSize,
        features,
        chartData,
        recentLogs
      }
    };
  } catch (err) {
    console.error('Failed to get SmartBrowz statistics:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Execute a simulated SmartBrowz action and write log to database.
 */
const runAction = async (actionType) => {
  try {
    const db = catalyst.datastore();
    
    let category = '';
    let feature = '';
    let details = '';
    let sizeKb = null;
    let logOutput = [];

    // Setup action parameters & simulated console logs
    switch (actionType) {
      case 'headless_run':
        category = 'Browser Control';
        feature = 'Headless';
        details = 'Simulated automated web scraping of geofence coordination nodes';
        logOutput = [
          "[SPAWNING] Launching Chromium headless browser instance...",
          "[NAVIGATION] Directing to http://ksp-geofence.local/nodes/live",
          "[LOGIC] Waiting for target selector #hotspot-coordinates...",
          "[DOM] Found 4 active towers, parsed 18 client beacons",
          "[COMPLETED] Closing headless session."
        ];
        break;
      case 'browser_logic':
        category = 'Browser Control';
        feature = 'Browser Logic';
        details = 'Simulated multi-step login authentication bypass audit';
        logOutput = [
          "[SESSION] Initializing supervisor bypass logic routine...",
          "[FORM] Locating authentication fields for badge verification...",
          "[USER] Inputting synthetic credential payloads...",
          "[EVENT] Simulating 2FA OTP submission...",
          "[AUTH] Received HTTP 200 OK. Auth token stored successfully.",
          "[COMPLETED] Logic script verified successfully."
        ];
        break;
      case 'pdf_convert':
        category = 'Convert';
        feature = 'PDF & Screenshot';
        details = 'Generated Case Intelligence summary PDF for case docket';
        sizeKb = 120 + Math.floor(Math.random() * 200);
        logOutput = [
          "[PDF] Compiling HTML markup for case BRIEF-2026-042...",
          "[LAYOUT] Evaluating page breaks and grid structures...",
          "[RENDER] Running headless layout engine for PDF generation...",
          `[COMPLETED] Stream finalized. Generated ${sizeKb} KB output.`
        ];
        break;
      case 'screenshot':
        category = 'Convert';
        feature = 'PDF & Screenshot';
        details = 'Captured live spatial map hotspot dashboard screenshot';
        sizeKb = 450 + Math.floor(Math.random() * 400);
        logOutput = [
          "[IMAGE] Querying geographic vector tiles...",
          "[RENDER] Awaiting leaflet markers rendering cycle...",
          "[CAP] Invoking browser capture screenshot viewport API...",
          `[COMPLETED] Saved rasterized PNG buffer, size ${sizeKb} KB.`
        ];
        break;
      case 'template_render':
        category = 'Convert';
        feature = 'Templates';
        details = 'Compiled official case reporting HTML template';
        logOutput = [
          "[JINJA2] Fetching legal incident reporting template layout...",
          "[BIND] Binding variables: complainant_name, accused_list, crime_type...",
          "[RENDER] Compiling static markup output...",
          "[COMPLETED] Template rendering complete."
        ];
        break;
      case 'dataverse_sync':
        category = 'Data';
        feature = 'Dataverse';
        details = 'Synchronized regional CCTNS Dataverse entity definitions';
        sizeKb = 12 + Math.floor(Math.random() * 30);
        logOutput = [
          "[DATAVERSE] Establishing secure link to Zoho Dataverse endpoints...",
          "[SCHEMA] Fetching entity definitions: CriminalRegistry, CaseLogs...",
          "[DIFF] Mapping SQLite table schemas to remote definitions...",
          `[SUCCESS] Synchronized 8 table structures, transfer size: ${sizeKb} KB.`,
          "[COMPLETED] Dataverse connection active."
        ];
        break;
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }

    const startTime = Date.now();
    const status = Math.random() > 0.05 ? 'SUCCESS' : 'FAILED';
    const latency = status === 'SUCCESS' ? 400 + Math.floor(Math.random() * 1500) : 2500 + Math.floor(Math.random() * 1500);
    
    if (status === 'FAILED') {
      logOutput.push(`[ERROR] Process halted unexpectedly during execution. Latency: ${latency}ms.`);
    }

    // Insert log to database
    await db.run(
      "INSERT INTO SmartBrowz_Logs (timestamp, category, feature, status, latency_ms, size_kb, details) VALUES (datetime('now'), ?, ?, ?, ?, ?, ?)",
      [category, feature, status, latency, sizeKb, status === 'SUCCESS' ? details : `${details} (FAILED)`]
    );

    return {
      success: status === 'SUCCESS',
      action: {
        category,
        feature,
        status,
        latency,
        sizeKb,
        details,
        timestamp: new Date().toISOString()
      },
      logOutput
    };
  } catch (err) {
    console.error('Failed to execute simulated SmartBrowz action:', err);
    return { success: false, error: err.message };
  }
};

module.exports = {
  getStats,
  runAction
};
