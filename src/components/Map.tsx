'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ArrowUpRight, Crosshair, Minus, Plus, Zap, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { directions, standard, type Station } from '@/lib/stations';

const markerIcon = (fast: boolean, active: boolean) => L.divIcon({
  className: 'station-marker',
  html: `<svg width="${active ? 36 : 27}" height="${active ? 42 : 33}" viewBox="0 0 30 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 34s12-13 12-21A12 12 0 0 0 3 13c0 8 12 21 12 21Z" fill="${fast ? '#c5f36b' : '#68bfa7'}" stroke="#16221c" stroke-width="2"/><path d="m16 6-7 9h5l-1 7 8-10h-5l1-6Z" fill="#142119"/></svg>`,
  iconSize: active ? [36,42] : [27,33], iconAnchor: active ? [18,42] : [13.5,33], popupAnchor: [0,-32],
});
const icons = { fast: markerIcon(true,false), ac: markerIcon(false,false), activeFast: markerIcon(true,true), activeAc: markerIcon(false,true) };
const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY;
const cartoUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

function MapControls({ resetKey }: { resetKey: number }) {
  const map = useMap();
  const initial = useRef(true);
  const [message, setMessage] = useState('');
  useEffect(() => { if (initial.current) { initial.current = false; return; } map.closePopup(); map.flyTo([12.8797,121.7740],6); }, [resetKey,map]);
  function locate() {
    if (!navigator.geolocation) { setMessage('Location is unavailable in this browser.'); return; }
    setMessage('Finding your location…');
    navigator.geolocation.getCurrentPosition(({coords}) => { map.flyTo([coords.latitude,coords.longitude],11); setMessage('Map centered on your location.'); }, () => setMessage('Location unavailable. Allow location access and try again.'));
  }
  return <div className="map-tools"><div className="zoom-group"><button aria-label="Zoom in" onClick={() => map.zoomIn()}><Plus size={18}/></button><button aria-label="Zoom out" onClick={() => map.zoomOut()}><Minus size={18}/></button></div><button className="locate" aria-label="Find my location" onClick={locate}><Crosshair size={18}/></button>{message && <div className="location-message" role="status" onClick={() => setMessage('')}>{message}</div>}</div>;
}

function StationPin({ station, selected, onSelect }: { station: Station; selected: boolean; onSelect: (id: number) => void }) {
  const ref = useRef<L.Marker>(null);
  const map = useMap();
  useEffect(() => { if (selected) { map.flyTo([station.latitude,station.longitude], Math.max(map.getZoom(),11), {duration:1}); ref.current?.openPopup(); } else { ref.current?.closePopup(); } }, [selected,map,station.latitude,station.longitude]);
  return <Marker ref={ref} position={[station.latitude,station.longitude]} icon={selected ? (station.is_dc_fast ? icons.activeFast : icons.activeAc) : (station.is_dc_fast ? icons.fast : icons.ac)} eventHandlers={{click: () => onSelect(station.id)}} title={station.title} alt={station.title}>
    <Popup minWidth={265} maxWidth={300}>
      <div className="station-popup"><div className="popup-eyebrow"><span className={station.is_dc_fast ? 'fast-dot' : 'ac-dot'}/>{station.is_dc_fast ? 'DC FAST CHARGING' : 'STANDARD CHARGING'}</div><h3>{station.title}</h3><span className="operator-badge">{station.operator}</span><div className="popup-address"><MapPin size={15}/><p>{station.address}<br/>{[station.town,station.state].filter(Boolean).join(', ')}</p></div><div className="popup-connections">{station.connections.map((c,i) => <div key={i}><span><Zap size={13}/>{standard(c.title) === 'Unknown' ? 'Plug unspecified' : standard(c.title)}</span><strong>{c.power_kw ? `${c.power_kw} kW` : 'Power unspecified'}</strong></div>)}</div><a className="directions-link" href={directions(station)} target="_blank" rel="noopener noreferrer">Get directions <ArrowUpRight size={17}/></a></div>
    </Popup>
  </Marker>;
}

export default function Map({ stations, selectedId, onSelect, resetKey }: { stations: Station[]; selectedId: number | null; onSelect: (id: number) => void; resetKey: number }) {
  const [tileError, setTileError] = useState(false);
  return <><MapContainer center={[12.8797,121.7740]} zoom={6} minZoom={3} maxZoom={19} zoomControl={false} className="leaflet-map">
    <TileLayer className={cartoKey ? 'carto-tiles' : 'osm-dark-tiles'} url={cartoKey ? `${cartoUrl}?key=${encodeURIComponent(cartoKey)}` : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'} attribution={cartoKey ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'} eventHandlers={{tileerror: () => setTileError(true), tileload: () => setTileError(false)}}/>
    {stations.map(station => <StationPin key={station.id} station={station} selected={selectedId === station.id} onSelect={onSelect}/>)}
    <MapControls resetKey={resetKey}/>
  </MapContainer>{tileError && <div className="tile-error" role="status">Map tiles unavailable. Check your connection; station details remain accessible in the list.</div>}</>;
}
