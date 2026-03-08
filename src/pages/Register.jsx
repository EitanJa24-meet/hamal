import React, { useState } from 'react';
import { ShieldCheck, MapPin, Car, Phone, User, Calendar } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { geocodeAddress } from '../utils/geocode';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        age: '',
        address: '',
        city: '',
        has_car: false,
        skills: [],
    });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const checkBoxes = [
        'בייביסיטר', 'עזרה לקשישים', 'ניקיון', 'לוגיסטיקה', 'חלוקת אוכל', 'ניקוי רסיסים', 'עזרה כללית'
    ];

    const handleCheckboxToggle = (skill) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.includes(skill)
                ? prev.skills.filter(s => s !== skill)
                : [...prev.skills, skill]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const loc = await geocodeAddress(formData.address, formData.city);

        const { error } = await supabase.from('volunteers').insert([{
            full_name: formData.full_name,
            phone: formData.phone,
            age: parseInt(formData.age),
            address: formData.address,
            city: formData.city,
            has_car: formData.has_car,
            skills: formData.skills,
            gender: formData.gender,
            school: formData.school,
            status: 'available',
            lat: loc.lat,
            lng: loc.lng
        }]);

        setSubmitting(false);

        if (!error) {
            setSuccess(true);
        } else {
            alert('אירעה שגיאה בהרשמה. אנא נסה שוב.');
            console.error(error);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-surface flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8" dir="rtl">
                <div className="bg-white p-10 rounded-3xl shadow-xl flex flex-col items-center max-w-md w-full text-center border border-gray-100">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                        <ShieldCheck className="text-emerald-500" size={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">תודה רבה!</h2>
                    <p className="text-gray-600 mb-6">הפרטים שלך נקלטו בהצלחה במערכת החמ"ל. ניצור איתך קשר אוטומטית בוואטסאפ במקרה של משימה פתוחה רלוונטית באזורך.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
            <div className="max-w-xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-extrabold text-gray-900 mb-2">הרשמת מתנדבים לחמ"ל</h2>
                    <p className="text-lg text-gray-600">יחד ננצח. יש למלא פרטים מדויקים למערכת ההקפצות.</p>
                </div>

                <div className="bg-white py-10 px-8 shadow-xl rounded-3xl border border-gray-100">
                    <form className="space-y-6" onSubmit={handleSubmit}>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                                    <User size={16} className="text-primary" /> שם מלא
                                </label>
                                <input
                                    type="text" required
                                    value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-primary focus:border-primary sm:text-sm transition-shadow"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                                    <Phone size={16} className="text-primary" /> טלפון נייד
                                </label>
                                <input
                                    type="tel" required
                                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-primary focus:border-primary sm:text-sm transition-shadow"
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                            <div className="sm:col-span-1">
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                                    <Calendar size={16} className="text-primary" /> גיל
                                </label>
                                <input
                                    type="number" required
                                    value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })}
                                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-primary focus:border-primary sm:text-sm transition-shadow"
                                />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                                    <MapPin size={16} className="text-primary" /> עיר
                                </label>
                                <input
                                    type="text" required
                                    value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })}
                                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-primary focus:border-primary sm:text-sm transition-shadow"
                                />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1">כתובת מגורים</label>
                                <input
                                    type="text" required
                                    value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-primary focus:border-primary sm:text-sm transition-shadow"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">בית ספר / סטטוס לימודים</label>
                                <input
                                    type="text"
                                    value={formData.school || ''} onChange={e => setFormData({ ...formData, school: e.target.value })}
                                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-primary focus:border-primary sm:text-sm transition-shadow"
                                    placeholder="אורט, מקיף, או 'סיימתי'"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">מגדר (עבור התאמה למשימות בייביסיטר)</label>
                                <select
                                    value={formData.gender || ''} onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-white"
                                >
                                    <option value="">בחר מגדר</option>
                                    <option value="זכר">זכר</option>
                                    <option value="נקבה">נקבה</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-gray-700 mb-3 block">תחומי התנדבות (בחר הכל מה שרלוונטי)</label>
                            <div className="flex flex-wrap gap-2">
                                {checkBoxes.map(skill => (
                                    <button
                                        type="button"
                                        key={skill}
                                        onClick={() => handleCheckboxToggle(skill)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${formData.skills.includes(skill)
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        {skill}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="has_car"
                                type="checkbox"
                                checked={formData.has_car}
                                onChange={e => setFormData({ ...formData, has_car: e.target.checked })}
                                className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <label htmlFor="has_car" className="mr-3 flex items-center gap-2 text-gray-700 font-bold">
                                <Car size={18} className="text-gray-500" />
                                ברשותי רכב אותו אוכל לתפעל
                            </label>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-md text-lg font-bold text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'שולח נתונים...' : 'שלח טופס התנדבות'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
