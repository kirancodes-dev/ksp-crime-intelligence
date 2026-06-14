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
}

export const HotspotMap: React.FC<HotspotMapProps> = ({ incidents, onFirSelect }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.FeatureGroup | null>(null);

  // Dynamic colors based on crime type
  const getCrimeColor = (crimeType: string) => {
    switch (crimeType) {
      case 'Cyber Crime':
        return '#3b82f6'; // Blue
      case 'Theft':
        return '#f97316'; // Orange
      case 'Organized Crime':
        return '#ef4444'; // Red
      case 'Financial Fraud':
        return '#eab308'; // Yellow
      default:
        return '#10b981'; // Emerald
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

      // 2. Add CartoDB Dark Matter tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
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
        popupContent.className = "p-1 font-sans text-xs";
        popupContent.innerHTML = `
          <div class="font-bold text-sm text-white border-b border-slate-800 pb-1 mb-2 flex justify-between items-center gap-4">
            <span class="text-brand-primary cursor-pointer hover:underline" id="popup-fir-${inc.fir_number}">${inc.fir_number}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">${inc.area_type}</span>
          </div>
          <div class="space-y-1.5 text-slate-300">
            <div><span class="text-slate-500 font-medium">Type:</span> <strong class="text-white">${inc.crime_type}</strong></div>
            <div><span class="text-slate-500 font-medium">District:</span> <span>${inc.district}</span></div>
            <div><span class="text-slate-500 font-medium">Station:</span> <span>${inc.district.split(' ')[0]} Town PS</span></div>
            <div><span class="text-slate-500 font-medium">Date:</span> <span>${inc.date_reported}</span></div>
            <div class="pt-1 border-t border-slate-800/40 text-slate-400"><span class="text-slate-500 font-medium">Location:</span> ${inc.address}</div>
          </div>
        `;

        // Add callback on click inside popup
        popupContent.querySelector(`#popup-fir-${inc.fir_number}`)?.addEventListener('click', (e) => {
          e.preventDefault();
          if (onFirSelect) {
            onFirSelect(inc.fir_number);
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
      // We do not destroy the map instance completely on fast redraws, just clear layers
      // to maintain panning performance, but on full component unmount we destroy:
    };
  }, [incidents, onFirSelect]);

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
    <div className="relative w-full h-96 min-h-[400px] rounded-lg overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
      <div className="absolute top-4 right-4 z-[1000] card-panel rounded-lg p-3 text-[10px] text-slate-300 border border-slate-800 space-y-1.5">
        <span className="block font-bold uppercase tracking-wider text-white border-b border-slate-850 pb-1 mb-1.5">Crime Key</span>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          <span>Cyber Crime</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
          <span>Theft</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span>Organized Crime</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
          <span>Financial Fraud</span>
        </div>
      </div>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
