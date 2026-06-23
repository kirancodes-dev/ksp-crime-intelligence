import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Phone, AlertTriangle, Layers } from 'lucide-react';

interface Breadcrumb {
  id: number;
  lat: number;
  lng: number;
  time: string;
  tower: string;
}

interface CollisionAlert {
  fir_number: string;
  incident_time: string;
  distance_meters: number;
  tower_id: string;
  severity: string;
}

interface CdrData {
  suspect: string;
  phone: string;
  imei: string;
  carrier: string;
  breadcrumbs: Breadcrumb[];
  collisionAlerts: CollisionAlert[];
}

interface CdrTimelineMapProps {
  data: CdrData;
  mapId: string;
}

export const CdrTimelineMap: React.FC<CdrTimelineMapProps> = ({ data, mapId }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not already done
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: [12.9716, 77.5946],
        zoom: 12,
        zoomControl: true,
        attributionControl: false
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear previous layers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (data.breadcrumbs && data.breadcrumbs.length > 0) {
      const coords = data.breadcrumbs.map(b => [b.lat, b.lng] as [number, number]);

      // Draw dashed trajectory path polyline
      polylineRef.current = L.polyline(coords, {
        color: '#2563eb',
        weight: 3,
        dashArray: '5, 8',
        opacity: 0.8
      }).addTo(map);

      // Plot markers for tower locations
      data.breadcrumbs.forEach((b, idx) => {
        const isActive = idx === activeIndex;
        const markerColor = isActive ? '#ef4444' : '#3b82f6';
        
        const marker = L.circleMarker([b.lat, b.lng], {
          radius: isActive ? 10 : 6,
          fillColor: markerColor,
          fillOpacity: 0.9,
          color: '#ffffff',
          weight: 2
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 11px; color: #1e293b; line-height: 1.4;">
            <strong style="color: #0f172a; font-size: 12px;">${b.tower}</strong><br/>
            📍 Lat/Lng: ${b.lat.toFixed(4)}, ${b.lng.toFixed(4)}<br/>
            ⏰ Ping Time: ${b.time}
          </div>
        `);
        
        markersRef.current.push(marker);
      });

      // Adjust map bounds to fit track
      try {
        const bounds = L.latLngBounds(coords);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      } catch (err) {
        console.error(err);
      }
    }

    // Adjust focus on active index marker change
    if (data.breadcrumbs && data.breadcrumbs[activeIndex]) {
      const activePoint = data.breadcrumbs[activeIndex];
      map.panTo([activePoint.lat, activePoint.lng]);
      markersRef.current[activeIndex]?.openPopup();
    }
  }, [data, activeIndex]);

  // Handle map instance removal on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Layers className="text-brand-primary h-5 w-5" />
          <h4 className="font-bold text-sm uppercase tracking-wider text-slate-200">
            CDR Trajectory map & Proximity Timeline
          </h4>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-850 px-2 py-0.5 rounded border border-slate-700 text-[10px] text-slate-400 font-bold uppercase">
          <Phone size={10} className="text-brand-primary animate-pulse" />
          <span>{data.carrier}</span>
        </div>
      </div>

      {/* Trajectory Details */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 bg-slate-950/45 p-3 rounded-lg border border-slate-800 text-xs">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase">Suspect Target</span>
          <div className="font-bold text-slate-200">{data.suspect}</div>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase">Mobile Number</span>
          <div className="font-bold text-slate-200 font-mono">{data.phone}</div>
        </div>
        <div className="col-span-2 md:col-span-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase">IMEI Registry ID</span>
          <div className="font-bold text-slate-300 font-mono">{data.imei}</div>
        </div>
      </div>

      {/* Collision Alerts Panel */}
      {data.collisionAlerts && data.collisionAlerts.length > 0 && (
        <div className="mb-4 bg-red-950/20 border border-red-900/40 rounded-lg p-3 text-xs flex gap-2.5 items-start">
          <AlertTriangle className="text-red-400 h-5 w-5 shrink-0" />
          <div>
            <div className="font-bold text-red-400">⚠️ Proximity Crime Hotspot Overlap Flagged</div>
            {data.collisionAlerts.map((alert, idx) => (
              <p key={idx} className="text-slate-300 mt-1">
                Suspect device was located <span className="font-bold text-red-300">{alert.distance_meters}m</span> from incident location for <span className="font-bold text-slate-200">{alert.fir_number}</span> at <span className="font-bold text-slate-200">{alert.incident_time}</span> (Tower: {alert.tower_id}).
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Map view */}
      <div 
        ref={mapContainerRef} 
        id={mapId}
        className="w-full h-[250px] bg-slate-950 rounded-lg border border-slate-800 mb-4 overflow-hidden relative z-10" 
      />

      {/* Breadcrumbs Interactive Slider Timeline */}
      {data.breadcrumbs && data.breadcrumbs.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-400">Chronological Tower Pings ({data.breadcrumbs.length})</span>
            <span className="text-brand-primary font-bold">
              Active: {data.breadcrumbs[activeIndex].time} - {data.breadcrumbs[activeIndex].tower}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input 
              type="range" 
              min={0} 
              max={data.breadcrumbs.length - 1} 
              value={activeIndex} 
              onChange={(e) => setActiveIndex(parseInt(e.target.value))} 
              className="flex-1 accent-brand-primary bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-4 gap-1">
            {data.breadcrumbs.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`py-1 rounded text-[10px] font-bold border transition ${
                  idx === activeIndex
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-800'
                }`}
              >
                Ping #{idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
