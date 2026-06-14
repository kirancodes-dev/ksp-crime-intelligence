const catalyst = require('../shared/catalyst-sdk').getInitializer();

/**
 * Simulated Facial Biometric Matcher for KSP Portal.
 * Queries actual offender database records and assigns facial match probabilities.
 */
module.exports = async (targetName = "") => {
  // Simulate processing delay (facial radar scan)
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    const db = catalyst.datastore();
    
    // Fetch a list of accused offenders
    let sql = `
      SELECT a.*, f.fir_number, f.crime_type, f.status as fir_status
      FROM Accused a
      JOIN FIR f ON a.fir_id = f.id
    `;
    
    const params = [];
    if (targetName && targetName.trim().length > 0) {
      sql += " WHERE a.name LIKE ?";
      params.push(`%${targetName.trim()}%`);
    } else {
      sql += " ORDER BY a.prior_convictions DESC LIMIT 4";
    }
    
    const records = await db.execute(sql, params);
    
    // If no records found, fallback to generic results
    if (records.length === 0) {
      return {
        success: true,
        matches: []
      };
    }
    
    // Map database records to high-fidelity biometric outputs
    const matches = records.map((rec, index) => {
      // Calculate a mock facial similarity score. Top match gets high confidence.
      let similarity = 98.2 - (index * 7.4);
      if (similarity < 40) similarity = 42.1;
      
      return {
        accused_id: rec.id,
        name: rec.name,
        age: rec.age,
        gender: rec.gender,
        gang: rec.gang_affiliation || "Independent",
        risk_score: rec.risk_score,
        fir_number: rec.fir_number,
        crime_type: rec.crime_type,
        address: rec.address || "Karnataka, India",
        similarity: parseFloat(similarity.toFixed(1)),
        biometric_features: {
          facial_symmetry: (90 + Math.random() * 8).toFixed(1) + "%",
          iris_match: (88 + Math.random() * 10).toFixed(1) + "%",
          forehead_nodes: 18,
          chin_type: "Oval"
        }
      };
    });
    
    return {
      success: true,
      matches
    };
  } catch (err) {
    console.error("Biometrics engine error:", err);
    return {
      success: false,
      error: err.message
    };
  }
};
