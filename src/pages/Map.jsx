import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import { Filter, Car, Phone, MapPin, Users, Hammer, AlertCircle, ExternalLink, Search, User, Briefcase, Star, Info, CheckCircle2, History } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const PRIORITY_CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'שדרות', 'אשקלון'];
const SKILLS = ['בייביסיטר', 'עזרה לקשישים', 'ניקיון', 'לוגיסטיקה', 'חלוקת אוכל', 'ניקוי רסיסים', 'עזרה כללית', 'הסעות'];

// ─── Leaflet Icon Fix ──────────────────────────────────────────────────────
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerIcon2xPng from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIconPng,
    iconRetinaUrl: markerIcon2xPng,
    shadowUrl: markerShadowPng,
});

// Premium Map Icons
const createIcon = (color, label, shadowColor = 'rgba(0,0,0,0.15)') => L.divIcon({
    className: 'custom-map-icon',
    html: `<div style="background: ${color};border: 2px solid white;border-radius: 50% 50% 50% 0;width:34px;height:34px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px ${shadowColor};font-size:16px;transform:rotate(-45deg);transition:transform 0.2s ease;"><div style="transform: rotate(45deg);">${label}</div></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
});

const volIconFn = (v) => {
    const contactColors = {
        'עדין לא נוצר קשר': '#94a3b8', // Gray
        'לא רלוונטי': '#f43f5e',      // Rose
        'מתנדב חוזר': '#8b5cf6',       // Violet
        'רוצה להתנדב': '#3b82f6',      // Blue
    };
    const color = contactColors[v.contact_status] || '#3b82f6';
    const symbol = v.volunteer_type === 'group' ? '👥' : '👤';
    return createIcon(color, symbol);
};

const taskIconFn = (urgency) => {
    const config = {
        emergency: { color: '#ef4444', label: '🔴' },
        high: { color: '#f97316', label: '🟠' },
        medium: { color: '#eab308', label: '🟡' },
    };
    const { color, label } = config[urgency] || config.medium;
    return createIcon(color, label);
};

const MapController = ({ volunteers, tasks, setZoomLevel, focusPoint }) => {
    const map = useMap();
    useMapEvents({ zoomend: () => setZoomLevel(map.getZoom()) });
    useEffect(() => {
        if (focusPoint && focusPoint.lat && focusPoint.lng) {
            map.setView([focusPoint.lat, focusPoint.lng], 14, { animate: true });
            return;
        }
        const points = [
            ...tasks.filter(t => t.lat && t.lng).map(t => [t.lat, t.lng]),
            ...volunteers.filter(v => v.lat && v.lng).map(v => [v.lat, v.lng]),
        ];
        if (points.length > 0) map.fitBounds(points, { padding: [50, 50], maxZoom: 13 });
    }, [tasks, volunteers, map, focusPoint]);
    return null;
};

const IOSSwitch = ({ checked, onChange, color = "bg-primary" }) => (
    <button onClick={() => onChange(!checked)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? color : 'bg-gray-200'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? (document.dir === 'rtl' ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0'}`} />
    </button>
);

