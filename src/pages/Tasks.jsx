import React, { useState, useEffect } from 'react';
import { Search, Plus, Download, ChevronDown, Trash2, Edit2, MapPin, Users, HeartHandshake, Phone, Car } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getDistance } from 'geolib';
import TaskModal from '../components/TaskModal';
import * as XLSX from 'xlsx';

const FilterSelect = ({ label }) => (
    <div className="relative">
        <select className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-40 cursor-pointer">
            <option>{label}</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
            <ChevronDown size={16} />
        </div>
    </div>
);

const Badge = ({ children, colorClass }) => (
    <span className={`px-2.5 py-1 rounded-md text-sm font-medium ${colorClass}`}>
        {children}
    </span>
);

const MatchCard = ({ volunteer, task, onAssign }) => {
    let distFormatted = 'מרחק לא זמין';
    if (volunteer.lat && volunteer.lng && task.lat && task.lng) {
        const distMeters = getDistance(
            { latitude: task.lat, longitude: task.lng },
            { latitude: volunteer.lat, longitude: volunteer.lng }
        );
        distFormatted = distMeters > 1000 ? `${(distMeters / 1000).toFixed(1)} ק"מ` : `${distMeters} מטרים`;
    }

    const matchedSkills = volunteer.skills?.filter(s => task.type.includes(s) || s === 'עזרה כללית').length > 0;

    return (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col hover:border-blue-200 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h5 className="font-bold text-gray-900">{volunteer.full_name} <span className="text-gray-500 text-sm font-normal">({volunteer.age})</span></h5>
                    <div className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded inline-block mt-1">
                        התאמה: {matchedSkills ? 'גבוהה מיומנות' : 'קרבה גיאוגרפית'}
                    </div>
                </div>
                <div className="text-left text-sm text-gray-500 flex flex-col items-end">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {distFormatted}</span>
                    {volunteer.has_car && <span className="flex items-center gap-1 text-emerald-600 mt-1"><Car size={12} /> יש רכב</span>}
                </div>
            </div>
            <div className="flex gap-2 mt-4 text-sm mt-auto">
                <button
                    onClick={() => onAssign(volunteer, task)}
                    className="flex-1 bg-primary text-white py-1.5 rounded-lg font-semibold shadow-sm hover:bg-blue-700 transition"
                >
                    שבץ מתנדב
                </button>
            </div>
        </div>
    );
};

