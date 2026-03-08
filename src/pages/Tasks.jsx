import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Download, Trash2, Edit2, MapPin, Users, HeartHandshake, Car, Filter, X, Phone, UserCheck, Search as SearchIcon } from 'lucide-react';
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
                    <h5 className="font-bold text-gray-900 leading-tight">
                        {volunteer.volunteer_type === 'group' ? volunteer.group_name : volunteer.full_name}
                        {volunteer.age && <span className="text-gray-400 text-sm font-normal mr-1">({volunteer.age})</span>}
                    </h5>
                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-1 ${matchedSkills ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                        {matchedSkills ? '✓ רלוונטי' : 'מרחק'}
                    </div>
                </div>
                <div className="text-right text-[11px] text-gray-500 whitespace-nowrap">
                    {distFormatted && <div className="flex items-center justify-end gap-1"><MapPin size={10} /> {distFormatted}</div>}
                    {volunteer.has_car && <div className="flex items-center justify-end gap-1 text-emerald-600 font-bold mt-1"><Car size={10} /> רכב</div>}
                </div>
            </div>
            <button onClick={() => onAssign(volunteer, task)} className="mt-2 w-full bg-primary text-white py-1.5 rounded-lg font-bold shadow-sm hover:bg-blue-700 transition text-xs flex items-center justify-center gap-1.5">
                ✉️ שיבוץ + WhatsApp
            </button>
        </div>
    );
};

