import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Download, Trash2, Edit2, MapPin, Users, HeartHandshake, Car, Filter, X, Phone, UserCheck, Search as SearchIcon, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getDistance } from 'geolib';
import TaskModal from '../components/TaskModal';
import * as XLSX from 'xlsx';
import { geocodeAddress } from '../utils/geocode';
import { useSearchParams } from 'react-router-dom';

const URGENCY_COLORS = { low: 'bg-gray-100 text-gray-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-orange-100 text-orange-700', emergency: 'bg-red-100 text-red-700 border border-red-200' };
const URGENCY_LABELS = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה', emergency: '🔴 חירום' };
const STATUS_COLORS = { open: 'bg-blue-100 text-blue-700', assigning: 'bg-purple-100 text-purple-700', full: 'bg-gray-100 text-gray-600', completed: 'bg-emerald-100 text-emerald-700' };
const STATUS_LABELS = { open: 'פתוחה', assigning: 'בשיבוץ', full: 'מלאה', completed: 'הושלמה' };

const MatchCard = ({ volunteer, task, onAssign }) => {
    let distFormatted = '';
    if (volunteer.lat && volunteer.lng && task.lat && task.lng) {
        const d = getDistance({ latitude: task.lat, longitude: task.lng }, { latitude: volunteer.lat, longitude: volunteer.lng });
        distFormatted = d > 1000 ? `${(d / 1000).toFixed(1)} ק"מ` : `${d} מ'`;
    }
    const matchedSkills = (volunteer.skills || []).some(s => (task.type || '').includes(s) || s === 'עזרה כללית');

    return (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col hover:border-primary/30 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
                <div><h5 className="font-bold text-gray-900 leading-tight">{volunteer.volunteer_type === 'group' ? volunteer.group_name : volunteer.full_name}{volunteer.age && <span className="text-gray-400 text-sm font-normal mr-1">({volunteer.age})</span>}</h5><div className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-1 ${matchedSkills ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{matchedSkills ? '✓ רלוונטי' : 'מרחק'}</div></div>
                <div className="text-right text-[11px] text-gray-500 whitespace-nowrap">{distFormatted && <div className="flex items-center justify-end gap-1"><MapPin size={10} /> {distFormatted}</div>}{volunteer.has_car && <div className="flex items-center justify-end gap-1 text-emerald-600 font-bold mt-1"><Car size={10} /> רכב</div>}</div>
            </div>
            <button onClick={() => onAssign(volunteer, task)} className="mt-2 w-full bg-primary text-white py-1.5 rounded-lg font-bold shadow-sm hover:bg-blue-700 transition text-xs flex items-center justify-center gap-1.5">✉️ שיבוץ + WhatsApp</button>
        </div>
    );
};

const Tasks = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const targetedId = searchParams.get('id');

    const [tasks, setTasks] = useState([]);
    const [allVolunteers, setAllVolunteers] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [expandedTaskId, setExpandedTaskId] = useState(targetedId);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [volSearch, setVolSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [filterUrgency, setFilterUrgency] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCity, setFilterCity] = useState('');

    const loadData = async () => {
        setIsLoading(true);
        const { data: t } = await supabase.from('tasks').select('*').range(0, 2000).order('created_at', { ascending: false });
        const { data: v } = await supabase.from('volunteers').select('*').range(0, 3000);
        const { data: a } = await supabase.from('assignments').select('*');
        if (t) setTasks(t);
        if (v) setAllVolunteers(v);
        if (a) setAssignments(a);
        setIsLoading(false);
    };

    useEffect(() => { loadData(); }, []);
    useEffect(() => { if (targetedId) setExpandedTaskId(targetedId); }, [targetedId]);

    const cities = useMemo(() => [...new Set(tasks.map(t => t.city).filter(Boolean))].sort(), [tasks]);

    const filtered = useMemo(() => {
        return tasks.filter(t => {
            if (targetedId && t.id === targetedId) return true;
            if (targetedId) return false;
            if (search && !t.name?.toLowerCase().includes(search.toLowerCase()) && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
            if (filterUrgency && t.urgency !== filterUrgency) return false;
            if (filterStatus && t.status !== filterStatus) return false;
            if (filterCity && t.city !== filterCity) return false;
            return true;
        });
    }, [tasks, search, filterUrgency, filterStatus, filterCity, targetedId]);

    const handleAssign = async (volunteer, task) => {
        const name = volunteer.volunteer_type === 'group' ? volunteer.group_name : volunteer.full_name;
        const phone = volunteer.volunteer_type === 'group' ? volunteer.contact_phone : volunteer.phone;
        const { data, error } = await supabase.from('assignments').insert({ task_id: task.id, volunteer_id: volunteer.id, status: 'assigned' }).select();
        if (error) { if (error.code === '23505') alert('מתנדב זה כבר משובץ'); else alert('שגיאה: ' + error.message); return; }
        if (data) setAssignments([...assignments, data[0]]);
        const msg = `היי ${name},\nמשימה קרובה: *${task.name}*\nכתובת: ${task.address}, ${task.city}\nאישור?`;
        const phoneNum = (phone || '').replace(/[^0-9]/g, '');
        const intlPhone = phoneNum.startsWith('0') ? '972' + phoneNum.slice(1) : phoneNum;
        window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank');
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
        return [...allVolunteers].filter(v => v.status === 'available')
            .sort((a, b) => {
                const distA = (task.lat && a.lat) ? getDistance({ latitude: task.lat, longitude: task.lng }, { latitude: a.lat, longitude: a.lng }) : 9999999;
                const distB = (task.lat && b.lat) ? getDistance({ latitude: task.lat, longitude: task.lng }, { latitude: b.lat, longitude: b.lng }) : 9999999;
                return distA - distB;
            }).slice(0, 15);
    };

    const handleSave = async (data) => {
        let lat = data.lat, lng = data.lng;
        if (!data.id) { const loc = await geocodeAddress(data.address, data.city); lat = loc.lat; lng = loc.lng; }
        const allowedFields = ['name', 'type', 'description', 'address', 'city', 'lat', 'lng', 'urgency', 'volunteers_needed', 'status'];
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

    return (
        <div className="space-y-5 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div><h2 className="text-3xl font-bold tracking-tight text-gray-900">משימות</h2><p className="text-gray-500 mt-1">מנהל {tasks.length} משימות ({filtered.length} מוצגות)</p></div>
                <div className="flex gap-2">
                    <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md"> <Plus size={18} /> משימה חדשה </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" placeholder="חיפוש..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-sm outline-none w-52" /></div>
                <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white"><option value="">עיר (הכל)</option>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white"><option value="">דחיפות (הכל)</option>{Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                {(search || filterCity || filterUrgency || targetedId) && (<button onClick={() => { setSearch(''); setFilterCity(''); setFilterUrgency(''); setSearchParams({}); }} className="text-primary font-bold text-xs underline px-2">נקה הכל</button>)}
            </div>

            <div className="space-y-4">
                {isLoading ? <div className="text-center py-20 text-gray-400"><Loader2 className="animate-spin inline mr-2" />טוען...</div> :
                    filtered.map((task) => {
                        const isExpanded = expandedTaskId === task.id;
                        const taskAssigned = assignments.filter(a => a.task_id === task.id);
                        return (
                            <div key={task.id} className={`bg-white rounded-2xl border transition-all ${isExpanded ? 'border-primary shadow-lg ring-1 ring-primary/10' : 'border-gray-100 shadow-sm'}`} id={`task-${task.id}`}>
                                <div className="p-5 flex items-center gap-6 cursor-pointer" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                                    <div className="shrink-0 flex flex-col items-center gap-1"><div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${URGENCY_COLORS[task.urgency]}`}>{URGENCY_LABELS[task.urgency]}</div><div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</div></div>
                                    <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h3 className="font-black text-gray-900 truncate text-lg">{task.name}</h3>{task.volunteers_needed > 1 && <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-md font-bold">{taskAssigned.length}/{task.volunteers_needed}</span>}</div><div className="flex items-center gap-3 mt-1 text-sm text-gray-500"><div className="flex items-center gap-1 font-bold text-gray-800"><MapPin size={14} className="text-gray-400" /> {task.city}</div><div className="flex items-center gap-1"><Users size={14} className="text-gray-400" /> {task.type}</div></div></div>
                                    <div className="flex items-center gap-2">{taskAssigned.length > 0 && <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-xs font-bold ring-1 ring-emerald-100"><UserCheck size={14} /> שובצו {taskAssigned.length}</span>}</div>
                                </div>
                                {isExpanded && (
                                    <div className="border-t border-gray-100 p-6 bg-gray-50/30 animate-in slide-in-from-top-1 duration-300">
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                            <div className="lg:col-span-4 space-y-4">
                                                <h4 className="text-sm font-black text-gray-900">👥 משובצים</h4>
                                                {taskAssigned.map(a => { const vol = allVolunteers.find(v => v.id === a.volunteer_id); return (<div key={a.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm"><div className="text-xs font-bold">{vol ? (vol.volunteer_type === 'group' ? vol.group_name : vol.full_name) : 'נמחק'}</div><button onClick={() => removeAssignment(a.id)} className="text-gray-300 hover:text-red-500"><X size={14} /></button></div>); })}
                                                <div className="pt-4 border-t border-gray-100">
                                                    <h4 className="text-sm font-black text-gray-900 mb-2">🔍 חיפוש לפי שם</h4>
                                                    <input type="text" placeholder="חיפוש מתנדב..." value={volSearch} onChange={e => setVolSearch(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none" />
                                                    {volSearch.length > 1 && allVolunteers.filter(v => (v.full_name || v.group_name || '').toLowerCase().includes(volSearch.toLowerCase())).slice(0, 5).map(v => (<button key={v.id} onClick={() => handleAssign(v, task)} className="w-full text-right p-3 hover:bg-gray-50 text-xs mt-1 border border-gray-50 rounded-lg bg-white block">{v.volunteer_type === 'group' ? v.group_name : v.full_name} ({v.city})</button>))}
                                                </div>
                                            </div>
                                            <div className="lg:col-span-8 space-y-4">
                                                <h4 className="text-sm font-black text-gray-900">⭐ המלצות לפי קרבה</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{getTop15Volunteers(task).map(v => (<MatchCard key={v.id} volunteer={v} task={task} onAssign={handleAssign} />))}</div>
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
