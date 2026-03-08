import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import { Users, ClipboardList, MapPin, Filter, Car, Phone } from 'lucide-react';

const createCustomIcon = (color, IconComp) => {
    const htmlString = `<div style="background-color: white; border: 2px solid ${color}; padding: 4px; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;"><div style="color: ${color};"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IconComp}</svg></div></div>`;
    return L.divIcon({
        className: 'custom-icon',
        html: htmlString,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
};

const userHtml = `<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>`;
const clipboardHtml = `<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>`;

const volIcon = createCustomIcon('#2563eb', userHtml);
const taskIcon = createCustomIcon('#dc2626', clipboardHtml);

const MapView = () => {
    const [volunteers, setVolunteers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [filters, setFilters] = useState({ city: '', status: '' });

    useEffect(() => {
        const loadData = async () => {
            const { data: vData } = await supabase.from('volunteers').select('*').not('lat', 'is', null);
            const { data: tData } = await supabase.from('tasks').select('*').not('lat', 'is', null);
            if (vData) setVolunteers(vData);
            if (tData) setTasks(tData);
        };
        loadData();
    }, []);

    const filteredVols = volunteers.filter(v => (filters.city ? v.city === filters.city : true));
    const filteredTasks = tasks.filter(t => (filters.status ? t.status === filters.status : true));

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 relative">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">מפת שליטה בזמן אמת</h2>
                    <p className="text-gray-500 mt-1">צפייה במשימות ובמתנדבים באזור הפעילות</p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-4 h-16 shrink-0">
                <div className="flex items-center gap-2 px-3 border-l border-gray-200 text-gray-700 font-semibold">
                    <Filter size={20} className="text-primary" /> סינונים
                </div>
                <input
                    type="text"
                    placeholder="סינון לפי עיר למתנדבים..."
                    value={filters.city}
                    onChange={e => setFilters({ ...filters, city: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-primary focus:border-primary outline-none"
                />
                <select
                    value={filters.status}
                    onChange={e => setFilters({ ...filters, status: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-primary focus:border-primary outline-none bg-white"
                >
                    <option value="">כל משימות (סטטוס)</option>
                    <option value="open">פתוחה</option>
                    <option value="completed">הושלמה</option>
                </select>
                <div className="flex gap-4 mr-auto text-sm">
                    <span className="flex items-center gap-1 font-semibold text-gray-600"><div className="w-3 h-3 rounded-full bg-blue-600"></div> מתנדבים ({filteredVols.length})</span>
                    <span className="flex items-center gap-1 font-semibold text-gray-600"><div className="w-3 h-3 rounded-full bg-red-600"></div> משימות ({filteredTasks.length})</span>
                </div>
            </div>

            <div className="flex-1 rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative bg-gray-100 min-h-[600px]">
                <MapContainer center={[32.0853, 34.7817]} zoom={12} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />

                    {filteredTasks.map(t => (
                        <Marker key={t.id} position={[t.lat, t.lng]} icon={taskIcon}>
                            <Popup>
                                <div className="p-1 space-y-2 dir-rtl text-right" dir="rtl">
                                    <h3 className="font-bold text-lg border-b pb-1 text-red-700">{t.name || t.type}</h3>
                                    <p className="text-gray-600 text-sm mt-1">{t.description}</p>
                                    <div className="flex gap-2 text-xs mt-2">
                                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-md">{t.urgency}</span>
                                        <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md">{t.status}</span>
                                    </div>
                                    <button className="bg-primary hover:bg-blue-700 text-white w-full py-1.5 rounded-xl font-bold mt-2 shadow-sm">
                                        שבץ מתנדבים מהיר
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {filteredVols.map(v => (
                        <Marker key={v.id} position={[v.lat, v.lng]} icon={volIcon}>
                            <Popup>
                                <div className="p-1 space-y-2 text-right" dir="rtl">
                                    <h3 className="font-bold text-lg border-b pb-1 text-blue-700 flex items-center gap-2">
                                        {v.full_name}
                                    </h3>
                                    <div className="flex flex-col gap-1 text-sm mt-2 text-gray-700">
                                        <span className="flex items-center gap-2"><Phone size={14} /> {v.phone}</span>
                                        <span className="flex items-center gap-2"><MapPin size={14} /> {v.address}, {v.city}</span>
                                        <span className="flex items-center gap-2"><Car size={14} /> {v.has_car ? 'יש רכב' : 'אין רכב'}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {(v.skills || []).map(s => <span key={s} className="bg-gray-100 text-xs px-2 py-0.5 rounded border border-gray-200">{s}</span>)}
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