const Tasks = () => {
    const [tasks, setTasks] = useState([]);
    const [allVolunteers, setAllVolunteers] = useState([]);
    const [assignments, setAssignments] = useState([]); // Array of {task_id, volunteer_id, id}
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [volSearch, setVolSearch] = useState('');

    // Filters
    const [search, setSearch] = useState('');
    const [filterUrgency, setFilterUrgency] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCity, setFilterCity] = useState('');
    const [filterCar, setFilterCar] = useState('');

    const loadData = async () => {
        // Fetch tasks
        const { data: t } = await supabase.from('tasks').select('*').range(0, 1999).order('created_at', { ascending: false });
        // Fetch all volunteers
        const { data: v } = await supabase.from('volunteers').select('*').range(0, 2999);
        // Fetch assignments
        const { data: a } = await supabase.from('assignments').select('*');

        if (t) setTasks(t);
        if (v) setAllVolunteers(v);
        if (a) setAssignments(a);
    };

    useEffect(() => { loadData(); }, []);

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
        if (confirm('מחק משימה?')) {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (!error) setTasks(tasks.filter(t => t.id !== id));
        }
    };

    const handleAssign = async (volunteer, task) => {
        const name = volunteer.volunteer_type === 'group' ? volunteer.group_name : volunteer.full_name;
        const phone = volunteer.volunteer_type === 'group' ? volunteer.contact_phone : volunteer.phone;

        // DB - upsert assignment
        const { data, error } = await supabase.from('assignments').insert({
            task_id: task.id,
            volunteer_id: volunteer.id,
            status: 'assigned'
        }).select();

        if (error) {
            if (error.code === '23505') alert('מתנדב זה כבר משובץ למשימה זו');
            else { console.error(error); alert('שגיאה בשיבוץ:' + error.message); }
            return;
        }

        if (data) setAssignments([...assignments, data[0]]);

        // Update volunteer status & task counters could happen here or in a hook/trigger
        // For now, let's open WhatsApp
        const msg = `היי ${name}, צוות חמ"ל כאן.\nישנה משימה מתאימה עבורך:\n*${task.name}*\nכתובת: ${task.address}, ${task.city}\nדחיפות: ${URGENCY_LABELS[task.urgency] || task.urgency}\n\nנשמח לאישור 🙏`;
        const phoneNum = (phone || '').replace(/[^0-9]/g, '');
        const intlPhone = phoneNum.startsWith('0') ? '972' + phoneNum.slice(1) : phoneNum;
        window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank');

        // Mark as assigning status if not set
        if (task.status === 'open') {
            await supabase.from('tasks').update({ status: 'assigning' }).eq('id', task.id);
            setTasks(tasks.map(t => t.id === task.id ? { ...t, status: 'assigning' } : t));
        }
    };

    const removeAssignment = async (id) => {
        const { error } = await supabase.from('assignments').delete().eq('id', id);
        if (!error) setAssignments(assignments.filter(a => a.id !== id));
    };

    const getTop15Volunteers = (task) => {
        if (!task.lat || !task.lng) return allVolunteers.filter(v => v.status === 'available').slice(0, 15);

        return [...allVolunteers]
            .filter(v => v.status === 'available')
            .sort((a, b) => {
                const distA = getDistance({ latitude: task.lat, longitude: task.lng }, { latitude: a.lat, longitude: a.lng });
                const distB = getDistance({ latitude: task.lat, longitude: task.lng }, { latitude: b.lat, longitude: b.lng });
                return distA - distB;
            })
            .slice(0, 15);
    };

    // Any-volunteer search
    const searchedVolunteers = useMemo(() => {
        if (!volSearch || volSearch.length < 2) return [];
        const low = volSearch.toLowerCase();
        return allVolunteers.filter(v =>
            (v.full_name || v.group_name || '').toLowerCase().includes(low) ||
            (v.phone || v.contact_phone || '').includes(volSearch)
        ).slice(0, 5);
    }, [allVolunteers, volSearch]);

    const handleSave = async (data) => {
        let lat = data.lat, lng = data.lng;
        if (!data.id) { const loc = await geocodeAddress(data.address, data.city); lat = loc.lat; lng = loc.lng; }

        const allowedFields = ['id', 'name', 'type', 'description', 'address', 'city', 'lat', 'lng', 'urgency', 'volunteers_needed', 'status'];
        const clean = {};
        allowedFields.forEach(f => { if (data[f] !== undefined) clean[f] = data[f]; });
        clean.lat = lat; clean.lng = lng;

        if (data.id) {
            const { error } = await supabase.from('tasks').update(clean).eq('id', data.id);
            if (!error) setTasks(tasks.map(t => t.id === data.id ? { ...t, ...clean } : t));
        } else {
            const { data: inserted, error } = await supabase.from('tasks').insert([clean]).select();
            if (inserted) setTasks([inserted[0], ...tasks]);
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
        <div className="space-y-5 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">ניהול משימות</h2>
                    <p className="text-gray-500 mt-1">
                        מציג {filtered.length} מתוך {tasks.length} משימות
                        {hasActiveFilters && <button onClick={clearFilters} className="mr-2 text-primary font-bold underline">נקה הכל</button>}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold flex items-center gap-2"> <Download size={16} /> ייצוא </button>
                    <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md"> <Plus size={18} /> משימה חדשה </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" placeholder="חיפוש משימה..." value={search} onChange={e => setSearch(e.target.value)}
                        className="pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-sm outline-none w-52" />
                </div>
                <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white">
                    <option value="">כל הערים</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white">
                    <option value="">כל הדחיפויות</option>
                    {Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white">
                    <option value="">כל הסטטוסים</option>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            {/* Tasks List */}
            <div className="space-y-4">
                {filtered.map((task) => {
                    const isExpanded = expandedTaskId === task.id;
                    const taskAssigned = assignments.filter(a => a.task_id === task.id);

                    return (
                        <div key={task.id} className={`bg-white rounded-2xl border transition-all ${isExpanded ? 'border-primary shadow-lg ring-1 ring-primary/10' : 'border-gray-100 shadow-sm'}`}>
                            <div className="p-5 flex items-center gap-6 cursor-pointer" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                                {/* Status badge */}
                                <div className="shrink-0 flex flex-col items-center gap-1">
                                    <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${URGENCY_COLORS[task.urgency]}`}>{URGENCY_LABELS[task.urgency]}</div>
                                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-gray-900 truncate text-lg">{task.name}</h3>
                                        {task.volunteers_needed > 1 && <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-md font-bold">{taskAssigned.length}/{task.volunteers_needed}</span>}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                        <div className="flex items-center gap-1 font-bold text-gray-800"><MapPin size={14} className="text-gray-400" /> {task.city}</div>
                                        <div className="flex items-center gap-1"><Users size={14} className="text-gray-400" /> {task.type}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {taskAssigned.length > 0 && <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-xs font-bold ring-1 ring-emerald-100"><UserCheck size={14} /> שובצו {taskAssigned.length}</span>}
                                    <button onClick={(e) => { e.stopPropagation(); setEditingTask(task); setIsModalOpen(true); }} className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-lg"><Edit2 size={16} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-gray-100 p-6 bg-gray-50/30">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        {/* Current Assignments */}
                                        <div className="lg:col-span-4 space-y-4">
                                            <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">👥 כבר משובצים</h4>
                                            {taskAssigned.length === 0 ? (
                                                <div className="text-xs text-gray-400 italic">טרם שובצו מתנדבים משימה זו.</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {taskAssigned.map(a => {
                                                        const vol = allVolunteers.find(v => v.id === a.volunteer_id);
                                                        return (
                                                            <div key={a.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-bold">✓</div>
                                                                    <div className="text-xs font-bold">{vol ? (vol.volunteer_type === 'group' ? vol.group_name : vol.full_name) : 'נמחק'}</div>
                                                                </div>
                                                                <button onClick={() => removeAssignment(a.id)} className="text-gray-300 hover:text-red-500 transition-colors"><X size={14} /></button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div className="pt-4 border-t border-gray-100">
                                                <h4 className="text-sm font-black text-gray-900 mb-2">🔍 חיפוש לפי שם/טלפון</h4>
                                                <div className="relative">
                                                    <SearchIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input type="text" placeholder="חיפוש מתנדב ספציפי..." value={volSearch} onChange={e => setVolSearch(e.target.value)}
                                                        className="w-full pr-9 pl-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary outline-none" />
                                                </div>
                                                {searchedVolunteers.length > 0 && (
                                                    <div className="mt-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden divide-y divide-gray-50 animate-in slide-in-from-top-1">
                                                        {searchedVolunteers.map(v => (
                                                            <button key={v.id} onClick={() => handleAssign(v, task)} className="w-full text-right p-3 hover:bg-gray-50 flex items-center justify-between group">
                                                                <div>
                                                                    <div className="text-xs font-black">{v.volunteer_type === 'group' ? v.group_name : v.full_name}</div>
                                                                    <div className="text-[10px] text-gray-400">{v.city} · {v.phone || v.contact_phone}</div>
                                                                </div>
                                                                <HeartHandshake size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Top 15 Recommendations */}
                                        <div className="lg:col-span-8 space-y-4">
                                            <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">⭐ 15 המלצות מובילות לפי קרבה</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                                {getTop15Volunteers(task).map(v => (
                                                    <MatchCard key={v.id} volunteer={v} task={task} onAssign={handleAssign} />
                                                ))}
                                                {getTop15Volunteers(task).length === 0 && (
                                                    <div className="col-span-full py-8 text-center text-gray-400 text-xs italic">אין מתנדבים פנויים כרגע בסטטוס "פנוי".</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} task={editingTask} onSave={handleSave} />
        </div>
    );
};

export default Tasks;
