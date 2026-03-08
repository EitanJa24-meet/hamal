import React, { useState, useEffect } from 'react';
import { Search, Plus, Download, ChevronDown, Trash2, Edit2, MapPin, Users } from 'lucide-react';
import { supabase } from '../supabaseClient';

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

const Tasks = () => {
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        supabase.from('tasks').select('*')
            .then(({ data, error }) => {
                if (!error && data) setTasks(data);
                else console.error("Error fetching tasks:", error);
            });
    }, []);

    const handleDelete = async (id) => {
        if (confirm("Are you sure you want to delete this task?")) {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (!error) {
                setTasks(tasks.filter(t => t.id !== id));
            } else {
                console.error("Error deleting task:", error);
            }
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">משימות</h2>
                    <p className="text-gray-500 mt-1">{tasks.length} משימות · {tasks.length} מוצגות</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-gray-50 transition-colors shadow-sm">
                        <Download size={18} className="text-gray-400" />
                        ייצוא
                    </button>
                    <button className="bg-primary hover:bg-blue-700 text-white px-5 py-2 rounded-xl flex items-center gap-2 font-semibold shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95">
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
                        placeholder="חיפוש..."
                    />
                </div>
            </div>

            {/* Tasks List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                    {tasks.map((task) => (
                        <div key={task.id} className="p-4 hover:bg-gray-50/80 transition-colors group flex items-center justify-between">

                            <div className="flex items-center gap-4 w-32">
                                <button
                                    onClick={() => handleDelete(task.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                    <Edit2 size={18} />
                                </button>
                            </div>

                            <div className="flex-1 flex justify-end gap-12 items-center">
                                <div className="text-left min-w-[150px]">
                                    <h4 className="font-bold text-gray-900 text-lg tracking-wide">{task.id}</h4>
                                    <div className="flex items-center justify-end gap-2 mt-2">
                                        {task.general_help === 1 && (
                                            <Badge colorClass="bg-gray-100 text-gray-600 border border-gray-200">עזרה כללית</Badge>
                                        )}
                                        <Badge colorClass="bg-emerald-100 text-emerald-700">{task.status}</Badge>
                                        <Badge colorClass={task.priority === 'גבוהה' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>{task.priority}</Badge>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 text-gray-500 text-sm">
                                    <div className="flex items-center gap-1">
                                        <span>{task.volunteers_assigned}/{task.volunteers_needed}</span>
                                        <Users size={16} className="text-gray-400" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span>{task.location}</span>
                                        <MapPin size={16} className="text-gray-400" />
                                    </div>
                                </div>

                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Tasks;
