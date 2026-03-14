import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Users, MessageCircle, Map as MapIcon, Loader2, Zap } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getDistance } from 'geolib';
import { geocodeAddress } from '../utils/geocode';
import { useNavigate } from 'react-router-dom';

const SKILLS = ['בייביסיטר', 'עזרה לקשישים', 'ניקיון', 'לוגיסטיקה', 'חלוקת אוכל', 'ניקוי רסיסים', 'עזרה כללית', 'הסעות'];

const Match = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [volunteers, setVolunteers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [locationInput, setLocationInput] = useState('');
    const [missionType, setMissionType] = useState('');
    const [volunteersNeeded, setVolunteersNeeded] = useState(1);
    const [filterGender, setFilterGender] = useState('');
    const [filterMinAge, setFilterMinAge] = useState('');
    const [filterMaxAge, setFilterMaxAge] = useState('');
    const [filterCar, setFilterCar] = useState(false);
    const [filterRadiusKm, setFilterRadiusKm] = useState('');
    const [missionLat, setMissionLat] = useState(null);
    const [missionLng, setMissionLng] = useState(null);

    useEffect(() => {
        supabase.from('volunteers')
            .select('id, full_name, group_name, phone, contact_phone, lat, lng, city, gender, age, skills, has_car, volunteer_type, group_size, status')
            .eq('status', 'available')
            .not('lat', 'is', null)
            .then(({ data }) => setVolunteers(Array.isArray(data) ? data : []));
    }, []);

    const handleLocationSubmit = async () => {
        if (!locationInput.trim()) return;
        setIsLoading(true);
        try {
            const parts = locationInput.trim().split(',').map(s => s.trim());
            const city = parts.pop() || locationInput.trim();
            const address = parts.join(', ') || '';
            const loc = await geocodeAddress(address, city);
            setMissionLat(loc.lat);
            setMissionLng(loc.lng);
            setStep(2);
        } catch (e) {
            alert('לא הצלחתי למצוא את המיקום');
        }
        setIsLoading(false);
    };

    const scoredVolunteers = useMemo(() => {
        if (missionLat == null || missionLng == null) return [];
        const needed = volunteersNeeded || 1;
        return [...volunteers]
            .filter(v => {
                if (filterGender && v.gender !== filterGender) return false;
                if (filterMinAge && (v.age || 0) < parseInt(filterMinAge)) return false;
                if (filterMaxAge && (v.age || 0) > parseInt(filterMaxAge)) return false;
                if (filterCar && !v.has_car) return false;
                return true;
            })
            .map(v => {
                const dist = getDistance(
                    { latitude: missionLat, longitude: missionLng },
                    { latitude: parseFloat(v.lat), longitude: parseFloat(v.lng) }
                );
                if (filterRadiusKm) {
                    const radiusM = parseInt(filterRadiusKm) * 1000;
                    if (radiusM && dist > radiusM) return { ...v, _score: Infinity, _dist: dist };
                }
                let score = dist;
                if (needed >= 3) {
                    if (v.volunteer_type === 'group') { score -= 5000; if (v.group_size >= 5) score -= 3000; }
                    if (v.has_car) score -= 2000;
                }
                const matchSkills = (v.skills || []).some(s => (missionType || '').includes(s) || s === 'עזרה כללית');
                if (matchSkills) score -= 1000;
                return { ...v, _score: score, _dist: dist };
            })
            .filter(v => v._score !== Infinity)
            .sort((a, b) => a._score - b._score)
            .slice(0, 20);
    }, [volunteers, missionLat, missionLng, missionType, volunteersNeeded, filterGender, filterMinAge, filterMaxAge, filterCar, filterRadiusKm]);

    const handleWhatsApp = (vol) => {
        const name = vol.volunteer_type === 'group' ? vol.group_name : vol.full_name;
        const phone = (vol.volunteer_type === 'group' ? vol.contact_phone : vol.phone) || '';
        const p = phone.replace(/\D/g, '');
        const intl = p.startsWith('0') ? '972' + p.slice(1) : p;
        window.open(`https://wa.me/${intl}`, '_blank');
    };

    const distFmt = (d) => d > 1000 ? `${(d / 1000).toFixed(1)} ק"מ` : `${d} מ'`;

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12" dir="rtl">
            <div className="bg-white rounded-3xl border border-primary/10 p-6 shadow-sm">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Zap size={24} className="text-primary" /> התאמת מתנדבים</h2>
                <p className="text-sm text-gray-500 mt-1">מלאו פרטי המשימה ונדאג למצוא את המתנדבים הכי מתאימים</p>
            </div>

            {/* Step 1: Location */}
            <div className={`bg-white rounded-2xl border p-5 shadow-sm transition-opacity ${step >= 1 ? '' : 'opacity-50'}`}>
                <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">1</div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-gray-700 mb-2">איפה המשימה?</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={locationInput}
                                onChange={e => setLocationInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleLocationSubmit()}
                                placeholder="עיר או כתובת, למשל שדרות או תל אביב"
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                disabled={step > 1}
                            />
                            <button
                                onClick={handleLocationSubmit}
                                disabled={!locationInput.trim() || isLoading}
                                className="px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                                המשך
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 2: Mission type + count */}
            {step >= 2 && (
                <div className="bg-white rounded-2xl border p-5 shadow-sm">
                    <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">2</div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-gray-700 mb-2">מה צריך?</p>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {SKILLS.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setMissionType(missionType === s ? '' : s)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${missionType === s ? 'bg-primary text-white border-primary' : 'bg-gray-50 border-gray-200 hover:border-primary/30'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-600">כמות מתנדבים:</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={volunteersNeeded}
                                    onChange={e => setVolunteersNeeded(parseInt(e.target.value) || 1)}
                                    className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                            <button
                                onClick={() => setStep(3)}
                                className="mt-4 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-blue-700"
                            >
                                חפש מתנדבים
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Optional filters + results */}
            {step >= 3 && (
                <div className="space-y-4">
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                        <p className="text-xs font-black text-gray-500 uppercase mb-3">סינון (אופציונלי)</p>
                        <div className="flex flex-wrap gap-2 items-center">
                            <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white">
                                <option value="">מגדר</option>
                                <option value="זכר">זכר</option>
                                <option value="נקבה">נקבה</option>
                            </select>
                            <input type="number" placeholder="מגיל" value={filterMinAge} onChange={e => setFilterMinAge(e.target.value)} className="w-16 px-2 py-1.5 border rounded-lg text-xs" />
                            <input type="number" placeholder="עד גיל" value={filterMaxAge} onChange={e => setFilterMaxAge(e.target.value)} className="w-16 px-2 py-1.5 border rounded-lg text-xs" />
                            <select value={filterRadiusKm} onChange={e => setFilterRadiusKm(e.target.value)} className="px-3 py-1.5 border rounded-lg text-xs bg-white">
                                <option value="">כל מרחק</option>
                                <option value="5">עד 5 ק"מ</option>
                                <option value="10">עד 10 ק"מ</option>
                                <option value="20">עד 20 ק"מ</option>
                            </select>
                            <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                                <input type="checkbox" checked={filterCar} onChange={e => setFilterCar(e.target.checked)} className="rounded text-primary" />
                                רק עם רכב
                            </label>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-black text-gray-900 mb-4">מתנדבים מומלצים ({scoredVolunteers.length})</h3>
                        {scoredVolunteers.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-dashed p-12 text-center text-gray-400">לא נמצאו מתנדבים התואמים את הקריטריונים</div>
                        ) : (
                            <div className="grid gap-3">
                                {scoredVolunteers.map(v => (
                                    <div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h5 className="font-black text-gray-900 truncate">{v.volunteer_type === 'group' ? v.group_name : v.full_name}</h5>
                                            <p className="text-xs text-gray-500">{v.gender || 'מתנדב'} · גיל {v.age || '?'} · {v.city}</p>
                                            <p dir="ltr" className="text-xs font-bold text-primary mt-1">{v.volunteer_type === 'group' ? v.contact_phone : v.phone}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-bold flex items-center gap-1"><MapPin size={10} /> {distFmt(v._dist)}</span>
                                            <button onClick={() => handleWhatsApp(v)} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600"><MessageCircle size={18} /></button>
                                            <button onClick={() => navigate(`/map?volunteerId=${v.id}`)} className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200"><MapIcon size={18} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Match;