const MapView = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [volunteers, setVolunteers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [zoomLevel, setZoomLevel] = useState(8);

    // UI states
    const [showVols, setShowVols] = useState(true);
    const [showTasks, setShowTasks] = useState(true);

    // Deep Filters
    const [volSearch, setVolSearch] = useState('');
    const [volGender, setVolGender] = useState('');
    const [volSkill, setVolSkill] = useState('');
    const [volType, setVolType] = useState('');
    const [volCar, setVolCar] = useState(false);
    const [volStatus, setVolStatus] = useState('available');
    const [volContactStatus, setVolContactStatus] = useState('');

    const [taskSearch, setTaskSearch] = useState('');
    const [taskUrgency, setTaskUrgency] = useState('');
    const [taskStatus, setTaskStatus] = useState('open');

    const fetchAll = async (table) => {
        let allData = [];
        let from = 0;
        let finished = false;
        while (!finished) {
            const { data, error } = await supabase.from(table).select('*').range(from, from + 999);
            if (error || !data || data.length === 0) finished = true;
            else {
                allData = [...allData, ...data];
                if (data.length < 1000) finished = true;
                else from += 1000;
            }
        }
        return allData;
    };

    useEffect(() => {
        // Fetch only basic fields for markers
        supabase.from('volunteers').select('id, full_name, group_name, phone, contact_phone, lat, lng, city, address, volunteer_type, group_size, gender, age, status, contact_status, skills, has_car')
            .not('lat', 'is', null)
            .then(({ data }) => setVolunteers(Array.isArray(data) ? data : []));

        supabase.from('tasks').select('id, name, lat, lng, urgency, status, type, address, city, is_archived')
            .eq('is_archived', false)
            .not('lat', 'is', null)
            .then(({ data }) => setTasks(Array.isArray(data) ? data : []));
    }, []);

    const [selectedVolHistory, setSelectedVolHistory] = useState(null);
    const fetchVolHistory = async (volId) => {
        const { data } = await supabase.from('assignments').select('task_id').eq('volunteer_id', volId);
        if (data && data.length > 0) {
            const taskIds = data.map(a => a.task_id);
            const { data: tData } = await supabase.from('tasks').select('id, name, city').in('id', taskIds);
            setSelectedVolHistory(tData || []);
        } else {
            setSelectedVolHistory([]);
        }
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (taskSearch && !t.name?.toLowerCase().includes(taskSearch.toLowerCase())) return false;
            if (taskUrgency && t.urgency !== taskUrgency) return false;
            if (taskStatus && t.status !== taskStatus) return false;
            return true;
        });
    }, [tasks, taskSearch, taskUrgency, taskStatus]);

    const filteredVols = useMemo(() => {
        return volunteers.filter(v => {
            if (v.lat === null || v.lng === null) return false;
            if (volSearch && !v.full_name?.toLowerCase().includes(volSearch.toLowerCase()) && !v.group_name?.toLowerCase().includes(volSearch.toLowerCase())) return false;
            if (volGender && v.gender !== volGender) return false;
            if (volSkill && !(v.skills || []).includes(volSkill)) return false;
            if (volType && v.volunteer_type !== volType) return false;
            if (volCar && !v.has_car) return false;
            if (volStatus && v.status !== volStatus) return false;
            if (volContactStatus && v.contact_status !== volContactStatus) return false;
            return true;
        });
    }, [volunteers, volSearch, volGender, volSkill, volType, volCar, volStatus, volContactStatus]);

    const jitter = (items, radiusBase = 0.0006) => {
        const coordsMap = {};
        return items
            .filter(item => item && typeof item.lat === 'number' && typeof item.lng === 'number')
            .map(item => {
            const key = `${item.lat.toFixed(4)},${item.lng.toFixed(4)}`;
            const count = coordsMap[key] || 0;
            coordsMap[key] = count + 1;
            if (count > 0) {
                const angle = (count * 137.5) * (Math.PI / 180);
                const radius = radiusBase * Math.sqrt(count);
                return { ...item, lat: item.lat + radius * Math.cos(angle), lng: item.lng + radius * Math.sin(angle) };
            }
            return item;
        });
    };

    const jitteredTasks = useMemo(() => jitter(filteredTasks, 0.0008), [filteredTasks]);
    const jitteredVols = useMemo(() => jitter(filteredVols, 0.0006), [filteredVols]);

    const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const focusTaskId = searchParams.get('taskId');
    const focusVolunteerId = searchParams.get('volunteerId');

    const focusPoint = useMemo(() => {
        if (focusTaskId) {
            const t = tasks.find(x => String(x.id) === String(focusTaskId));
            if (t && typeof t.lat === 'number' && typeof t.lng === 'number') {
                return { lat: t.lat, lng: t.lng };
            }
        }
        if (focusVolunteerId) {
            const v = volunteers.find(x => String(x.id) === String(focusVolunteerId));
            if (v && typeof v.lat === 'number' && typeof v.lng === 'number') {
                return { lat: v.lat, lng: v.lng };
            }
        }
        return null;
    }, [focusTaskId, focusVolunteerId, tasks, volunteers]);

    const volunteersVisible = zoomLevel >= 11 && showVols;

    const selectStyle = "w-full border border-gray-100 rounded-xl py-2 px-3 text-[11px] bg-gray-50 outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-sm";

    return (
        <div className="flex flex-col lg:flex-row h-full gap-4 animate-in fade-in duration-500 pb-4" style={{ minHeight: '85vh' }}>
            <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0 overflow-y-auto max-h-[85vh] pr-1 pb-4" dir="rtl">
                <div className="bg-white rounded-2xl border border-primary/10 p-5 shadow-sm space-y-1">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">שליטה ומפה</h2>
                    <p className="text-xs text-gray-500 font-bold flex items-center gap-1"><Info size={12} /> {volunteersVisible ? 'כל הנתונים מוצגים' : 'עשי זום כדי לראות מתנדבים'}</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2"><Hammer size={12} /> משימות התנדבות</h4>
                        <IOSSwitch checked={showTasks} onChange={setShowTasks} color="bg-red-500" />
                    </div>
                    <div className="relative">
                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                        <input type="text" placeholder="חיפוש משימה..." value={taskSearch} onChange={e => setTaskSearch(e.target.value)} className="w-full pr-8 py-2 border border-gray-100 rounded-xl text-xs bg-gray-50 outline-none focus:ring-1 focus:ring-red-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <select value={taskUrgency} onChange={e => setTaskUrgency(e.target.value)} className={selectStyle}>
                            <option value="">כל הדחיפויות</option>
                            <option value="emergency">🔴 חירום</option>
                            <option value="high">גבוהה</option>
                            <option value="medium">בינונית</option>
                        </select>
                        <select value={taskStatus} onChange={e => setTaskStatus(e.target.value)} className={selectStyle}>
                            <option value="">כל הסטטוסים</option>
                            <option value="open">פתוחה</option>
                            <option value="assigning">בשיבוץ</option>
                            <option value="full">מלאה</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Users size={12} /> מאגר מתנדבים</h4>
                        <IOSSwitch checked={showVols} onChange={setShowVols} color="bg-blue-500" />
                    </div>
                    <div className="relative">
                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                        <input type="text" placeholder="חיפוש מתנדב/קבוצה..." value={volSearch} onChange={e => setVolSearch(e.target.value)} className="w-full pr-8 py-2 border border-gray-100 rounded-xl text-xs bg-gray-50 outline-none focus:ring-1 focus:ring-blue-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <select value={volSkill} onChange={e => setVolSkill(e.target.value)} className={selectStyle}>
                            <option value="">כל הכישורים</option>
                            {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={volGender} onChange={e => setVolGender(e.target.value)} className={selectStyle}>
                            <option value="">מגדר</option>
                            <option value="זכר">זכר</option>
                            <option value="נקבה">נקבה</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <select value={volType} onChange={e => setVolType(e.target.value)} className={selectStyle}>
                            <option value="">סוג אישיות</option>
                            <option value="individual">יחידים</option>
                            <option value="group">קבוצות</option>
                        </select>
                        <select value={volContactStatus} onChange={e => setVolContactStatus(e.target.value)} className={selectStyle + " border-blue-200 bg-blue-50/30"}>
                            <option value="">סטטוס קשר (הכל)</option>
                            <option value="עדין לא נוצר קשר">עדין לא נוצר קשר</option>
                            <option value="לא רלוונטי">לא רלוונטי</option>
                            <option value="מתנדב חוזר">מתנדב חוזר</option>
                            <option value="רוצה להתנדב">רוצה להתנדב</option>
                        </select>
                        <label className="flex items-center justify-center gap-2 p-1.5 bg-gray-50 rounded-xl cursor-pointer border border-gray-100 border-dashed">
                            <input type="checkbox" checked={volCar} onChange={e => setVolCar(e.target.checked)} className="rounded text-primary" />
                            <span className="text-[10px] font-bold text-gray-600">רק עם רכב</span>
                        </label>
                    </div>
                </div>

                <div className="bg-gray-900 rounded-2xl p-5 text-white shadow-xl mt-auto">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-bold text-gray-400">סטטיסטיקה נוכחית</span>
                        <div className="flex gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></div><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse delay-150"></div></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><div className="text-2xl font-black">{filteredTasks.length}</div><div className="text-[9px] text-gray-400 font-bold">משימות</div></div>
                        <div><div className="text-2xl font-black">{filteredVols.length}</div><div className="text-[9px] text-gray-400 font-bold">מתנדבים</div></div>
                    </div>
                </div>
            </div>

            <div className="flex-1 rounded-3xl overflow-hidden shadow-2xl border-4 border-white relative z-0 min-h-[400px]" style={{ minHeight: 400 }}>
                <MapContainer center={[31.5, 34.8]} zoom={8} style={{ height: '100%', minHeight: 400, width: '100%' }} scrollWheelZoom={true}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    <MapController volunteers={filteredVols} tasks={filteredTasks} setZoomLevel={setZoomLevel} focusPoint={focusPoint} />

                    {volunteersVisible && jitteredVols.map(v => {
                        const volTasks = assignments.filter(a => a.volunteer_id === v.id).map(a => tasks.find(t => t.id === a.task_id)).filter(Boolean);
                        return (
                            <Marker key={v.id} position={[v.lat, v.lng]} icon={volIconFn(v)} zIndexOffset={100}>
                                <Popup minWidth={260}>
                                    <div className="text-right p-1" dir="rtl">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${v.volunteer_type === 'group' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}><Users size={20} /></div>
                                            <div className="min-w-0">
                                                <h3 className="font-black text-base text-gray-900 leading-tight truncate">{v.volunteer_type === 'group' ? v.group_name : v.full_name}</h3>
                                                <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1 uppercase tracking-tight">
                                                    {v.volunteer_type === 'group' ? `קבוצה (${v.group_size} איש)` : `${v.gender || 'מתנדב/ת'} · גיל ${v.age || '?'}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 text-xs mb-3">
                                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100"><Phone size={14} className="text-blue-500" /> <span dir="ltr" className="font-bold">{v.volunteer_type === 'group' ? v.contact_phone : v.phone}</span></div>
                                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100"><MapPin size={14} className="text-blue-500" /> <span className="font-medium truncate">{v.city} · {v.address || 'לא צוין'}</span></div>
                                        </div>

                                        <button
                                            onClick={() => fetchVolHistory(v.id)}
                                            className="text-[10px] font-black text-primary mb-2 flex items-center gap-1 hover:underline"
                                        >
                                            <History size={12} /> הצג היסטוריית התנדבות...
                                        </button>

                                        {selectedVolHistory && (
                                            <div className="mb-4 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 animate-in slide-in-from-top-1">
                                                <h4 className="text-[10px] font-black text-emerald-700 uppercase mb-2">היסטוריה ({selectedVolHistory.length})</h4>
                                                <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                                                    {selectedVolHistory.map(t => (
                                                        <div key={t.id} className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5"><CheckCircle2 size={10} /> {t.name} <span className="text-[9px] font-normal opacity-60">({t.city})</span></div>
                                                    ))}
                                                    {selectedVolHistory.length === 0 && <div className="text-[9px] text-gray-400 italic">אין היסטוריה קודמת</div>}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                                            <div className={`px-2 py-1 rounded-full text-[10px] font-black ${v.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{v.status === 'available' ? 'פנוי/ה לשיבוץ' : 'בפעילות'}</div>
                                            <button onClick={() => navigate(`/volunteers?id=${v.id}`)} className="flex items-center gap-1.5 text-[11px] font-black text-primary hover:translate-x-1 transition-all">ניהול מתנדב <ExternalLink size={12} /></button>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {showTasks && jitteredTasks.map(t => (
                        <Marker key={t.id} position={[t.lat, t.lng]} icon={taskIconFn(t.urgency)} zIndexOffset={1000}>
                            <Popup minWidth={240}>
                                <div className="text-right p-1" dir="rtl">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0"><AlertCircle size={20} /></div>
                                        <div className="min-w-0"><h3 className="font-black text-base text-gray-900 leading-tight truncate">{t.name}</h3><p className="text-[10px] text-red-500 font-bold flex items-center gap-1"><Star size={10} fill="currentColor" /> {t.type || 'סיוע כללי'}</p></div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl space-y-2 mb-4 border border-gray-100">
                                        <div className="flex items-center gap-2 text-xs"><MapPin size={14} className="text-gray-400" /><span className="font-bold">{t.address}, {t.city}</span></div>
                                        <div className="flex items-center gap-2 text-xs"><Hammer size={14} className="text-gray-400" /><span>דחיפות: <span className="font-black text-red-600">{t.urgency === 'emergency' ? 'חירום' : t.urgency === 'high' ? 'גבוהה' : 'בינונית'}</span></span></div>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                                        <div className={`px-2 py-1 rounded-full text-[10px] font-black ${t.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{t.status === 'open' ? 'פתוחה לרישום' : 'בטיפול'}</div>
                                        <button onClick={() => navigate(`/tasks?id=${t.id}`)} className="flex items-center gap-1.5 text-[11px] font-black text-primary hover:translate-x-1 transition-all">ניהול משימה <ExternalLink size={12} /></button>
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
