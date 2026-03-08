import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import { Filter, Car, Phone, MapPin, Users, Hammer, AlertCircle, ExternalLink, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── FIX: Leaflet default icon broken by Vite ───────────────────────────────
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerIcon2xPng from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIconPng,
    iconRetinaUrl: markerIcon2xPng,
    shadowUrl: markerShadowPng,
});

// Custom colored circle icons
const makeIcon = (color, label, shadowColor = 'rgba(0,0,0,0.2)') => L.divIcon({
    className: '',
    html: `<div style="
        background:${color};
        border: 2px solid white;
        border-radius: 12px 12px 12px 0;
        width: 32px; height: 32px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 3px 8px ${shadowColor};
        font-size: 16px;
        transform: rotate(-45deg);
    ">
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
        if (points.length > 0) {
            map.fitBounds(points, { padding: [50, 50], maxZoom: 14 });
        }
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
    const [taskCity, setTaskCity] = useState('');
    const [taskStatus, setTaskStatus] = useState('');
    const [taskUrgency, setTaskUrgency] = useState('');

    useEffect(() => {
        const load = async () => {
            const { data: vData } = await supabase.from('volunteers').select('*').not('lat', 'is', null).range(0, 2999);
            const { data: tData } = await supabase.from('tasks').select('*').not('lat', 'is', null).range(0, 1999);
            if (vData) setVolunteers(vData);
            if (tData) setTasks(tData);
        };
        load();
    }, []);

    const volCities = useMemo(() => [...new Set(volunteers.map(v => v.city).filter(Boolean))].sort(), [volunteers]);
    const taskCities = useMemo(() => [...new Set(tasks.map(t => t.city).filter(Boolean))].sort(), [tasks]);

    // Apply jitter to markers that are on top of each other
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
        return true;
    });

    const filteredTasks = jitteredTasks.filter(t => {
        if (taskCity && t.city !== taskCity) return false;
        if (taskStatus && t.status !== taskStatus) return false;
        if (taskUrgency && t.urgency !== taskUrgency) return false;
        return true;
    });

    const FilterBox = ({ title, children }) => (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Filter size={14} /> {title}
            </h4>
            <div className="grid grid-cols-2 gap-2">
                {children}
            </div>
        </div>
    );

    const selectStyle = "w-full border border-gray-100 rounded-lg py-2 px-3 text-xs bg-gray-50 outline-none focus:ring-1 focus:ring-primary/30";

    return (
        <div className="flex flex-col lg:flex-row h-full gap-4 animate-in fade-in duration-500" style={{ minHeight: '82vh' }}>
            {/* Sidebar Filters */}
            <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0 overflow-y-auto max-h-[82vh] pr-1">
                <div className="bg-white rounded-2xl border border-primary/20 p-5 shadow-sm space-y-1">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">שליטה ומפה</h2>
                    <p className="text-xs text-gray-500 font-bold">מציג נתוני שטח בזמן אמת</p>
                </div>

                <FilterBox title="מסנני משימות">
                    <select value={taskCity} onChange={e => setTaskCity(e.target.value)} className={selectStyle}>
                        <option value="">כל הערים</option>
                        {taskCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={taskUrgency} onChange={e => setTaskUrgency(e.target.value)} className={selectStyle}>
                        <option value="">כל הדחיפויות</option>
                        <option value="emergency">🔴 חירום</option>
                        <option value="high">גבוהה</option>
                        <option value="medium">בינונית</option>
                        <option value="low">נמוכה</option>
                    </select>
                    <select value={taskStatus} onChange={e => setTaskStatus(e.target.value)} className={selectStyle}>
                        <option value="">כל הסטטוסים</option>
                        <option value="open">פתוחה</option>
                        <option value="assigning">בשיבוץ</option>
                        <option value="full">מלאה</option>
                        <option value="completed">הושלמה</option>
                    </select>
                    <button onClick={() => setShowTasks(!showTasks)} className={`w-full py-2 rounded-lg text-xs font-black border transition-all ${showTasks ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                        {showTasks ? 'הסתר משימות' : 'הצג משימות'}
                    </button>
                </FilterBox>

                <FilterBox title="מסנני מתנדבים">
                    <select value={volCity} onChange={e => setVolCity(e.target.value)} className={selectStyle}>
                        <option value="">כל הערים</option>
                        {volCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={volType} onChange={e => setVolType(e.target.value)} className={selectStyle}>
                        <option value="">סוג (הכל)</option>
                        <option value="individual">יחידים</option>
                        <option value="group">קבוצות</option>
                    </select>
                    <select value={volStatus} onChange={e => setVolStatus(e.target.value)} className={selectStyle}>
                        <option value="">כל הסטטוסים</option>
                        <option value="available">פנוי</option>
                        <option value="assigned">בפעילות</option>
                        <option value="busy">לא זמין</option>
                    </select>
                    <button onClick={() => setShowVols(!showVols)} className={`w-full py-2 rounded-lg text-xs font-black border transition-all ${showVols ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                        {showVols ? 'הסתר מתנדבים' : 'הצג מתנדבים'}
                    </button>
                    <label className="col-span-2 flex items-center justify-center gap-2 p-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <input type="checkbox" checked={volCar} onChange={e => setVolCar(e.target.checked)} className="rounded text-primary" />
                        <span className="text-xs font-bold text-gray-700">רק מתנדבים עם רכב</span>
                    </label>
                </FilterBox>

                <div className="bg-gray-900 rounded-2xl p-5 text-white">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-gray-400">סטטיסטיקת מפה</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-2xl font-black">{filteredTasks.length}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase">משימות</div>
                        </div>
                        <div>
                            <div className="text-2xl font-black">{filteredVols.length}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase">מתנדבים</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 rounded-3xl overflow-hidden shadow-2xl border-4 border-white relative z-0">
                <MapContainer center={[31.5, 34.8]} zoom={8} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    <FitBounds volunteers={filteredVols} tasks={filteredTasks} />

                    {/* Task markers */}
                    {showTasks && filteredTasks.map(t => (
                        <Marker key={t.id} position={[t.lat, t.lng]} icon={taskIconFn(t.urgency)}>
                            <Popup>
                                <div className="text-right p-1 min-w-[220px]" dir="rtl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0"><AlertCircle size={18} /></div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-sm text-gray-900 truncate">{t.name}</h3>
                                            <p className="text-[10px] text-gray-500 font-bold">{t.type}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-xs text-gray-600 mb-4 border-b border-gray-50 pb-2">
                                        <div className="flex items-center gap-1.5"><MapPin size={12} className="text-gray-400" /> {t.address}, {t.city}</div>
                                        <div className="flex items-center gap-1.5"><Hammer size={12} className="text-gray-400" /> דחיפות: {t.urgency}</div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${t.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}> {t.status === 'open' ? 'פתוחה' : 'בטיפול'} </div>
                                        <button onClick={() => navigate(`/tasks?id=${t.id}`)} className="flex items-center gap-1 text-[10px] font-black text-primary hover:underline">
                                            מעבר לניהול משימה <ExternalLink size={10} />
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Volunteer markers */}
                    {showVols && filteredVols.map(v => (
                        <Marker key={v.id} position={[v.lat, v.lng]} icon={v.volunteer_type === 'group' ? groupIcon : volIcon}>
                            <Popup>
                                <div className="text-right p-1 min-w-[220px]" dir="rtl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${v.volunteer_type === 'group' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                            <Users size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-sm text-gray-900 truncate">{v.volunteer_type === 'group' ? v.group_name : v.full_name}</h3>
                                            <p className="text-[10px] text-gray-500 font-bold">{v.volunteer_type === 'group' ? `קבוצה (${v.group_size} איש)` : `מתנדב יחיד (גיל ${v.age || '?'})`}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-xs text-gray-600 mb-4 border-b border-gray-50 pb-2">
                                        <div className="flex items-center gap-1.5"><Phone size={12} className="text-gray-400" /> <span dir="ltr">{v.volunteer_type === 'group' ? v.contact_phone : v.phone}</span></div>
                                        <div className="flex items-center gap-1.5"><MapPin size={12} className="text-gray-400" /> {v.city}</div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${v.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}> {v.status === 'available' ? 'פנוי' : 'בפעילות'} </div>
                                        <button onClick={() => navigate(`/volunteers?id=${v.id}`)} className="flex items-center gap-1 text-[10px] font-black text-primary hover:underline">
                                            מעבר לכרטיס מתנדב <ExternalLink size={10} />
                                        </button>
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
