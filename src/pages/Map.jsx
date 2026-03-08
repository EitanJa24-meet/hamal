import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import { Filter, Car, Phone, MapPin, Users, Hammer, AlertCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRIORITY_CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'עוטף עזה', 'גבול הצפון', 'שדרות', 'אשקלון'];

// ─── FIX: Leaflet default icon ─────────────────────────────────────────────
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerIcon2xPng from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIconPng,
    iconRetinaUrl: markerIcon2xPng,
    shadowUrl: markerShadowPng,
});

const makeIcon = (color, label, shadowColor = 'rgba(0,0,0,0.2)') => L.divIcon({
    className: '',
    html: `<div style="background:${color};border:2px solid white;border-radius:12px 12px 12px 0;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px ${shadowColor};font-size:16px;transform:rotate(-45deg);">
        <div style="transform: rotate(45deg);">${label}</div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

const volIcon = makeIcon('#3b82f6', '👤');
const groupIcon = makeIcon('#f59e0b', '👥', 'rgba(245,158,11,0.3)');
const taskIconFn = (urgency) => {
    const colors = { emergency: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
    return makeIcon(colors[urgency] || '#3b82f6', '📍');
};

const FitBounds = ({ volunteers, tasks }) => {
    const map = useMap();
    useEffect(() => {
        const points = [
            ...volunteers.filter(v => v.lat && v.lng).map(v => [v.lat, v.lng]),
            ...tasks.filter(t => t.lat && t.lng).map(t => [t.lat, t.lng]),
        ];
        if (points.length > 0) map.fitBounds(points, { padding: [50, 50], maxZoom: 14 });
    }, [volunteers, tasks]);
    return null;
};

const MapView = () => {
    const navigate = useNavigate();
    const [volunteers, setVolunteers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [showVols, setShowVols] = useState(true);
    const [showTasks, setShowTasks] = useState(true);

    // Filters
    const [volCity, setVolCity] = useState('');
    const [volStatus, setVolStatus] = useState('');
    const [volType, setVolType] = useState('');
    const [volCar, setVolCar] = useState(false);
    const [volGender, setVolGender] = useState('');
    const [taskCity, setTaskCity] = useState('');
    const [taskStatus, setTaskStatus] = useState('');
    const [taskUrgency, setTaskUrgency] = useState('');

    const fetchAll = async (table) => {
        let all = [];
        let from = 0;
        let finished = false;
        while (!finished) {
            const { data, error } = await supabase.from(table).select('*').not('lat', 'is', null).range(from, from + 999);
            if (error || !data || data.length === 0) finished = true;
            else {
                all = [...all, ...data];
                if (data.length < 1000) finished = true;
                else from += 1000;
            }
        }
        return all;
    };

    useEffect(() => {
        fetchAll('volunteers').then(setVolunteers);
        fetchAll('tasks').then(setTasks);
    }, []);

    const volCities = useMemo(() => {
        const raw = [...new Set(volunteers.map(v => v.city).filter(Boolean))].sort();
        return [...PRIORITY_CITIES.filter(pc => raw.includes(pc)), ...raw.filter(r => !PRIORITY_CITIES.includes(r))];
    }, [volunteers]);

    const taskCities = useMemo(() => {
        const raw = [...new Set(tasks.map(t => t.city).filter(Boolean))].sort();
        return [...PRIORITY_CITIES.filter(pc => raw.includes(pc)), ...raw.filter(r => !PRIORITY_CITIES.includes(r))];
    }, [tasks]);

    const jitteredVols = useMemo(() => {
        const coordsMap = {};
        return volunteers.map(v => {
            const key = `${v.lat.toFixed(4)},${v.lng.toFixed(4)}`;
            const count = coordsMap[key] || 0;
            coordsMap[key] = count + 1;
            if (count > 0) {
                const angle = (count * 137.5) * (Math.PI / 180);
                const radius = 0.0005 * Math.sqrt(count);
                return { ...v, lat: v.lat + radius * Math.cos(angle), lng: v.lng + radius * Math.sin(angle) };
            }
            return v;
        });
    }, [volunteers]);

    const jitteredTasks = useMemo(() => {
        const coordsMap = {};
        return tasks.map(t => {
            const key = `${t.lat.toFixed(4)},${t.lng.toFixed(4)}`;
            const count = coordsMap[key] || 0;
            coordsMap[key] = count + 1;
            if (count > 0) {
                const angle = (count * 137.5) * (Math.PI / 180);
                const radius = 0.0006 * Math.sqrt(count);
                return { ...t, lat: t.lat + radius * Math.cos(angle), lng: t.lng + radius * Math.sin(angle) };
            }
            return t;
        });
    }, [tasks]);

    const filteredVols = jitteredVols.filter(v => {
        if (volCity && v.city !== volCity) return false;
        if (volStatus && v.status !== volStatus) return false;
        if (volType && v.volunteer_type !== volType) return false;
        if (volCar && !v.has_car) return false;
        if (volGender && v.gender !== volGender) return false;
        return true;
    });

    const filteredTasks = jitteredTasks.filter(t => {
        if (taskCity && t.city !== taskCity) return false;
        if (taskStatus && t.status !== taskStatus) return false;
        if (taskUrgency && t.urgency !== taskUrgency) return false;
        return true;
    });

    const FilterBox = ({ title, children }) => (
        <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm space-y-2">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Filter size={12} /> {title}</h4>
            <div className="grid grid-cols-2 gap-1.5">{children}</div>
        </div>
    );

    const selectStyle = "w-full border border-gray-100 rounded-lg py-1.5 px-2 text-[11px] bg-gray-50 outline-none";

    return (
        <div className="flex flex-col lg:flex-row h-full gap-4 animate-in fade-in duration-500" style={{ minHeight: '82vh' }}>
            <div className="w-full lg:w-72 flex flex-col gap-3 shrink-0 overflow-y-auto max-h-[82vh] pr-1">
                <div className="bg-white rounded-2xl border border-primary/20 p-4 shadow-sm">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">מפה וחמ"ל</h2>
                </div>

                <FilterBox title="משימות">
                    <select value={taskCity} onChange={e => setTaskCity(e.target.value)} className={selectStyle}>
                        <option value="">כל האזורים</option>
                        <optgroup label="חשובים">{PRIORITY_CITIES.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>
                        <optgroup label="אחרים">{taskCities.filter(c => !PRIORITY_CITIES.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}</optgroup>
                    </select>
                    <select value={taskUrgency} onChange={e => setTaskUrgency(e.target.value)} className={selectStyle}>
                        <option value="">דחיפות</option>
                        <option value="emergency">🔴 חירום</option>
                        <option value="high">גבוהה</option>
                    </select>
                    <button onClick={() => setShowTasks(!showTasks)} className={`w-full py-1.5 rounded-lg text-[10px] font-black border ${showTasks ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-100 text-gray-400 border-gray-50'}`}>
                        {showTasks ? 'משימות: ON' : 'משימות: OFF'}
                    </button>
                </FilterBox>

                <FilterBox title="מתנדבים">
                    <select value={volCity} onChange={e => setVolCity(e.target.value)} className={selectStyle}>
                        <option value="">כל האזורים</option>
                        <optgroup label="חשובים">{PRIORITY_CITIES.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>
                        <optgroup label="אחרים">{volCities.filter(c => !PRIORITY_CITIES.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}</optgroup>
                    </select>
                    <select value={volGender} onChange={e => setVolGender(e.target.value)} className={selectStyle}>
                        <option value="">מגדר</option>
                        <option value="זכר">זכר</option>
                        <option value="נקבה">נקבה</option>
                    </select>
                    <select value={volType} onChange={e => setVolType(e.target.value)} className={selectStyle}>
                        <option value="">סוג</option>
                        <option value="individual">יחידים</option>
                        <option value="group">קבוצות</option>
                    </select>
                    <button onClick={() => setShowVols(!showVols)} className={`w-full py-1.5 rounded-lg text-[10px] font-black border ${showVols ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-100 text-gray-400 border-gray-50'}`}>
                        {showVols ? 'מתנדבים: ON' : 'מתנדבים: OFF'}
                    </button>
                    <label className="col-span-2 flex items-center justify-center gap-2 p-1.5 bg-gray-50 rounded-xl cursor-pointer">
                        <input type="checkbox" checked={volCar} onChange={e => setVolCar(e.target.checked)} className="rounded" />
                        <span className="text-[10px] font-bold">רק עם רכב</span>
                    </label>
                </FilterBox>
            </div>

            <div className="flex-1 rounded-3xl overflow-hidden shadow-2xl border-4 border-white relative z-0">
                <MapContainer center={[31.5, 34.8]} zoom={8} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    <FitBounds volunteers={filteredVols} tasks={filteredTasks} />
                    {showTasks && filteredTasks.map(t => (
                        <Marker key={t.id} position={[t.lat, t.lng]} icon={taskIconFn(t.urgency)}>
                            <Popup><div className="text-right p-1" dir="rtl"><h3 className="font-black text-sm">{t.name}</h3><p className="text-xs text-gray-500 mb-2">{t.address}, {t.city}</p><button onClick={() => navigate(`/tasks?id=${t.id}`)} className="text-[10px] font-black text-primary underline">ניהול משימה</button></div></Popup>
                        </Marker>
                    ))}
                    {showVols && filteredVols.map(v => (
                        <Marker key={v.id} position={[v.lat, v.lng]} icon={v.volunteer_type === 'group' ? groupIcon : volIcon}>
                            <Popup><div className="text-right p-1" dir="rtl"><h3 className="font-black text-sm">{v.volunteer_type === 'group' ? v.group_name : v.full_name}</h3><p className="text-xs text-gray-500 mb-2">{v.gender} · {v.city}</p><button onClick={() => navigate(`/volunteers?id=${v.id}`)} className="text-[10px] font-black text-primary underline">כרטיס מתנדב</button></div></Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};

export default MapView;
