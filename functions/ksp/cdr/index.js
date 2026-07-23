/**
 * Simulated CDR cellular timeline data provider for KSP Portal
 */
module.exports = async (suspectName = "Rupa Naik") => {
  // Simulate database delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const name = suspectName.toLowerCase();
  
  if (name.includes('ramesh')) {
    return {
      success: true,
      mode: "DEMO_SIMULATOR",
      data_source: "SYNTHETIC_DATASET",
      suspect: "Ramesh Kumar",
      phone: "+91 98450 12345",
      imei: "358291048291048",
      carrier: "Jio Karnataka",
      breadcrumbs: [
        { id: 1, lat: 15.3580, lng: 75.1200, time: "10:00 AM", tower: "Hubballi Station Tower A" },
        { id: 2, lat: 15.3620, lng: 75.1230, time: "10:45 AM", tower: "Gokul Road Junction" },
        { id: 3, lat: 15.3650, lng: 75.1280, time: "11:30 AM", tower: "Keshwapur Tower B" },
        { id: 4, lat: 15.3700, lng: 75.1320, time: "12:15 PM", tower: "Hubballi Industrial Estate" }
      ],
      collisionAlerts: [
        {
          fir_number: "FIR-2026-004",
          incident_time: "11:45 AM",
          distance_meters: 180,
          tower_id: "Keshwapur Tower B",
          severity: "High Match"
        }
      ]
    };
  } else if (name.includes('amit') || name.includes('verma')) {
    return {
      success: true,
      suspect: "Amit Verma",
      phone: "+91 99000 98765",
      imei: "869402910482910",
      carrier: "Airtel Karnataka",
      breadcrumbs: [
        { id: 1, lat: 12.9350, lng: 77.6100, time: "08:00 AM", tower: "Koramangala 3rd Block" },
        { id: 2, lat: 12.9390, lng: 77.6200, time: "09:00 AM", tower: "HSR Layout Sector 2" },
        { id: 3, lat: 12.9420, lng: 77.6300, time: "10:00 AM", tower: "Silk Board Crossing" },
        { id: 4, lat: 12.9460, lng: 77.6400, time: "11:00 AM", tower: "Electronic City Phase 1" }
      ],
      collisionAlerts: []
    };
  } else {
    // Default Rupa Naik
    return {
      success: true,
      suspect: "Rupa Naik",
      phone: "+91 94480 99999",
      imei: "354029104820194",
      carrier: "BSNL Karnataka",
      breadcrumbs: [
        { id: 1, lat: 12.9650, lng: 77.5800, time: "02:00 PM", tower: "Majestic Bus Terminus" },
        { id: 2, lat: 12.9700, lng: 77.5900, time: "02:45 PM", tower: "Vidhana Soudha North" },
        { id: 3, lat: 12.9750, lng: 77.6000, time: "03:30 PM", tower: "MG Road Metro Station" },
        { id: 4, lat: 12.9800, lng: 77.6100, time: "04:15 PM", tower: "Indiranagar 100ft Rd" }
      ],
      collisionAlerts: [
        {
          fir_number: "FIR-2026-003",
          incident_time: "03:40 PM",
          distance_meters: 95,
          tower_id: "MG Road Metro Station",
          severity: "Critical Intersection"
        }
      ]
    };
  }
};
