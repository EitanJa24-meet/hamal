import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const checkBoxes = ['בייביסיטר', 'עזרה לקשישים', 'ניקיון', 'לוגיסטיקה', 'חלוקת אוכל', 'ניקוי רסיסים', 'עזרה כללית'];

const VolunteerModal = ({ isOpen, onClose, volunteer, onSave }) => {
    const defaultState = {
        full_name: '', phone: '', age: '', address: '', city: '', has_car: false, skills: [], status: 'available', gender: '', notes: ''
    };
    const [formData, setFormData] = useState(defaultState);

    useEffect(() => {
        if (volunteer) setFormData({ ...defaultState, ...volunteer });
        else setFormData(defaultState);
    }, [volunteer, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleSkillToggle = (skill) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.includes(skill) ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill]
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                    <X size={20} className="text-gray-600" />
                </button>
                <div className="p-8">
                    <h2 className="text-2xl font-bold mb-6">{volunteer ? 'עריכת מתנדב/ת' : 'הוספת מתנדב/ת חדש/ה'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">שם מלא</label>
                                <input required type="text" value={formData.full_name || ''} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="w-full border p-2 rounded-lg focus:ring-primary focus:border-primary outline-none transition-shadow" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">טלפון</label>
                                <input required type="text" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border p-2 rounded-lg focus:ring-primary focus:border-primary outline-none transition-shadow" dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">גיל</label>
                                <input type="number" value={formData.age || ''} onChange={e => setFormData({ ...formData, age: e.target.value })} className="w-full border p-2 rounded-lg focus:ring-primary focus:border-primary outline-none transition-shadow" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">עיר</label>
                                <input required type="text" value={formData.city || ''} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full border p-2 rounded-lg focus:ring-primary focus:border-primary outline-none transition-shadow" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">מגדר</label>
                                <select value={formData.gender || ''} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full border p-2 rounded-lg bg-white outline-none">
                                    <option value="">כלשהו / לא צוין</option>
                                    <option value="זכר">זכר</option>
                                    <option value="נקבה">נקבה</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">כתובת</label>
                            <input type="text" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full border p-2 rounded-lg focus:ring-primary focus:border-primary outline-none transition-shadow" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">הערות נוספות</label>
                            <textarea rows="2" value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full border p-2 rounded-lg focus:ring-primary outline-none"></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">סטטוס פעילות</label>
                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border p-2 rounded-lg bg-white outline-none focus:ring-primary focus:border-primary">
                                <option value="available">פנוי/ה לשיבוץ</option>
                                <option value="assigned">שובץ למשימה (בפעילות)</option>
                                <option value="busy">עסוק/לא פעיל זמנית</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">כישורים ותחומי התנדבות</label>
                            <div className="flex flex-wrap gap-2">
                                {checkBoxes.map(s => (
                                    <button type="button" key={s} onClick={() => handleSkillToggle(s)} className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-all ${formData.skills.includes(s) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <input type="checkbox" id="has_car" checked={formData.has_car} onChange={e => setFormData({ ...formData, has_car: e.target.checked })} className="w-5 h-5 text-primary rounded" />
                            <label htmlFor="has_car" className="font-bold cursor-pointer text-gray-800">ברשותי רכב למשימות שינוע</label>
                        </div>
                        <div className="pt-6">
                            <button type="submit" className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95">שמירה במערכת</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
export default VolunteerModal;
