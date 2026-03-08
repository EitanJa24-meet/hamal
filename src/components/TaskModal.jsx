import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const taskTypes = ['בייביסיטר', 'עזרה לקשישים', 'ניקיון', 'לוגיסטיקה', 'חלוקת אוכל', 'ניקוי רסיסים', 'עזרה כללית', 'הסעות', 'שינוע ציוד'];

const TaskModal = ({ isOpen, onClose, task, onSave }) => {
    const defaultState = {
        name: '', type: 'עזרה כללית', description: '', address: '', city: '',
        urgency: 'medium', volunteers_needed: 1, status: 'open', general_help: false
    };
    const [formData, setFormData] = useState(defaultState);

    useEffect(() => {
        if (task) setFormData({ ...defaultState, ...task });
        else setFormData(defaultState);
    }, [task, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                    <X size={20} className="text-gray-600" />
                </button>
                <div className="p-8">
                    <h2 className="text-2xl font-bold mb-6">{task ? 'עריכת משימה' : 'פתיחת משימה חדשה'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-bold mb-1">שם המשימה (כותרת)</label>
                                <input required type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border p-2 rounded-lg focus:ring-primary focus:border-primary outline-none transition-shadow" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">סוג המשימה (תגית)</label>
                                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full border p-2 rounded-lg bg-white focus:ring-primary outline-none">
                                    {taskTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">כמות מתנדבים נדרשת</label>
                                <input required type="number" min="1" value={formData.volunteers_needed} onChange={e => setFormData({ ...formData, volunteers_needed: parseInt(e.target.value) })} className="w-full border p-2 rounded-lg focus:ring-primary outline-none" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-bold mb-1">תיאור ופרטים נוספים</label>
                                <textarea rows="3" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border p-2 rounded-lg focus:ring-primary outline-none" placeholder="הכנס פרטים כגון מספר קומה, קוד דלת, שעות פעילות..."></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">עיר</label>
                                <input required type="text" value={formData.city || ''} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full border p-2 rounded-lg focus:ring-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">כתובת מדוייקת במערכת</label>
                                <input required type="text" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full border p-2 rounded-lg focus:ring-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">דחיפות המשימה</label>
                                <select value={formData.urgency} onChange={e => setFormData({ ...formData, urgency: e.target.value })} className="w-full border p-2 rounded-lg bg-white focus:ring-primary outline-none">
                                    <option value="low">נמוכה</option>
                                    <option value="medium">בינונית - רגילה</option>
                                    <option value="high">גבוהה (קפצונר - חירום)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">סטטוס</label>
                                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border p-2 rounded-lg bg-white focus:ring-primary outline-none">
                                    <option value="open">פתוחה להרשמה (ממתין)</option>
                                    <option value="in_progress">בטיפול - שובצו מתנדבים</option>
                                    <option value="completed">הושלמה ונסגרה</option>
                                </select>
                            </div>
                        </div>
                        <div className="pt-6">
                            <button type="submit" className="w-full bg-alert hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95 text-lg">שמירה ופרסום בחמ"ל קדמי</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
export default TaskModal;
