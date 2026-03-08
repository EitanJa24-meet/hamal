import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, Edit2, MapPin, Users, HeartHandshake, Car, Filter, X, UserCheck, Loader2, Archive, MessageCircle, UserPlus, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getDistance } from 'geolib';
import TaskModal from '../components/TaskModal';
import { geocodeAddress } from '../utils/geocode';
import { useSearchParams } from 'react-router-dom';

const URGENCY_COLORS = { low: 'bg-gray-100 text-gray-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-orange-100 text-orange-700', emergency: 'bg-red-100 text-red-700 border border-red-200' };
const URGENCY_LABELS = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה', emergency: '🔴 חירום' };
const STATUS_COLORS = { open: 'bg-blue-100 text-blue-700', assigning: 'bg-purple-100 text-purple-700', completed: 'bg-emerald-100 text-emerald-700' };
const STATUS_LABELS = { open: 'פתוחה', assigning: 'בשיבוץ', completed: 'הושלמה' };
const PRIORITY_CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'עוטף עזה', 'גבול הצפון', 'שדרות', 'אשקלון'];

const MatchCard = ({ volunteer, task, onAssign, onWhatsApp }) => {
    let distFormatted = '';
    if (volunteer.lat && volunteer.lng && task.lat && task.lng) {
        const d = getDistance({ latitude: task.lat, longitude: task.lng }, { latitude: volunteer.lat, longitude: volunteer.lng });
        distFormatted = d > 1000 ? `${(d / 1000).toFixed(1)} ק"מ` : `${d} מ'`;
    }
    const matchedSkills = (volunteer.skills || []).some(s => (task.type || '').includes(s) || s === 'עזרה כללית');

    return (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col hover:border-primary/30 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2 text-right">
                <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-gray-900 leading-tight truncate">
                        {volunteer.volunteer_type === 'group' ? volunteer.group_name : volunteer.full_name}
                    </h5>
                    <div className="text-[10px] text-gray-500 mt-0.5">{volunteer.gender} · גיל {volunteer.age || '?'}</div>
                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-1 ${matchedSkills ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{matchedSkills ? '✓ מתאים' : 'מרחוק'}</div>
                </div>
                <div className="text-left text-[11px] text-gray-400 whitespace-nowrap">
                    {distFormatted && <div className="flex items-center gap-1"><MapPin size={10} /> {distFormatted}</div>}
                    {volunteer.has_car && <div className="flex items-center gap-1 text-emerald-600 font-bold mt-1"><Car size={10} /> רכב</div>}
                </div>
            </div>

            <div className="flex gap-2 mt-2">
                <button
                    onClick={() => onAssign(volunteer, task)}
                    className="flex-1 bg-primary text-white py-1.5 rounded-lg font-bold shadow-sm hover:bg-blue-700 transition text-[11px] flex items-center justify-center gap-1"
                >
                    <UserPlus size={12} /> שיבוץ
                </button>
                <button
                    onClick={() => onWhatsApp(volunteer, task)}
                    className="flex-1 bg-emerald-500 text-white py-1.5 rounded-lg font-bold shadow-sm hover:bg-emerald-600 transition text-[11px] flex items-center justify-center gap-1"
                >
                    <MessageCircle size={12} /> WhatsApp
                </button>
            </div>
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
    const [matchGender, setMatchGender] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    const fetchTable = async (table) => {
        let all = [];
        let from = 0;
        let finished = false;
        while (!finished) {
            const { data, error } = await supabase.from(table).select('*').range(from, from + 999);
            if (error || !data || data.length === 0) finished = true;
            else {
                all = [...all, ...data];
                if (data.length < 1000) finished = true;
                else from += 1000;
            }
        }
        return all;
    };

    const loadData = async () => {
        setIsLoading(true);
        const [t, v, a] = await Promise.all([fetchTable('tasks'), fetchTable('volunteers'), fetchTable('assignments')]);
        setTasks(t);
        setAllVolunteers(v);
        setAssignments(a);
        setIsLoading(false);
    };

    useEffect(() => { loadData(); }, []);
    useEffect(() => { if (targetedId) setExpandedTaskId(targetedId); }, [targetedId]);

    const cities = useMemo(() => {
        const raw = [...new Set(tasks.map(t => t.city).filter(Boolean))].sort();
        return [...PRIORITY_CITIES.filter(pc => raw.includes(pc)), ...raw.filter(r => !PRIORITY_CITIES.includes(r))];
    }, [tasks]);

    const filtered = useMemo(() => {
        return tasks.filter(t => {
            if (t.is_archived !== showArchived) return false;
            if (targetedId && t.id === targetedId) return true;
            if (targetedId) return false;
            if (search && !t.name?.toLowerCase().includes(search.toLowerCase())) return false;
            if (filterUrgency && t.urgency !== filterUrgency) return false;
            if (filterStatus && t.status !== filterStatus) return false;
            if (filterCity && t.city !== filterCity) return false;
            return true;
        });
    }, [tasks, search, filterUrgency, filterStatus, filterCity, targetedId, showArchived]);

    const [search, setSearch] = useState('');
    const [filterUrgency, setFilterUrgency] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCity, setFilterCity] = useState('');

    const handleAssign = async (volunteer, task) => {
        const { data, error } = await supabase.from('assignments').insert({ task_id: task.id, volunteer_id: volunteer.id, status: 'assigned' }).select();
        if (error) { if (error.code === '23505') alert('כבר משובץ'); else alert('שגיאה: ' + error.message); return; }
        if (data) setAssignments([...assignments, data[0]]);
        if (task.status === 'open') {
            await supabase.from('tasks').update({ status: 'assigning' }).eq('id', task.id);
            setTasks(tasks.map(t => t.id === task.id ? { ...t, status: 'assigning' } : t));
        }
    };

    const handleWhatsApp = (volunteer, task) => {
        const name = volunteer.volunteer_type === 'group' ? volunteer.group_name : volunteer.full_name;
        const phone = volunteer.volunteer_type === 'group' ? volunteer.contact_phone : volunteer.phone;
        const msg = `היי ${name},\nמשימה קרובה: *${task.name}*\nכתובת: ${task.address}, ${task.city}\nאישור?`;
        const phoneNum = (phone || '').replace(/[^0-9]/g, '');
        const intlPhone = phoneNum.startsWith('0') ? '972' + phoneNum.slice(1) : phoneNum;
        window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const archiveTask = async (id, undo = false) => {
        const { error } = await supabase.from('tasks').update({ is_archived: !undo, archived_at: undo ? null : new Date().toISOString() }).eq('id', id);
        if (!error) {
            setTasks(tasks.map(t => t.id === id ? { ...t, is_archived: !undo } : t));
        }
    };

    const removeAssignment = async (id) => {
        const { error } = await supabase.from('assignments').delete().eq('id', id);
        if (!error) setAssignments(assignments.filter(a => a.id !== id));
    };

    const getTop15Volunteers = (task) => {
        return [...allVolunteers]
            .filter(v => v.status === 'available')
            .filter(v => matchGender ? v.gender === matchGender : true)
            .sort((a, b) => {
                const distA = task.lat ? getDistance({ latitude: task.lat, longitude: task.lng }, { latitude: a.lat, longitude: a.lng }) : 999999;
                const distB = task.lat ? getDistance({ latitude: task.lat, longitude: task.lng }, { latitude: b.lat, longitude: b.lng }) : 999999;
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
        <div className="space-y-5 animate-in fade-in duration-500 pb-20 text-right" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">{showArchived ? 'ארכיון משימות' : 'משימות פעילות'}</h2>
                    <p className="text-gray-500 text-sm">ניהול {filtered.length} משימות</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 ${showArchived ? 'bg-primary text-white' : 'bg-white text-gray-600 border-gray-200'}`}
                    >
                        <Archive size={16} /> {showArchived ? 'חזרה למשימות פעילות' : 'צפייה בארכיון'}
                    </button>
                    {!showArchived && (
                        <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="px-5 py-2 bg-primary text-white rounded-xl font-bold shadow-md hover:scale-105 transition-all flex items-center gap-2">
                            <Plus size={18} /> משימה חדשה
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" placeholder="חיפוש משימה..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-sm" /></div>
                <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                    <option value="">כל האזורים</option>
                    <optgroup label="אזורים חשובים">{PRIORITY_CITIES.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>
                    <optgroup label="שאר הארץ">{cities.filter(c => !PRIORITY_CITIES.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}</optgroup>
                </select>
                <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"><option value="">דחיפות (הכל)</option>{Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"><option value="">סטטוס (הכל)</option><option value="open">פתוחה</option><option value="assigning">בשיבוץ</option><option value="completed">הושלמה</option></select>
                {(search || filterCity || filterUrgency || targetedId) && (<button onClick={() => { setSearch(''); setFilterCity(''); setFilterUrgency(''); setSearchParams({}); }} className="text-gray-400 font-bold text-xs">נקה</button>)}
            </div>

            <div className="space-y-3">
                {isLoading ? <div className="text-center py-20 text-gray-400"><Loader2 className="animate-spin inline mr-2" />טוען...</div> :
                    filtered.length === 0 ? <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">אין משימות להצגה</div> :
                        filtered.map((task) => {
                            const isExpanded = expandedTaskId === task.id;
                            const taskAssigned = assignments.filter(a => a.task_id === task.id);
                            return (
                                <div key={task.id} className={`bg-white rounded-2xl border ${isExpanded ? 'border-primary shadow-lg' : 'border-gray-100 shadow-sm'}`}>
                                    <div className="p-4 flex items-center gap-4">
                                        <div className="cursor-pointer flex-1 flex items-center gap-4" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                                            <div className="flex flex-col gap-1 min-w-[70px]"><div className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-center ${URGENCY_COLORS[task.urgency]}`}>{URGENCY_LABELS[task.urgency]}</div><div className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-center ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</div></div>
                                            <div className="flex-1 min-w-0"><h3 className="font-bold text-gray-900 truncate">{task.name}</h3><div className="flex items-center gap-2 text-xs text-gray-500 font-medium"><MapPin size={12} className="text-gray-400" /> {task.city} · {task.type}</div></div>
                                            <div className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">שובצו {taskAssigned.length}</div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => { setEditingTask(task); setIsModalOpen(true); }} className="p-2 hover:bg-gray-100 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => archiveTask(task.id, showArchived)} className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${showArchived ? 'text-emerald-500' : 'text-gray-400 hover:text-amber-600'}`}>
                                                {showArchived ? <CheckCircle2 size={16} /> : <Archive size={16} />}
                                            </button>
                                            {!showArchived && <button onClick={async () => { if (confirm('למחוק לצמיתות?')) { await supabase.from('tasks').delete().eq('id', task.id); loadData(); } }} className="p-2 hover:bg-gray-100 text-gray-400 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={16} /></button>}
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 p-5 bg-gray-50/20">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">מתנדבים מומלצים</h4>
                                                        <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-100">
                                                            <button onClick={() => setMatchGender('')} className={`px-2 py-1 text-[10px] rounded-md transition-all ${!matchGender ? 'bg-primary text-white shadow-sm' : 'text-gray-400'}`}>הכל</button>
                                                            <button onClick={() => setMatchGender('נקבה')} className={`px-2 py-1 text-[10px] rounded-md transition-all ${matchGender === 'נקבה' ? 'bg-pink-100 text-pink-600 font-bold' : 'text-gray-400'}`}>נשים</button>
                                                            <button onClick={() => setMatchGender('זכר')} className={`px-2 py-1 text-[10px] rounded-md transition-all ${matchGender === 'זכר' ? 'bg-blue-100 text-blue-600 font-bold' : 'text-gray-400'}`}>גברים</button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{getTop15Volunteers(task).map(v => (<MatchCard key={v.id} volunteer={v} task={task} onAssign={handleAssign} onWhatsApp={handleWhatsApp} />))}</div>
                                                </div>
                                                <div className="space-y-4 lg:border-r lg:pr-6 border-gray-100">
                                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">שיבוצים פעילים</h4>
                                                    <div className="space-y-2">
                                                        {taskAssigned.length === 0 ? <div className="text-[11px] text-gray-400 italic">אין מתנדבים משובצים עדיין.</div> :
                                                            taskAssigned.map(a => { const vol = allVolunteers.find(v => v.id === a.volunteer_id); return (<div key={a.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><UserCheck size={12} /></div><div className="text-xs font-bold text-gray-800">{vol ? (vol.volunteer_type === 'group' ? vol.group_name : vol.full_name) : 'נמחק'}</div></div><button onClick={() => removeAssignment(a.id)} className="text-gray-300 hover:text-red-500 p-1"><X size={14} /></button></div>); })}
                                                    </div>
                                                    <div className="pt-4 border-t border-gray-100">
                                                        <h4 className="text-[10px] font-black text-gray-400 mb-2">חיפוש ידני לשיבוץ</h4>
                                                        <div className="relative">
                                                            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
                                                            <input type="text" placeholder="הקלד שם לחיפוש..." value={volSearch} onChange={e => setVolSearch(e.target.value)} className="w-full text-xs pr-9 py-2 border border-gray-100 rounded-xl bg-white outline-none focus:ring-1 focus:ring-primary/20" />
                                                        </div>
                                                        {volSearch.length > 2 && (
                                                            <div className="mt-2 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden divide-y divide-gray-50">
                                                                {allVolunteers.filter(v => (v.full_name || v.group_name || '').includes(volSearch)).slice(0, 5).map(v => (
                                                                    <button key={v.id} onClick={() => { handleAssign(v, task); setVolSearch(''); }} className="w-full text-right p-3 hover:bg-gray-50 flex items-center justify-between group">
                                                                        <span className="text-xs font-bold text-gray-700">{v.volunteer_type === 'group' ? v.group_name : v.full_name} ({v.city})</span>
                                                                        <Plus size={14} className="text-gray-300 group-hover:text-primary" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="bg-white p-4 rounded-xl border border-gray-100 mt-4">
                                                        <h5 className="text-[10px] font-black text-gray-400 uppercase mb-2">תיאור המשימה</h5>
                                                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{task.description || 'אין תיאור מפורט.'}</p>
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
