import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface IncidentPin {
  id: number;
  fir_number: string;
  crime_type: string;
  district: string;
  status: string;
  date_reported: string;
  latitude: number;
  longitude: number;
  address: string;
  area_type: string;
}

interface HotspotMapProps {
  incidents: IncidentPin[];
  onFirSelect?: (firNumber: string) => void;
  onIncidentSelect?: (incident: IncidentPin) => void;
}

export const HotspotMap: React.FC<HotspotMapProps> = ({ incidents, onFirSelect, onIncidentSelect }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.FeatureGroup | null>(null);

  // Dynamic colors based on crime type
  const getCrimeColor = (crimeType: string) => {
    switch (crimeType) {
      case 'Cyber Crime':
        return '#2563eb'; // Blue
      case 'Theft':
        return '#ea580c'; // Orange
      case 'Organized Crime':
        return '#dc2626'; // Red
      case 'Financial Fraud':
        return '#d97706'; // Yellow/Amber
      default:
        return '#059669'; // Emerald
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 1. Initialize Map if not already created
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: [12.9716, 77.5946], // Centered on Karnataka
        zoom: 7,
        zoomControl: true,
        attributionControl: true
      });

      // 2. Add CartoDB Voyager Tile layer (Clean Light Official Map style)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstanceRef.current);

      // 3. Create Layer Group for markers
      markersLayerRef.current = L.featureGroup().addTo(mapInstanceRef.current);
    }

    // Clear old markers
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    }

    // 4. Plot current incidents
    const markersLayer = markersLayerRef.current;
    if (incidents && incidents.length > 0 && mapInstanceRef.current && markersLayer) {
      incidents.forEach(inc => {
        const color = getCrimeColor(inc.crime_type);
        
        // Draw pulsing outer circle for hotspots
        const marker = L.circleMarker([inc.latitude, inc.longitude], {
          radius: 8,
          fillColor: color,
          fillOpacity: 0.8,
          color: '#ffffff',
          weight: 1.5,
        });

        // Popup HTML structure
        const popupContent = document.createElement('div');
        popupContent.className = "p-1 font-sans text-xs text-slate-800";
        popupContent.innerHTML = `
          <div class="font-bold text-sm text-slate-900 border-b border-slate-200 pb-1 mb-2 flex justify-between items-center gap-4">
            <span class="text-brand-primary cursor-pointer hover:underline" id="popup-fir-${inc.fir_number}">${inc.fir_number}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-semibold">${inc.area_type}</span>
          </div>
          <div class="space-y-1.5 text-slate-700 font-medium">
            <div><span class="text-slate-400 font-bold">Type:</span> <strong class="text-slate-900">${inc.crime_type}</strong></div>
            <div><span class="text-slate-400 font-bold">District:</span> <span>${inc.district}</span></div>
            <div><span class="text-slate-400 font-bold">Station:</span> <span>${inc.district.split(' ')[0]} Central PS</span></div>
            <div><span class="text-slate-400 font-bold">Date:</span> <span>${inc.date_reported}</span></div>
            <div class="pt-1 border-t border-slate-100 text-slate-500"><span class="text-slate-400 font-bold">Address:</span> ${inc.address}</div>
          </div>
        `;

        // Add callback on click inside popup
        popupContent.querySelector(`#popup-fir-${inc.fir_number}`)?.addEventListener('click', (e) => {
          e.preventDefault();
          if (onFirSelect) {
            onFirSelect(inc.fir_number);
          }
        });

        // Trigger side panel selector on marker click
        marker.on('click', () => {
          if (onIncidentSelect) {
            onIncidentSelect(inc);
          }
        });

        marker.bindPopup(popupContent);
        markersLayer.addLayer(marker);
      });

      // 5. Auto pan map bounds to show all markers
      try {
        const bounds = markersLayer.getBounds();
        if (bounds.isValid() && mapInstanceRef.current) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (err) {
        console.error("Failed to fit map bounds:", err);
      }
    }

    // Cleanup on unmount
    return () => {
      // Clear layers to maintain performance
    };
  }, [incidents, onFirSelect, onIncidentSelect]);

  // Handle full unmount cleanup
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-96 min-h-[400px] rounded-lg overflow-hidden border border-slate-200 shadow bg-white">
      <div className="absolute top-4 right-4 z-[1000] card-panel rounded-lg p-3 text-[10px] text-slate-600 border border-slate-200 bg-white space-y-1.5 shadow">
        <span className="block font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1 mb-1.5">Crime Key</span>
        <div className="flex items-center gap-2 font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          <span>Cyber Crime</span>
        </div>
        <div className="flex items-center gap-2 font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-600" />
          <span>Theft</span>
        </div>
        <div className="flex items-center gap-2 font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-red-650" />
          <span>Organized Crime</span>
        </div>
        <div className="flex items-center gap-2 font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-600" />
          <span>Financial Fraud</span>
        </div>
      </div>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