const Tasks = () => {
    const [tasks, setTasks] = useState([]);
    const [volunteers, setVolunteers] = useState([]);
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    useEffect(() => {
        const load = async () => {
            const { data: t } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
            const { data: v } = await supabase.from('volunteers').select('*').eq('status', 'available');
            if (t) setTasks(t);
            if (v) setVolunteers(v);
        };
        load();
    }, []);

    const handleDelete = async (id) => {
        if (confirm("האם למחוק משימה זו?")) {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (!error) setTasks(tasks.filter(t => t.id !== id));
        }
    };

    const handleAssign = async (volunteer, task) => {
        // Mock WhatsApp generation
        const msg = `היי ${volunteer.full_name}, צוות חמ"ל דרפ כאן.\nישנה משימה מתאימה עבורך:\n*${task.name}*\nכתובת: ${task.address}, ${task.city}\nזמן: בהקדם האפשרי\nדחיפות: ${task.urgency}\n\nנשמח אם תוכל/י לאשר הגעה בחזרה להודעה זו. שנדע ימים שקטים 🙏`;
        const phoneFormatted = volunteer.phone.replace(/[^0-9]/g, ''); // Convert 050-123 to 050123
        const finalPhone = phoneFormatted.startsWith('0') ? '972' + phoneFormatted.slice(1) : phoneFormatted;

        window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank');

        // Mark volunteer as assigned in DB
        await supabase.from('volunteers').update({ status: 'assigned' }).eq('id', volunteer.id);
        const { data: v } = await supabase.from('volunteers').select('*').eq('status', 'available');
        setVolunteers(v);
    };

    const getRecommendedVolunteers = (task) => {
        if (!task.lat || !task.lng) return volunteers.slice(0, 4);

        // Sort by distance roughly
        const sorted = [...volunteers].sort((a, b) => {
            if (!a.lat) return 1;
            if (!b.lat) return -1;
            const distA = getDistance({ latitude: task.lat, longitude: task.lng }, { latitude: a.lat, longitude: a.lng });
            const distB = getDistance({ latitude: task.lat, longitude: task.lng }, { latitude: b.lat, longitude: b.lng });
            return distA - distB;
        });
        return sorted.slice(0, 4); // Top 4
    };

    const handleSave = async (data) => {
        const lat = data.lat || (32.0853 + (Math.random() * 0.1 - 0.05));
        const lng = data.lng || (34.7818 + (Math.random() * 0.1 - 0.05));

        if (data.id) {
            const { error } = await supabase.from('tasks').update(data).eq('id', data.id);
            if (!error) setTasks(tasks.map(t => t.id === data.id ? data : t));
        } else {
            const { data: inserted, error } = await supabase.from('tasks').insert([{ ...data, lat, lng }]).select();
            if (!error && inserted) setTasks([inserted[0], ...tasks]);
        }
        setIsModalOpen(false);
    };

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(tasks);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tasks");
        XLSX.writeFile(wb, "Tasks_Export.xlsx");
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">משימות</h2>
                    <p className="text-gray-500 mt-1">{tasks.length} משימות · מציג הכל</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExport} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-gray-50 transition-colors shadow-sm">
                        <Download size={18} className="text-gray-400" />
                        ייצוא נתונים
                    </button>
                    <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="bg-primary hover:bg-blue-700 text-white px-5 py-2 rounded-xl flex items-center gap-2 font-semibold shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                        <Plus size={20} />
                        משימה חדשה
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex justify-between items-center bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                <div className="flex gap-3">
                    <FilterSelect label="כל הסוגים" />
                    <FilterSelect label="כל הדחופיות" />
                    <FilterSelect label="כל הסטטוסים" />
                </div>
                <div className="relative w-64">
                    <div className="absolute inset-y-0 right-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-gray-400 mr-3" />
                    </div>
                    <input
                        type="text"
                        className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block pr-10 p-2.5 transition-shadow hover:shadow-sm"
                        placeholder="חיפוש חופשי..."
                    />
                </div>
            </div>

            {/* Tasks List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                    {tasks.map((task) => {
                        const isExpanded = expandedTaskId === task.id;
                        return (
                            <div key={task.id} className={`transition-all duration-300 ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-gray-50/80'}`}>
                                <div
                                    className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer group"
                                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                                >
                                    <div className="flex flex-1 items-center justify-end w-full md:w-auto gap-4 md:gap-12 pl-4">
                                        <div className="text-left w-full md:w-auto pl-8">
                                            <h4 className="font-bold text-gray-900 text-xl tracking-wide flex items-center justify-end gap-2">
                                                {task.name || task.type}
                                                {task.urgency === 'high' && <Badge colorClass="bg-red-100 text-red-700 ml-2">חירום</Badge>}
                                            </h4>
                                            <p className="text-sm text-gray-500 mt-1 max-w-lg mx-auto md:ml-0 md:mr-auto truncate" dir="rtl">{task.description}</p>

                                            <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
                                                {task.general_help && <Badge colorClass="bg-gray-100 text-gray-600 border border-gray-200">עזרה כללית</Badge>}
                                                <Badge colorClass="bg-emerald-100 text-emerald-700">{task.status}</Badge>
                                                <Badge colorClass={task.urgency === 'high' ? "bg-red-100 text-red-700 border border-red-200" : "bg-blue-100 text-blue-700"}>{task.urgency}</Badge>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2 text-gray-600 font-medium">
                                            <div className="flex items-center gap-1.5 bg-gray-100/80 px-2 py-1 rounded-md text-sm">
                                                <span>{task.volunteers_assigned}/{task.volunteers_needed}</span>
                                                <Users size={16} className="text-primary" />
                                            </div>
                                            <div className="flex items-center gap-1.5 text-sm">
                                                <span>{task.address}, {task.city}</span>
                                                <MapPin size={16} className="text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons (Hover) */}
                                    <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pr-4">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingTask(task); setIsModalOpen(true); }}
                                            className="p-2 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold shadow-md shadow-primary/20 hover:bg-blue-700 ml-4">
                                            <HeartHandshake size={20} />
                                            מנוע שיבוץ
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Smart Matching Panel */}
                                {isExpanded && (
                                    <div className="px-6 py-4 border-t border-blue-100 bg-white" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-2 mb-4">
                                            <HeartHandshake className="text-blue-500" size={24} />
                                            <h4 className="text-lg font-bold text-gray-900 tracking-tight">המלצות שיבוץ מתנדבים <span className="text-sm font-normal text-gray-500">(מדורג לפי קרבה גיאוגרפית וכישורים)</span></h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {getRecommendedVolunteers(task).map(vol => (
                                                <MatchCard key={vol.id} volunteer={vol} task={task} onAssign={handleAssign} />
                                            ))}
                                            {getRecommendedVolunteers(task).length === 0 && (
                                                <div className="col-span-full py-6 text-center text-gray-500 font-medium">לא נמצאו מתנדבים פנויים המתאימים למשימה.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} task={editingTask} onSave={handleSave} />
        </div>
    );
};

export default Tasks;
