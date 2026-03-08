import React, { useState, useEffect } from 'react';
import { X, Phone, User, Clock, Calendar, FileText } from 'lucide-react';

const taskTypes = ['בייביסיטר', 'עזרה לקשישים', 'ניקיון', 'לוגיסטיקה', 'חלוקת אוכל', 'ניקוי רסיסים', 'עזרה כללית', 'הסעות', 'שינוע ציוד'];

const TaskModal = ({ isOpen, onClose, task, onSave }) => {
    const defaultState = {
        name: '', type: 'עזרה כללית', description: '', address: '', city: '',
        urgency: 'medium', volunteers_needed: 1, status: 'open',
        requester_name: '', requester_phone: '', time_type: 'none', due_date: '', notes: ''
    };
    const [formData, setFormData] = useState(defaultState);

    useEffect(() => {
        if (task) {
            // Format due_date for input[type="datetime-local"]
            let formattedDate = '';
            if (task.due_date) {
                const date = new Date(task.due_date);
                formattedDate = date.toISOString().slice(0, 16);
            }
            setFormData({ ...defaultState, ...task, due_date: formattedDate });
        }
        else setFormData(defaultState);
    }, [task, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300" dir="rtl">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative border border-gray-100 animate-in zoom-in-95 duration-300">
                <button onClick={onClose} className="absolute top-6 left-6 p-2.5 bg-gray-50 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-all z-10 shadow-sm">
                    <X size={20} />
                </button>

                <div className="p-8 lg:p-10">
                    <header className="mb-8 border-b border-gray-50 pb-6">
                        <h2 className="text-2xl font-black text-gray-900 leading-tight">{task ? 'עריכת משימה' : 'פתיחת משימה חדשה'}</h2>
                        <p className="text-gray-400 text-sm mt-1 font-medium">אנא מלא את פרטי הפנייה במלואם</p>
                    </header>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Requester Info */}
                        <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50 space-y-4">
                            <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                                <User size={14} /> פרטי המבקש (חובה)
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">שם המבקש</label>
                                    <div className="relative">
                                        <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                        <input required type="text" value={formData.requester_name || ''} onChange={e => setFormData({ ...formData, requester_name: e.target.value })} className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="שם מלא" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">טלפון ליצירת קשר</label>
                                    <div className="relative">
                                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                        <input required type="tel" value={formData.requester_phone || ''} onChange={e => setFormData({ ...formData, requester_phone: e.target.value })} className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="מספר נייד" dir="ltr" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Task Details */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <FileText size={14} /> פרטי המשימה
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">כותרת המשימה</label>
                                    <input required type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="לדוגמה: עזרה בניקיון מקלט" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">סוג המשימה</label>
                                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20">
                                        {taskTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">דחיפות</label>
                                    <select value={formData.urgency} onChange={e => setFormData({ ...formData, urgency: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20">
                                        <option value="low">🟡 נמוכה - כשמזדמן</option>
                                        <option value="medium">🟠 בינונית - רגיל</option>
                                        <option value="high">🔴 גבוהה - דחוף</option>
                                        <option value="emergency">🚨 חירום - קפצונר</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">עיר/יישוב</label>
                                    <input required type="text" value={formData.city || ''} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">כתובת מדוייקת</label>
                                    <input required type="text" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="רחוב ומספר בית" />
                                </div>
                            </div>
                        </div>

                        {/* Scheduling */}
                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={14} /> תזמון המשימה
                            </h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { id: 'none', label: 'ללא זמן מוגדר' },
                                        { id: 'specific', label: 'במועד ספציפי' },
                                        { id: 'until', label: 'עד לתאריך מסוים' }
                                    ].map(opt => (
                                        <label key={opt.id} className={`flex-1 min-w-[120px] flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.time_type === opt.id ? 'bg-white border-primary text-primary shadow-sm' : 'bg-transparent border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                                            <input type="radio" className="hidden" name="time_type" value={opt.id} checked={formData.time_type === opt.id} onChange={e => setFormData({ ...formData, time_type: e.target.value })} />
                                            <span className="text-xs font-bold">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>

                                {formData.time_type !== 'none' && (
                                    <div className="animate-in slide-in-from-top-2 duration-300">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">בחר תאריך ושעה</label>
                                        <div className="relative">
                                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                            <input type="datetime-local" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                        </div>
                                    </div>
                                )}

                                {formData.time_type === 'none' && (
                                    <div className="animate-in slide-in-from-top-2 duration-300">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">הערת זמן נוספת (אופציונלי)</label>
                                        <textarea rows="2" value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="לדוגמה: רק בשעות הבוקר, בתיאום טלפוני..."></textarea>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-500 mr-1">תיאור המשימה המלא</label>
                            <textarea rows="4" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="פרט כאן את כל מה שהמתנדב צריך לדעת..."></textarea>
                        </div>

                        <div className="pt-2">
                            <button type="submit" className="w-full bg-primary hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/20 active:scale-[0.98] text-lg flex items-center justify-center gap-2">
                                {task ? 'עדכון משימה' : 'פרסום משימה עכשיו'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TaskModal;
