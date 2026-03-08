import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import { Filter, Car, Phone, MapPin } from 'lucide-react';

// ─── FIX: Leaflet default icon broken by Vite's asset processing ─────────────
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerIcon2xPng from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIconPng,
    iconRetinaUrl: markerIcon2xPng,
    shadowUrl: markerShadowPng,
});
// ─────────────────────────────────────────────────────────────────────────────

// Custom colored circle icons
const makeIcon = (color, label) => L.divIcon({
    className: '',
    html: `<div style="
        background:${color};
        border: 2.5px solid white;
        border-radius: 50%;
        width: 28px; height: 28px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        font-size: 14px;
    ">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
});

const volIcon = makeIcon('#7e9ceb', '👤');
const taskIconFn = (urgency) => {
    const colors = { emergency: '#e88b8b', high: '#f4a261', medium: '#f4d160', low: '#a8d8a8' };
    return makeIcon(colors[urgency] || '#e88b8b', '📋');
};

// Fit map bounds to markers
const FitBounds = ({ volunteers, tasks }) => {
    const map = useMap();
    useEffect(() => {
        const points = [
            ...volunteers.filter(v => v.lat && v.lng).map(v => [v.lat, v.lng]),
            ...tasks.filter(t => t.lat && t.lng).map(t => [t.lat, t.lng]),
        ];
        if (points.length > 0) {
            map.fitBounds(points, { padding: [40, 40], maxZoom: 13 });
        }
    }, [volunteers, tasks]);
    return null;
};

const MapView = () => {
    const [volunteers, setVolunteers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [showVols, setShowVols] = useState(true);
    const [showTasks, setShowTasks] = useState(true);
    const [filterCity, setFilterCity] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterUrgency, setFilterUrgency] = useState('');
    const [filterCar, setFilterCar] = useState(false);

    useEffect(() => {
        const load = async () => {
            const { data: vData } = await supabase.from('volunteers').select('*').not('lat', 'is', null);
            const { data: tData } = await supabase.from('tasks').select('*').not('lat', 'is', null);
            if (vData) setVolunteers(vData);
            if (tData) setTasks(tData);
        };
        load();
    }, []);

    const cities = [...new Set(volunteers.map(v => v.city).filter(Boolean))].sort();

    const filteredVols = volunteers.filter(v => {
        if (filterCity && v.city !== filterCity) return false;
        if (filterStatus && v.status !== filterStatus) return false;
        if (filterCar && !v.has_car) return false;
        return true;
    });

    const filteredTasks = tasks.filter(t => {
        if (filterStatus && t.status !== filterStatus) return false;
        if (filterUrgency && t.urgency !== filterUrgency) return false;
        return true;
    });

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500" style={{ minHeight: '80vh' }}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">מפת שליטה בזמן אמת</h2>
                    <p className="text-gray-500 mt-1">
                        <span className="font-medium text-blue-600">{filteredVols.length} מתנדבים</span>
                        {' · '}
                        <span className="font-medium text-red-500">{filteredTasks.length} משימות</span>
                    </p>
                </div>
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 text-gray-500 font-semibold text-sm pl-2 border-l border-gray-200">
                    <Filter size={15} className="text-primary" /> סינון מפה
                </div>

                {/* Toggle layers */}
                <button
                    onClick={() => setShowVols(!showVols)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${showVols ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-400 border-gray-200'}`}
                >
                    👤 מתנדבים
                </button>
                <button
                    onClick={() => setShowTasks(!showTasks)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${showTasks ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white text-gray-400 border-gray-200'}`}
                >
                    📋 משימות
                </button>

                <div className="w-px h-6 bg-gray-200" />

                {/* City filter */}
                <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white">
                    <option value="">כל הערים</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Vol status filter */}
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white">
                    <option value="">כל הסטטוסים</option>
                    <option value="available">פנוי</option>
                    <option value="assigned">בפעילות</option>
                    <option value="busy">לא זמין</option>
                </select>

                {/* Task urgency filter */}
                <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white">
                    <option value="">כל הדחיפויות</option>
                    <option value="emergency">🔴 חירום</option>
                    <option value="high">גבוהה</option>
                    <option value="medium">בינונית</option>
                    <option value="low">נמוכה</option>
                </select>

                {/* Car filter */}
                <label className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-600 font-medium">
                    <input type="checkbox" checked={filterCar} onChange={e => setFilterCar(e.target.checked)} className="rounded" />
                    <Car size={14} /> רק עם רכב
                </label>
            </div>

            {/* Map */}
            <div className="flex-1 rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-gray-100" style={{ minHeight: '520px' }}>
                <MapContainer
                    center={[31.5, 34.8]}
                    zoom={8}
                    style={{ height: '100%', width: '100%', minHeight: '520px' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />

                    <FitBounds volunteers={filteredVols} tasks={filteredTasks} />

                    {/* Task markers */}
                    {showTasks && filteredTasks.map(t => (
                        <Marker key={t.id} position={[t.lat, t.lng]} icon={taskIconFn(t.urgency)}>
                            <Popup>
                                <div className="text-right min-w-[180px]" dir="rtl">
                                    <h3 className="font-bold text-base mb-1">{t.name || t.type}</h3>
                                    {t.description && <p className="text-gray-500 text-sm mb-2">{t.description}</p>}
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-md font-semibold">{t.urgency}</span>
                                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md">{t.status}</span>
                                    </div>
                                    <div className="text-sm text-gray-600 flex items-center gap-1"><MapPin size={12} /> {t.address}, {t.city}</div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Volunteer markers */}
                    {showVols && filteredVols.map(v => (
                        <Marker key={v.id} position={[v.lat, v.lng]} icon={volIcon}>
                            <Popup>
                                <div className="text-right min-w-[180px]" dir="rtl">
                                    <h3 className="font-bold text-base mb-1">{v.full_name} {v.age && `(${v.age})`}</h3>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <div className="flex items-center gap-1"><Phone size={12} /> <span dir="ltr">{v.phone}</span></div>
                                        <div className="flex items-center gap-1"><MapPin size={12} /> {v.address}, {v.city}</div>
                                        <div className="flex items-center gap-1"><Car size={12} /> {v.has_car ? '✓ יש רכב' : 'ללא רכב'}</div>
                                    </div>
                                    {v.skills && v.skills.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {v.skills.map(s => <span key={s} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-md">{s}</span>)}
                                        </div>
                                    )}
                                    <div className={`mt-2 text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${v.status === 'available' ? 'bg-emerald-100 text-emerald-700' : v.status === 'busy' ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-700'}`}>
                                        {v.status === 'available' ? 'פנוי לשיבוץ' : v.status === 'busy' ? 'לא זמין' : 'בפעילות'}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};

export default MapView;
