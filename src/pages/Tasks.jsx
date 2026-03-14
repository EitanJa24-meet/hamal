import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, Edit2, MapPin, Users, HeartHandshake, Car, Filter, X, UserCheck, Loader2, Archive, MessageCircle, UserPlus, CheckCircle2, Phone, User, Clock, Calendar, AlertCircle, FileText, Map as MapIcon } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getDistance } from 'geolib';
import TaskModal from '../components/TaskModal';
import { geocodeAddress } from '../utils/geocode';
import { cleanTaskData } from '../utils/taskUtils';
import { useSearchParams, useNavigate } from 'react-router-dom';

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
    const navigate = useNavigate();
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
    const [matchMinAge, setMatchMinAge] = useState('');
    const [matchMaxAge, setMatchMaxAge] = useState('');
    const [matchHasCar, setMatchHasCar] = useState(false);
    const [matchRadiusKm, setMatchRadiusKm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [filterUrgency, setFilterUrgency] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCity, setFilterCity] = useState('');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 50;
    const [assignedVolDetails, setAssignedVolDetails] = useState({});

    const loadData = async (reset = false) => {
        setIsLoading(true);
        const start = reset ? 0 : page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;

        try {
            // Main tasks query with server-side filtering
            let taskQuery = supabase.from('tasks').select('*', { count: 'exact' });

            if (showArchived) taskQuery = taskQuery.eq('is_archived', true);
            else taskQuery = taskQuery.eq('is_archived', false);

            if (search) taskQuery = taskQuery.ilike('name', `%${search}%`);
            if (filterUrgency) taskQuery = taskQuery.eq('urgency', filterUrgency);
            if (filterCity) taskQuery = taskQuery.eq('city', filterCity);

            if (filterStatus) {
                const s = filterStatus.toLowerCase();
                if (s === 'open') taskQuery = taskQuery.in('status', ['open', 'פתוחה']);
                else if (s === 'completed') taskQuery = taskQuery.in('status', ['completed', 'הושלמה']);
                else if (s === 'assigning') taskQuery = taskQuery.in('status', ['assigning', 'בשיבוץ']);
                else taskQuery = taskQuery.eq('status', s);
            }

            const { data: t, error: tErr } = await taskQuery
                .order(showArchived ? 'archived_at' : 'created_at', { ascending: false })
                .range(start, end);

            if (tErr) throw tErr;

            // Fetch assignments for these tasks
            const taskIds = (t || []).map(task => task.id);
            let a = [];
            if (taskIds.length > 0) {
                const { data: assignData } = await supabase.from('assignments').select('*').in('task_id', taskIds);
                a = assignData || [];
            }

            if (reset) {
                setTasks(t || []);
                setAssignments(a);
                setPage(1);
            } else {
                setTasks(prev => [...prev, ...(t || [])]);
                setAssignments(prev => [...prev, ...a]);
                setPage(prev => prev + 1);
            }
            setHasMore((t || []).length === PAGE_SIZE);

            // Fetch details for assigned volunteers specifically
            const volIds = [...new Set(a.map(assign => assign.volunteer_id))];
            if (volIds.length > 0) {
                const { data: vData } = await supabase.from('volunteers').select('id, full_name, group_name, phone, contact_phone, volunteer_type, group_size').in('id', volIds);
                const detailsMap = {};
                (vData || []).forEach(v => { detailsMap[v.id] = v; });
                setAssignedVolDetails(prev => ({ ...prev, ...detailsMap }));
            }

        } catch (e) {
            console.error("Error loading data:", e);
            alert("שגיאה בחיבור לבסיס הנתונים");
        }
        setIsLoading(false);
    };

    useEffect(() => { loadData(true); }, [showArchived, search, filterUrgency, filterStatus, filterCity]);
    useEffect(() => { if (targetedId) setExpandedTaskId(targetedId); }, [targetedId]);

    const cities = useMemo(() => {
        const raw = [...new Set(tasks.map(t => t.city).filter(Boolean))].sort();
        return [...PRIORITY_CITIES.filter(pc => raw.includes(pc)), ...raw.filter(r => !PRIORITY_CITIES.includes(r))];
    }, [tasks]);

    const filtered = useMemo(() => {
        return tasks; // Filtering now happens on the server
    }, [tasks]);

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

    const [relevantVolunteers, setRelevantVolunteers] = useState({});

    useEffect(() => {
        if (expandedTaskId) {
            const task = tasks.find(t => t.id === expandedTaskId);
            if (task && !relevantVolunteers[expandedTaskId]) {
                fetchRelevantVolunteers(task);
            }
        }
    }, [expandedTaskId]);

    const fetchRelevantVolunteers = async (task) => {
        const { data, error } = await supabase.from('volunteers')
            .select('*')
            .eq('status', 'available')
            .limit(100);

        if (!error && data) {
            const assignedIds = assignments.filter(a => a.task_id === task.id).map(a => a.volunteer_id);
            let extra = [];
            if (assignedIds.length > 0) {
                const { data: extraVol } = await supabase.from('volunteers').select('*').in('id', assignedIds);
                extra = extraVol || [];
            }
            setRelevantVolunteers(prev => ({ ...prev, [task.id]: [...data, ...extra] }));
        }
    };

    const getTop15Volunteers = (task) => {
        const volPool = relevantVolunteers[task.id] || [];
        const needed = task.volunteers_needed || 1;
        return [...volPool]
            .filter(v => {
                if (matchGender && v.gender !== matchGender) return false;
                if (matchMinAge && (v.age || 0) < parseInt(matchMinAge)) return false;
                if (matchMaxAge && (v.age || 0) > parseInt(matchMaxAge)) return false;
                if (matchHasCar && !v.has_car) return false;
                return true;
            })
            .sort((a, b) => {
                const getScore = (vol) => {
                    const dist = (task.lat && vol.lat && vol.lng)
                        ? getDistance(
                            { latitude: parseFloat(task.lat), longitude: parseFloat(task.lng) },
                            { latitude: parseFloat(vol.lat), longitude: parseFloat(vol.lng) }
                        )
                        : 999999;

                    if (matchRadiusKm) {
                        const radiusMeters = parseInt(matchRadiusKm) * 1000;
                        if (!isNaN(radiusMeters) && dist > radiusMeters) return Number.POSITIVE_INFINITY;
                    }

                    let score = dist;

                    if (needed >= 3) {
                        if (vol.volunteer_type === 'group') {
                            score -= 5000;
                            if (vol.group_size >= 5) score -= 3000;
                        }
                        if (vol.has_car) score -= 2000;
                    }

                    const matchesSkills = (vol.skills || []).some(s => (task.type || '').includes(s) || s === 'עזרה כללית');
                    if (matchesSkills) score -= 1000;

                    return score;
                };

                return getScore(a) - getScore(b);
            }).slice(0, 15);
    };

    const updateAssignmentNote = async (id, note) => {
        const { error } = await supabase.from('assignments').update({ note }).eq('id', id);
        if (error) {
            alert('שגיאה בעדכון הערה: ' + error.message);
        } else {
            setAssignments(prev => prev.map(a => a.id === id ? { ...a, note } : a));
        }
    };

    const handleSave = async (data) => {
        let lat = data.lat, lng = data.lng;
        if (!data.id) {
            try {
                const loc = await geocodeAddress(data.address, data.city);
                lat = loc.lat; lng = loc.lng;
            } catch (e) { console.error(e); }
        }

        const clean = cleanTaskData({ ...data, lat, lng });

        if (data.id) {
            const { error } = await supabase.from('tasks').update(clean).eq('id', data.id);
            if (!error) {
                setTasks(tasks.map(t => t.id === data.id ? { ...t, ...clean } : t));
                alert("המשימה עודכנה בהצלחה");
            } else {
                alert("שגיאה בעדכון: " + error.message);
            }
        } else {
            const { data: inserted, error } = await supabase.from('tasks').insert([clean]).select();
            if (inserted) {
                setTasks([inserted[0], ...tasks]);
                alert("המשימה נוספה בהצלחה!");
            } else {
                alert("שגיאה בהוספה: " + (error?.message || "משהו השתבש"));
            }
        }
        setIsModalOpen(false);
    };

    const formatTimeInfo = (task) => {
        if (task.time_type === 'none') return task.notes ? `בלי זמן מוגדר (${task.notes})` : 'ללא זמן מוגדר';

        const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) + ' ' + new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '';

        if (task.time_type === 'range') {
            return `בין ${fmt(task.start_date)} ל-${fmt(task.end_date)}`;
        }

        const d = new Date(task.due_date || task.start_date);
        const dateStr = d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

        if (task.time_type === 'until') return `עד לתאריך: ${dateStr} ב-${timeStr}`;
        return `במועד: ${dateStr} בשעה ${timeStr}`;
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
                    ) : (
                        <>
                        {filtered.map((task) => {
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
                                            <div className="flex flex-col items-end gap-1 min-w-[140px]">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">גיוס מתנדבים</div>
                                                <div className="flex items-center gap-2 w-full bg-gray-100 h-2.5 rounded-full overflow-hidden border border-gray-200/50">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${(taskAssigned.reduce((acc, a) => acc + (assignedVolDetails[a.volunteer_id]?.volunteer_type === 'group' ? (assignedVolDetails[a.volunteer_id]?.group_size || 1) : 1), 0) / (task.volunteers_needed || 1)) >= 1 ? 'bg-emerald-500' : 'bg-primary'
                                                            }`}
                                                        style={{ width: `${Math.min(100, (taskAssigned.reduce((acc, a) => acc + (assignedVolDetails[a.volunteer_id]?.volunteer_type === 'group' ? (assignedVolDetails[a.volunteer_id]?.group_size || 1) : 1), 0) / (task.volunteers_needed || 1)) * 100)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="text-[11px] font-black text-gray-700 mt-0.5">
                                                    {taskAssigned.reduce((acc, a) => {
                                                        const v = assignedVolDetails[a.volunteer_id];
                                                        const size = (v?.volunteer_type === 'group' ? v.group_size : 1) || 1;
                                                        return acc + size;
                                                    }, 0)} / {task.volunteers_needed || 1} רשומים
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => navigate(`/map?taskId=${task.id}`)}
                                                className="p-2.5 bg-gray-50 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-xl transition-all"
                                            >
                                                <MapIcon size={18} />
                                            </button>
                                            <button onClick={() => { setEditingTask(task); setIsModalOpen(true); }} className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                                            <button onClick={() => archiveTask(task.id, showArchived)} className={`p-2.5 bg-gray-50 rounded-xl transition-all ${showArchived ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}>
                                                {showArchived ? <CheckCircle2 size={18} /> : <Archive size={18} />}
                                            </button>
                                            <button onClick={async () => { if (confirm('למחוק לצמיתות?')) { await supabase.from('tasks').delete().eq('id', task.id); loadData(); } }} className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="border-t border-gray-50 p-6 bg-gray-50/10">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                {/* Matches Column */}
                                                <div className="space-y-5">
                                                    <div className="flex justify-between items-center bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mr-3">המלצות למתנדבים (לחיצה לשיבוץ)</h4>
                                                        <div className="flex flex-wrap gap-1.5 items-center">
                                                            <button onClick={() => setMatchGender('')} className={`px-3 py-1.5 text-[10px] rounded-xl transition-all font-black ${!matchGender ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:bg-gray-100'}`}>הכל</button>
                                                            <button onClick={() => setMatchGender('נקבה')} className={`px-3 py-1.5 text-[10px] rounded-xl transition-all font-black ${matchGender === 'נקבה' ? 'bg-pink-100 text-pink-600 shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}>נשים</button>
                                                            <button onClick={() => setMatchGender('זכר')} className={`px-3 py-1.5 text-[10px] rounded-xl transition-all font-black ${matchGender === 'זכר' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'text-gray-400 hover:bg-gray-100'}`}>גברים</button>
                                                            <div className="flex items-center gap-1 ml-2">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    placeholder="מגיל"
                                                                    value={matchMinAge}
                                                                    onChange={e => setMatchMinAge(e.target.value)}
                                                                    className="w-14 px-2 py-1 border border-gray-200 rounded-lg text-[10px] outline-none"
                                                                />
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    placeholder="עד גיל"
                                                                    value={matchMaxAge}
                                                                    onChange={e => setMatchMaxAge(e.target.value)}
                                                                    className="w-14 px-2 py-1 border border-gray-200 rounded-lg text-[10px] outline-none"
                                                                />
                                                                <select
                                                                    value={matchRadiusKm}
                                                                    onChange={e => setMatchRadiusKm(e.target.value)}
                                                                    className="px-2 py-1 border border-gray-200 rounded-lg text-[10px] outline-none bg-white"
                                                                >
                                                                    <option value="">כל מרחק</option>
                                                                    <option value="2">עד 2 קמ</option>
                                                                    <option value="5">עד 5 קמ</option>
                                                                    <option value="10">עד 10 קמ</option>
                                                                </select>
                                                                <label className="flex items-center gap-1 text-[10px] text-gray-500 font-bold mr-2 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={matchHasCar}
                                                                        onChange={e => setMatchHasCar(e.target.checked)}
                                                                        className="w-3 h-3 rounded text-primary"
                                                                    />
                                                                    רק עם רכב
                                                                </label>
                                                            </div>
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
                                                                    const vol = (relevantVolunteers[task.id] || []).find(v => v.id === a.volunteer_id);
                                                                    return (
                                                                        <div key={a.id} className="bg-white p-3.5 rounded-2xl border border-gray-100 flex flex-col gap-2 shadow-sm hover:shadow-md transition-all group ring-primary-50">
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/50"><UserCheck size={16} /></div>
                                                                                    <div>
                                                                                        <div className="text-xs font-black text-gray-800">{vol ? (vol.volunteer_type === 'group' ? vol.group_name : vol.full_name) : 'נמחק'}</div>
                                                                                        <div className="text-[10px] text-gray-400 font-bold" dir="ltr">{vol?.phone || vol?.contact_phone || '-'}</div>
                                                                                    </div>
                                                                                </div>
                                                                                <button onClick={() => removeAssignment(a.id)} className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"><X size={16} /></button>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-[10px] font-black text-gray-400 mb-1">הערה למשימה זו עבור מתנדב זה</label>
                                                                                <textarea
                                                                                    rows="2"
                                                                                    defaultValue={a.note || ''}
                                                                                    onBlur={e => updateAssignmentNote(a.id, e.target.value)}
                                                                                    className="w-full text-[11px] px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/10"
                                                                                    placeholder="לדוגמה: דיברתי, מגיע מחר / לא עונה / לבקש להתקשר שוב בערב..."
                                                                                />
                                                                            </div>
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
                                                                {(relevantVolunteers[task.id] || []).filter(v => (v.full_name || v.group_name || '').toLowerCase().includes(volSearch.toLowerCase())).slice(0, 5).map(v => (
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
                        </>
                    )}
                {hasMore && !isLoading && (
                    <div className="flex justify-center pt-4">
                        <button onClick={() => loadData(false)} className="px-8 py-3 bg-white border border-gray-200 text-primary font-black rounded-2xl hover:bg-gray-50 transition-all shadow-sm">טען משימות נוספות...</button>
                    </div>
                )}
            </div>
            <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} task={editingTask} onSave={handleSave} />
        </div>
    );
};

export default Tasks;
