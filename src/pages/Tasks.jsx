import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Download, Trash2, Edit2, MapPin, Users, HeartHandshake, Car, Filter, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getDistance } from 'geolib';
import TaskModal from '../components/TaskModal';
import * as XLSX from 'xlsx';
import { geocodeAddress } from '../utils/geocode';

const URGENCY_COLORS = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    emergency: 'bg-red-100 text-red-700 border border-red-200',
};
const URGENCY_LABELS = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה', emergency: '🔴 חירום' };
const STATUS_COLORS = { open: 'bg-blue-100 text-blue-700', assigning: 'bg-purple-100 text-purple-700', full: 'bg-gray-100 text-gray-600', completed: 'bg-emerald-100 text-emerald-700' };
const STATUS_LABELS = { open: 'פתוחה', assigning: 'בשיבוץ', full: 'מלאה', completed: 'הושלמה' };

const MatchCard = ({ volunteer, task, onAssign }) => {
    let distFormatted = '';
    if (volunteer.lat && volunteer.lng && task.lat && task.lng) {
        const d = getDistance({ latitude: task.lat, longitude: task.lng }, { latitude: volunteer.lat, longitude: volunteer.lng });
        distFormatted = d > 1000 ? `${(d / 1000).toFixed(1)} ק"מ` : `${d} מ'`;
    }
    const matchedSkills = volunteer.skills?.some(s => task.type?.includes(s) || s === 'עזרה כללית');

    return (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col hover:border-primary/30 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h5 className="font-bold text-gray-900">{volunteer.full_name} {volunteer.age && <span className="text-gray-400 text-sm font-normal">({volunteer.age})</span>}</h5>
                    <div className={`text-xs font-semibold px-2 py-0.5 rounded inline-block mt-1 ${matchedSkills ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                        {matchedSkills ? '✓ התאמת כישורים' : 'קרבה גיאוגרפית'}
                    </div>
                </div>
                <div className="text-left text-xs text-gray-500 flex flex-col items-end gap-1">
                    {distFormatted && <span className="flex items-center gap-1"><MapPin size={12} /> {distFormatted}</span>}
                    {volunteer.has_car && <span className="flex items-center gap-1 text-emerald-600"><Car size={12} /> יש רכב</span>}
                </div>
            </div>
            <button onClick={() => onAssign(volunteer, task)} className="mt-3 flex-1 bg-primary text-white py-1.5 rounded-lg font-semibold shadow-sm hover:bg-blue-700 transition text-sm">
                ✉️ שבץ ושלח WhatsApp
            </button>
        </div>
    );
};

const Tasks = () => {
    const [tasks, setTasks] = useState([]);
    const [volunteers, setVolunteers] = useState([]);
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    // Filters
    const [search, setSearch] = useState('');
    const [filterUrgency, setFilterUrgency] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCity, setFilterCity] = useState('');
    const [filterCar, setFilterCar] = useState('');

    useEffect(() => {
        const load = async () => {
            const { data: t } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
            const { data: v } = await supabase.from('volunteers').select('*').eq('status', 'available');
            if (t) setTasks(t);
            if (v) setVolunteers(v);
        };
        load();
    }, []);

    const cities = useMemo(() => [...new Set(tasks.map(t => t.city).filter(Boolean))].sort(), [tasks]);

    const filtered = useMemo(() => {
        return tasks.filter(t => {
            if (search && !t.name?.toLowerCase().includes(search.toLowerCase()) && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
            if (filterUrgency && t.urgency !== filterUrgency) return false;
            if (filterStatus && t.status !== filterStatus) return false;
            if (filterCity && t.city !== filterCity) return false;
            if (filterCar === 'yes' && !t.requires_car) return false;
            return true;
        });
    }, [tasks, search, filterUrgency, filterStatus, filterCity, filterCar]);

    const hasActiveFilters = search || filterUrgency || filterStatus || filterCity || filterCar;
    const clearFilters = () => { setSearch(''); setFilterUrgency(''); setFilterStatus(''); setFilterCity(''); setFilterCar(''); };

    const handleDelete = async (id) => {
        if (confirm('האם למחוק משימה זו?')) {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (!error) setTasks(tasks.filter(t => t.id !== id));
        }
    };

    const handleAssign = async (volunteer, task) => {
        const msg = `היי ${volunteer.full_name}, צוות חמ"ל כאן.\nישנה משימה מתאימה עבורך:\n*${task.name}*\nכתובת: ${task.address}, ${task.city}\nזמן: בהקדם האפשרי\nדחיפות: ${URGENCY_LABELS[task.urgency] || task.urgency}\n\nנשמח אם תוכל/י לאשר הגעה. תודה 🙏`;
        const phone = volunteer.phone.replace(/[^0-9]/g, '');
        const intlPhone = phone.startsWith('0') ? '972' + phone.slice(1) : phone;
        window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        await supabase.from('volunteers').update({ status: 'assigned' }).eq('id', volunteer.id);
        const { data: v } = await supabase.from('volunteers').select('*').eq('status', 'available');
        setVolunteers(v || []);
    };

    const getRecommendedVolunteers = (task) => {
        if (!task.lat || !task.lng) return volunteers.slice(0, 4);
        return [...volunteers].sort((a, b) => {
            if (!a.lat) return 1; if (!b.lat) return -1;
            const dA = getDistance({ latitude: task.lat, longitude: task.lng }, { latitude: a.lat, longitude: a.lng });
            const dB = getDistance({ latitude: task.lat, longitude: task.lng }, { latitude: b.lat, longitude: b.lng });
            return dA - dB;
        }).slice(0, 4);
    };

    const handleSave = async (data) => {
        let lat = data.lat, lng = data.lng;
        if (!data.id) {
            const loc = await geocodeAddress(data.address, data.city);
            lat = loc.lat; lng = loc.lng;
        }

        // Only send columns that exist in the DB schema — strip anything else
        const allowedFields = ['id', 'name', 'type', 'description', 'address', 'city', 'lat', 'lng',
            'start_time', 'end_time', 'urgency', 'volunteers_needed', 'age_limit',
            'needs_car', 'requesting_org', 'contact_name', 'contact_phone',
            'internal_notes', 'status', 'volunteers_assigned'];
        const clean = {};
        allowedFields.forEach(f => { if (data[f] !== undefined) clean[f] = data[f]; });
        clean.lat = lat; clean.lng = lng;

        if (data.id) {
            const { error } = await supabase.from('tasks').update(clean).eq('id', data.id);
            if (error) { console.error('Task update error:', error); alert('שגיאה בעדכון: ' + error.message); return; }
            setTasks(tasks.map(t => t.id === data.id ? { ...t, ...clean } : t));
        } else {
            const { data: inserted, error } = await supabase.from('tasks').insert([clean]).select();
            if (error) { console.error('Task insert error:', error); alert('שגיאה בשמירה: ' + error.message); return; }
            if (inserted && inserted.length > 0) setTasks([inserted[0], ...tasks]);
        }
        setIsModalOpen(false);
    };

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(filtered);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
        XLSX.writeFile(wb, 'Tasks_Export.xlsx');
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">ניהול משימות</h2>
                    <p className="text-gray-500 mt-1">
                        מציג {filtered.length} מתוך {tasks.length} משימות
                        {hasActiveFilters && <button onClick={clearFilters} className="mr-2 text-primary text-xs underline">נקה מסננים</button>}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExport} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-gray-50 shadow-sm text-sm">
                        <Download size={16} className="text-gray-400" /> ייצוא
                    </button>
                    <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="bg-primary text-white px-5 py-2 rounded-xl flex items-center gap-2 font-semibold shadow-md shadow-primary/20 transition-all hover:scale-105 text-sm">
                        <Plus size={18} /> משימה חדשה
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 text-gray-500 font-semibold text-sm">
                    <Filter size={16} className="text-primary" /> סינונים
                </div>
                {/* Search */}
                <div className="relative">
                    <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="חיפוש משימה..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="border border-gray-200 rounded-lg pr-9 pl-3 py-1.5 text-sm focus:outline-none focus:border-primary w-44"
                    />
                </div>
                {/* City */}
                <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white">
                    <option value="">כל הערים</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {/* Status */}
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white">
                    <option value="">כל הסטטוסים</option>
                    <option value="open">פתוחה</option>
                    <option value="assigning">בשיבוץ</option>
                    <option value="full">מלאה</option>
                    <option value="completed">הושלמה</option>
                </select>
                {/* Urgency */}
                <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white">
                    <option value="">כל רמות הדחיפות</option>
                    <option value="low">נמוכה</option>
                    <option value="medium">בינונית</option>
                    <option value="high">גבוהה</option>
                    <option value="emergency">חירום</option>
                </select>
                {/* Car required */}
                <select value={filterCar} onChange={e => setFilterCar(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white">
                    <option value="">דרישת רכב - הכל</option>
                    <option value="yes">דורש רכב</option>
                </select>
                {hasActiveFilters && (
                    <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                        <X size={14} /> נקה
                    </button>
                )}
            </div>

            {/* Tasks List */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400 font-medium">לא נמצאו משימות התואמות לסינון הנוכחי.</div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="divide-y divide-gray-50">
                        {filtered.map((task) => {
                            const isExpanded = expandedTaskId === task.id;
                            const isEmergency = task.urgency === 'emergency' || task.urgency === 'high';
                            return (
                                <div key={task.id} className={`transition-all duration-200 ${isExpanded ? 'bg-blue-50/40' : isEmergency ? 'hover:bg-red-50/30' : 'hover:bg-gray-50/60'}`}>
                                    <div
                                        className="p-5 flex items-center justify-between cursor-pointer group"
                                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                                    >
                                        {/* Left: actions */}
                                        <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-4 shrink-0">
                                            <button onClick={(e) => { e.stopPropagation(); setEditingTask(task); setIsModalOpen(true); }}
                                                className="p-2 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setExpandedTaskId(isExpanded ? null : task.id); }}
                                                className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg font-bold shadow hover:bg-blue-700 text-sm">
                                                <HeartHandshake size={16} /> שיבוץ
                                            </button>
                                        </div>

                                        {/* Right: task info (RTL) */}
                                        <div className="flex flex-1 items-center justify-end gap-6 text-right">
                                            {/* Volunteer count + location */}
                                            <div className="flex flex-col items-end gap-1 text-sm text-gray-500 shrink-0">
                                                <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded-md font-semibold text-gray-700">
                                                    <span>{task.volunteers_assigned || 0}/{task.volunteers_needed || 1}</span>
                                                    <Users size={14} className="text-primary" />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="max-w-[120px] truncate">{task.city}</span>
                                                    <MapPin size={13} className="text-gray-400" />
                                                </div>
                                            </div>

                                            {/* Title + badges */}
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-gray-900 text-lg flex items-center justify-end gap-2">
                                                    {isEmergency && <span className="text-red-500 text-base animate-pulse">🔴</span>}
                                                    {task.name || task.type}
                                                </h4>
                                                <p className="text-sm text-gray-500 mt-0.5 truncate max-w-sm">{task.description}</p>
                                                <div className="flex flex-wrap items-center justify-end gap-1.5 mt-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${URGENCY_COLORS[task.urgency] || 'bg-gray-100 text-gray-600'}`}>
                                                        {URGENCY_LABELS[task.urgency] || task.urgency}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-600'}`}>
                                                        {STATUS_LABELS[task.status] || task.status}
                                                    </span>
                                                    {task.requires_car && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">דורש רכב</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Smart Matching Panel */}
                                    {isExpanded && (
                                        <div className="px-6 pb-5 pt-2 border-t border-blue-100 bg-white" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-2 mb-4">
                                                <HeartHandshake className="text-primary" size={22} />
                                                <h4 className="text-base font-bold text-gray-900">
                                                    המלצות שיבוץ מתנדבים
                                                    <span className="text-xs font-normal text-gray-400 mr-2">(לפי קרבה וכישורים)</span>
                                                </h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                {getRecommendedVolunteers(task).map(vol => (
                                                    <MatchCard key={vol.id} volunteer={vol} task={task} onAssign={handleAssign} />
                                                ))}
                                                {getRecommendedVolunteers(task).length === 0 && (
                                                    <div className="col-span-full py-6 text-center text-gray-400 font-medium">לא נמצאו מתנדבים פנויים.</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} task={editingTask} onSave={handleSave} />
        </div>
    );
};

export default Tasks;
