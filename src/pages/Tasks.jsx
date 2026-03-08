import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, Edit2, MapPin, Users, HeartHandshake, Car, Filter, X, UserCheck, Loader2, Archive, MessageCircle, UserPlus, CheckCircle2, Phone, User, Clock, Calendar, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getDistance } from 'geolib';
import TaskModal from '../components/TaskModal';
import { geocodeAddress } from '../utils/geocode';
import { useSearchParams } from 'react-router-dom';

const URGENCY_COLORS = { low: 'bg-gray-100 text-gray-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-orange-100 text-orange-700', emergency: 'bg-red-100 text-red-700 border border-red-200' };
const URGENCY_LABELS = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה', emergency: '🚨 חירום' };
const STATUS_COLORS = { open: 'bg-blue-100 text-blue-700', assigning: 'bg-purple-100 text-purple-700', completed: 'bg-emerald-100 text-emerald-700' };
const STATUS_LABELS = { open: 'פתוחה', assigning: 'בשיבוץ', completed: 'הושלמה' };
const PRIORITY_CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'שדרות', 'אשקלון'];

const MatchCard = ({ volunteer, task, onAssign, onWhatsApp }) => {
    let distFormatted = '';
    const vLat = parseFloat(volunteer.lat);
    const vLng = parseFloat(volunteer.lng);
    const tLat = parseFloat(task.lat);
    const tLng = parseFloat(task.lng);

    if (!isNaN(vLat) && !isNaN(vLng) && !isNaN(tLat) && !isNaN(tLng)) {
        try {
            const d = getDistance({ latitude: tLat, longitude: tLng }, { latitude: vLat, longitude: vLng });
            distFormatted = d > 1000 ? `${(d / 1000).toFixed(1)} ק"מ` : `${d} מ'`;
        } catch (e) { console.error(e); }
    }
    const matchedSkills = (volunteer.skills || []).some(s => (task.type || '').includes(s) || s === 'עזרה כללית');

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col hover:border-primary/30 hover:shadow-md transition-all group overflow-hidden relative">
            <div className="flex justify-between items-start mb-3 text-right">
                <div className="min-w-0 flex-1">
                    <h5 className="font-black text-gray-900 leading-tight truncate text-sm">
                        {volunteer.volunteer_type === 'group' ? volunteer.group_name : volunteer.full_name}
                    </h5>
                    <div className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                        {volunteer.gender || 'מתנדב'} · גיל {volunteer.age || '?'}
                    </div>
                </div>
                <div className="text-left text-[10px] text-gray-400 font-bold whitespace-nowrap">
                    {distFormatted && <div className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded-lg border border-gray-100"><MapPin size={10} /> {distFormatted}</div>}
                </div>
            </div>

            <div className="flex gap-2 mt-auto">
                <button
                    onClick={() => onAssign(volunteer, task)}
                    className="flex-1 bg-primary text-white py-2 rounded-xl font-bold shadow-sm hover:bg-blue-700 transition-all text-[11px] flex items-center justify-center gap-1.5 active:scale-95"
                >
                    <UserPlus size={12} /> שיבוץ
                </button>
                <button
                    onClick={() => onWhatsApp(volunteer, task)}
                    className="flex-1 bg-emerald-500 text-white py-2 rounded-xl font-bold shadow-sm hover:bg-emerald-600 transition-all text-[11px] flex items-center justify-center gap-1.5 active:scale-95"
                >
                    <MessageCircle size={12} /> WA
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

    // Filters
    const [search, setSearch] = useState('');
    const [filterUrgency, setFilterUrgency] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCity, setFilterCity] = useState('');

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
        try {
            const [t, v, a] = await Promise.all([fetchTable('tasks'), fetchTable('volunteers'), fetchTable('assignments')]);
            setTasks(t || []);
            setAllVolunteers(v || []);
            setAssignments(a || []);
        } catch (e) { console.error("Error loading data:", e); }
        setIsLoading(false);
    };

    useEffect(() => { loadData(); }, []);
    useEffect(() => { if (targetedId) setExpandedTaskId(targetedId); }, [targetedId]);

    const cities = useMemo(() => {
        const raw = [...new Set(tasks.map(t => t.city).filter(Boolean))].sort();
        return [...PRIORITY_CITIES.filter(pc => raw.includes(pc)), ...raw.filter(r => !PRIORITY_CITIES.includes(r))];
    }, [tasks]);

    const filtered = useMemo(() => {
        return (tasks || []).filter(t => {
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
                const distA = task.lat ? getDistance({ latitude: parseFloat(task.lat), longitude: parseFloat(task.lng) }, { latitude: parseFloat(a.lat), longitude: parseFloat(a.lng) }) : 999999;
                const distB = task.lat ? getDistance({ latitude: parseFloat(task.lat), longitude: parseFloat(task.lng) }, { latitude: parseFloat(b.lat), longitude: parseFloat(b.lng) }) : 999999;
                return distA - distB;
            }).slice(0, 15);
    };

    const handleSave = async (data) => {
        let lat = data.lat, lng = data.lng;
        if (!data.id) {
            try {
                const loc = await geocodeAddress(data.address, data.city);
                lat = loc.lat; lng = loc.lng;
            } catch (e) { console.error(e); }
        }
        const allowedFields = ['name', 'type', 'description', 'address', 'city', 'lat', 'lng', 'urgency', 'volunteers_needed', 'status', 'requester_name', 'requester_phone', 'time_type', 'due_date', 'notes'];
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

    const formatTimeInfo = (task) => {
        if (task.time_type === 'none') return task.notes ? `בלי זמן מוגדר (${task.notes})` : 'ללא זמן מוגדר';
        const d = new Date(task.due_date);
        const dateStr = d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        if (task.time_type === 'specific') return `במועד: ${dateStr} בשעה ${timeStr}`;
        if (task.time_type === 'until') return `עד לתאריך: ${dateStr} ב-${timeStr}`;
        return '-';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20 text-right" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-gray-900">{showArchived ? 'ארכיון משימות' : 'משימות פעילות'}</h2>
                    <p className="text-gray-400 text-sm font-bold flex items-center gap-1.5 mt-1"><AlertCircle size={14} /> ניהול {filtered.length} משימות בפריסה ארצית</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black border-2 transition-all flex items-center gap-2 shadow-sm ${showArchived ? 'bg-primary border-primary text-white' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'}`}
                    >
                        {showArchived ? <CheckCircle2 size={16} /> : <Archive size={16} />}
                        {showArchived ? 'חזרה לפעילויות' : 'ארכיון משימות'}
                    </button>
                    {!showArchived && (
                        <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="px-5 py-2.5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                            <Plus size={18} /> משימה חדשה
                        </button>
                    )}
                </div>
            </div>

            {/* Top Filters */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input type="text" placeholder="חיפוש לפי שם משימה..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pr-12 pl-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all" />
                </div>
                <div className="flex flex-wrap gap-2">
                    <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="px-4 py-3 border border-gray-100 rounded-2xl text-xs font-bold bg-gray-50/50 outline-none focus:border-primary transition-all">
                        <option value="">כל האזורים</option>
                        <optgroup label="אזורים חשובים">{PRIORITY_CITIES.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>
                        <optgroup label="שאר הארץ">{cities.filter(c => !PRIORITY_CITIES.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}</optgroup>
                    </select>
                    <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} className="px-4 py-3 border border-gray-100 rounded-2xl text-xs font-bold bg-gray-50/50 outline-none focus:border-primary transition-all">
                        <option value="">כל הדחיפויות</option>
                        {Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-3 border border-gray-100 rounded-2xl text-xs font-bold bg-gray-50/50 outline-none focus:border-primary transition-all">
                        <option value="">כל הסטטוסים</option>
                        <option value="open">פתוחה</option>
                        <option value="assigning">בשיבוץ</option>
                        <option value="completed">הושלמה</option>
                    </select>
                </div>
                {(search || filterCity || filterUrgency || filterStatus || targetedId) && (
                    <button onClick={() => { setSearch(''); setFilterCity(''); setFilterUrgency(''); setFilterStatus(''); setSearchParams({}); }} className="text-gray-400 font-bold text-xs hover:text-red-500 transition-colors px-2 underline underline-offset-4">נקה הכל</button>
                )}
            </div>

            {/* Tasks List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-gray-100 border-dashed animate-pulse">
                        <Loader2 className="animate-spin text-primary mb-4" size={40} />
                        <div className="text-gray-400 font-black tracking-widest text-sm uppercase">טוען משימות...</div>
                    </div>
                ) :
                    filtered.length === 0 ? (
                        <div className="text-center py-20 text-gray-400 bg-white rounded-3xl border border-gray-100 border-dashed shadow-sm">
                            <Archive className="mx-auto mb-4 opacity-20" size={48} />
                            <div className="font-black">לא נמצאו משימות העונות על הסינון</div>
                            <div className="text-xs mt-1">נסי לשנות את החיפוש או לנקות מסננים</div>
                        </div>
                    ) :
                        filtered.map((task) => {
                            const isExpanded = expandedTaskId === task.id;
                            const taskAssigned = assignments.filter(a => a.task_id === task.id);
                            return (
                                <div key={task.id} className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-primary shadow-2xl ring-4 ring-primary/5' : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'}`} id={`task-${task.id}`}>
                                    <div className="p-5 flex items-center gap-5">
                                        <div className="cursor-pointer flex-1 flex items-center gap-5" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                                            <div className="flex flex-col gap-1.5 min-w-[90px]">
                                                <div className={`text-[10px] font-black px-2.5 py-1 rounded-full text-center tracking-tight ${URGENCY_COLORS[task.urgency]}`}>{URGENCY_LABELS[task.urgency]}</div>
                                                <div className={`text-[10px] font-black px-2.5 py-1 rounded-full text-center tracking-tight ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-black text-lg text-gray-900 truncate leading-snug">{task.name}</h3>
                                                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 font-bold mt-1">
                                                    <div className="flex items-center gap-1.5"><MapPin size={14} className="text-gray-300" /> {task.city} · {task.address}</div>
                                                    <div className="flex items-center gap-1.5 text-blue-500/70"><User size={14} /> {task.requester_name || 'אנונימי'}</div>
                                                    <div className="flex items-center gap-1.5 text-gray-400"><Clock size={14} /> {formatTimeInfo(task)}</div>
                                                </div>
                                            </div>
                                            <div className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100/50 shadow-sm flex items-center gap-2">
                                                <UserCheck size={16} /> {taskAssigned.length} משובצים
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingTask(task); setIsModalOpen(true); }} className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                                            <button onClick={() => archiveTask(task.id, showArchived)} className={`p-2.5 bg-gray-50 rounded-xl transition-all ${showArchived ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}>
                                                {showArchived ? <CheckCircle2 size={18} /> : <Archive size={18} />}
                                            </button>
                                            {!showArchived && <button onClick={async () => { if (confirm('למחוק לצמיתות?')) { await supabase.from('tasks').delete().eq('id', task.id); loadData(); } }} className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="border-t border-gray-50 p-6 bg-gray-50/10">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                {/* Matches Column */}
                                                <div className="space-y-5">
                                                    <div className="flex justify-between items-center bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mr-3">המלצות למתנדבים (לחיצה לשיבוץ)</h4>
                                                        <div className="flex gap-1.5">
                                                            <button onClick={() => setMatchGender('')} className={`px-3 py-1.5 text-[10px] rounded-xl transition-all font-black ${!matchGender ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:bg-gray-100'}`}>הכל</button>
                                                            <button onClick={() => setMatchGender('נקבה')} className={`px-3 py-1.5 text-[10px] rounded-xl transition-all font-black ${matchGender === 'נקבה' ? 'bg-pink-100 text-pink-600 shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}>נשים</button>
                                                            <button onClick={() => setMatchGender('זכר')} className={`px-3 py-1.5 text-[10px] rounded-xl transition-all font-black ${matchGender === 'זכר' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}>גברים</button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {getTop15Volunteers(task).map(v => (<MatchCard key={v.id} volunteer={v} task={task} onAssign={handleAssign} onWhatsApp={handleWhatsApp} />))}
                                                    </div>
                                                </div>

                                                {/* Assigned Column */}
                                                <div className="space-y-6 lg:border-r lg:pr-10 border-gray-50">
                                                    <div>
                                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">פרטי מבקש הפנייה</h4>
                                                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                                                                    <User size={20} />
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-black text-gray-900">{task.requester_name || 'אנונימי'}</div>
                                                                    <div className="text-xs text-blue-500 font-bold" dir="ltr">{task.requester_phone || 'ללא טלפון'}</div>
                                                                </div>
                                                            </div>
                                                            {task.requester_phone && (
                                                                <a href={`tel:${task.requester_phone}`} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100/50">
                                                                    <Phone size={18} />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">מתנדבים שאושרו ({taskAssigned.length})</h4>
                                                        <div className="space-y-2.5">
                                                            {taskAssigned.length === 0 ? <div className="text-xs text-gray-400 italic bg-white p-4 rounded-2xl border border-gray-100 border-dashed text-center">טרם שובצו מתנדבים למשימה זו.</div> :
                                                                taskAssigned.map(a => {
                                                                    const vol = allVolunteers.find(v => v.id === a.volunteer_id);
                                                                    return (
                                                                        <div key={a.id} className="bg-white p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all group ring-primary-50">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/50"><UserCheck size={16} /></div>
                                                                                <div>
                                                                                    <div className="text-xs font-black text-gray-800">{vol ? (vol.volunteer_type === 'group' ? vol.group_name : vol.full_name) : 'נמחק'}</div>
                                                                                    <div className="text-[10px] text-gray-400 font-bold" dir="ltr">{vol?.phone || vol?.contact_phone || '-'}</div>
                                                                                </div>
                                                                            </div>
                                                                            <button onClick={() => removeAssignment(a.id)} className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"><X size={16} /></button>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>

                                                    <div className="pt-6 border-t border-gray-50">
                                                        <h4 className="text-[10px] font-black text-gray-400 mb-3 block uppercase tracking-tighter">שיבוץ ידני מהמאגר</h4>
                                                        <div className="relative">
                                                            <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
                                                            <input type="text" placeholder="הקלד שם מתנדב לחיפוש..." value={volSearch} onChange={e => setVolSearch(e.target.value)} className="w-full text-xs pr-11 py-3 border border-gray-100 rounded-2xl bg-white outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm" />
                                                        </div>
                                                        {volSearch.length >= 2 && (
                                                            <div className="mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden divide-y divide-gray-50 absolute z-50 w-full max-w-sm ring-1 ring-black/5 animate-in fade-in zoom-in-95">
                                                                {allVolunteers.filter(v => (v.full_name || v.group_name || '').toLowerCase().includes(volSearch.toLowerCase())).slice(0, 5).map(v => (
                                                                    <button key={v.id} onClick={() => { handleAssign(v, task); setVolSearch(''); }} className="w-full text-right p-4 hover:bg-gray-50 flex items-center justify-between group transition-colors">
                                                                        <div>
                                                                            <span className="text-xs font-black text-gray-700 block">{v.volunteer_type === 'group' ? v.group_name : v.full_name}</span>
                                                                            <span className="text-[10px] text-gray-400 font-bold">{v.city} · {v.phone}</span>
                                                                        </div>
                                                                        <Plus size={16} className="text-gray-200 group-hover:text-primary transform duration-200 group-hover:scale-125" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="bg-white p-5 rounded-3xl border border-gray-50 shadow-inner mt-4">
                                                        <h4 className="text-[10px] font-black text-gray-300 uppercase mb-3 flex items-center gap-2"><FileText size={12} /> תיאור והוראות</h4>
                                                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-medium">{task.description || 'אין הוראות מפורטות למשימה זו.'}</p>
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
