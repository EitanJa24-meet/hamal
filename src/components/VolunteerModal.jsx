import React, { useState, useEffect } from 'react';
import { X, Users, User } from 'lucide-react';

const SKILLS = ['בייביסיטר', 'עזרה לקשישים', 'ניקיון', 'לוגיסטיקה', 'חלוקת אוכל', 'ניקוי רסיסים', 'עזרה כללית', 'הסעות'];

const VolunteerModal = ({ isOpen, onClose, volunteer, onSave }) => {
    const defaultState = {
        full_name: '', phone: '', age: '', address: '', city: '', has_car: false,
        skills: [], status: 'available', gender: '', notes: '',
        volunteer_type: 'individual',
        // group fields
        group_name: '', org_name: '', group_size: 2, contact_person: '', contact_phone: '',
    };
    const [formData, setFormData] = useState(defaultState);

    useEffect(() => {
        if (volunteer) setFormData({ ...defaultState, ...volunteer, skills: volunteer.skills || [] });
        else setFormData(defaultState);
    }, [volunteer, isOpen]);

    if (!isOpen) return null;

    const isGroup = formData.volunteer_type === 'group';

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const toggleSkill = (skill) => setFormData(prev => ({
        ...prev,
        skills: prev.skills.includes(skill) ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill]
    }));

    const inp = "w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm";
    const lbl = "block text-sm font-semibold text-gray-700 mb-1";

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10">
                    <X size={18} className="text-gray-600" />
                </button>

                <div className="p-7">
                    <h2 className="text-xl font-bold mb-5">{volunteer ? 'עריכת מתנדב/ת' : 'הוספת מתנדב/ת חדש/ה'}</h2>

                    {/* Type toggle */}
                    <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
                        {[
                            { v: 'individual', label: 'מתנדב יחיד', icon: User },
                            { v: 'group', label: 'קבוצה / ארגון', icon: Users },
                        ].map(({ v, label, icon: Icon }) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, volunteer_type: v }))}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-sm transition-all ${formData.volunteer_type === v ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Icon size={16} /> {label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isGroup ? (
                            /* ── GROUP FIELDS ── */
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className={lbl}>שם הקבוצה / ארגון</label>
                                        <input required type="text" value={formData.group_name || ''} onChange={e => setFormData({ ...formData, group_name: e.target.value })} className={inp} placeholder="לדוגמה: בני עקיבא – תל אביב" />
                                    </div>
                                    <div>
                                        <label className={lbl}>שם גוף / מסגרת</label>
                                        <input type="text" value={formData.org_name || ''} onChange={e => setFormData({ ...formData, org_name: e.target.value })} className={inp} placeholder="עמותה, בית ספר, שכונה..." />
                                    </div>
                                    <div>
                                        <label className={lbl}>מספר משתתפים</label>
                                        <input required type="number" min="2" value={formData.group_size || 2} onChange={e => setFormData({ ...formData, group_size: parseInt(e.target.value) })} className={inp} />
                                    </div>
                                    <div>
                                        <label className={lbl}>איש קשר</label>
                                        <input required type="text" value={formData.contact_person || ''} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} className={inp} />
                                    </div>
                                    <div>
                                        <label className={lbl}>טלפון איש קשר</label>
                                        <input required type="text" dir="ltr" value={formData.contact_phone || ''} onChange={e => setFormData({ ...formData, contact_phone: e.target.value })} className={inp} />
                                    </div>
                                    <div>
                                        <label className={lbl}>עיר</label>
                                        <input required type="text" value={formData.city || ''} onChange={e => setFormData({ ...formData, city: e.target.value })} className={inp} />
                                    </div>
                                    <div>
                                        <label className={lbl}>כתובת</label>
                                        <input type="text" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} className={inp} />
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* ── INDIVIDUAL FIELDS ── */
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={lbl}>שם מלא</label>
                                        <input required type="text" value={formData.full_name || ''} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className={inp} />
                                    </div>
                                    <div>
                                        <label className={lbl}>טלפון</label>
                                        <input required type="text" dir="ltr" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={inp} />
                                    </div>
                                    <div>
                                        <label className={lbl}>גיל</label>
                                        <input type="number" value={formData.age || ''} onChange={e => setFormData({ ...formData, age: e.target.value })} className={inp} />
                                    </div>
                                    <div>
                                        <label className={lbl}>מגדר</label>
                                        <select value={formData.gender || ''} onChange={e => setFormData({ ...formData, gender: e.target.value })} className={inp + ' bg-white'}>
                                            <option value="">לא צוין</option>
                                            <option value="זכר">זכר</option>
                                            <option value="נקבה">נקבה</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={lbl}>עיר</label>
                                        <input required type="text" value={formData.city || ''} onChange={e => setFormData({ ...formData, city: e.target.value })} className={inp} />
                                    </div>
                                    <div>
                                        <label className={lbl}>כתובת</label>
                                        <input type="text" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} className={inp} />
                                    </div>
                                </div>
                                <div>
                                    <label className={lbl}>הערות נוספות</label>
                                    <textarea rows="2" value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className={inp}></textarea>
                                </div>
                            </>
                        )}

                        {/* Skills – both types */}
                        <div>
                            <label className={lbl}>תחומי התנדבות</label>
                            <div className="flex flex-wrap gap-2">
                                {SKILLS.map(s => (
                                    <button type="button" key={s} onClick={() => toggleSkill(s)}
                                        className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${formData.skills.includes(s) ? 'bg-primary text-white border-primary' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Car + Status */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <input type="checkbox" id="has_car" checked={!!formData.has_car} onChange={e => setFormData({ ...formData, has_car: e.target.checked })} className="w-4 h-4 text-primary rounded" />
                                <label htmlFor="has_car" className="font-semibold cursor-pointer text-sm text-gray-800">ברשותי רכב</label>
                            </div>
                            <div>
                                <label className={lbl}>סטטוס</label>
                                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className={inp + ' bg-white'}>
                                    <option value="available">פנוי לשיבוץ</option>
                                    <option value="assigned">בפעילות</option>
                                    <option value="busy">לא זמין</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95">
                                שמירה במערכת
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default VolunteerModal;
