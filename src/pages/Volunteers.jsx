import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, Phone, MapPin, Car, Download, Upload, Plus, Trash2, Edit2, Search, Filter, X, User, MoreVertical } from 'lucide-react';
import { supabase } from '../supabaseClient';
import VolunteerModal from '../components/VolunteerModal';
import * as XLSX from 'xlsx';
import { geocodeAddress } from '../utils/geocode';

const SKILLS = ['בייביסיטר', 'עזרה לקשישים', 'ניקיון', 'לוגיסטיקה', 'חלוקת אוכל', 'ניקוי רסיסים', 'עזרה כללית'];

// ── helpers ──────────────────────────────────────────────────────────────────

const getVal = (row, keys) => {
    for (const key of Object.keys(row)) {
        const cleanKey = key
            .replace(/[\u200f\u200e\u202a-\u202e:]/g, '')
            .replace(/[\t\r\n]/g, '')
            .trim();
        if (keys.some(pk => cleanKey.includes(pk))) {
            const v = row[key];
            if (v === undefined || v === null || v === '') return null;
            return v;
        }
    }
    return null;
};

const cleanPhone = (raw) => {
    if (raw === null || raw === undefined) return '';
    return String(raw)
        .replace(/^[''`״"']/, '')
        .replace(/[-\s]/g, '')
        .trim();
};

const Volunteers = () => {
    const [volunteers, setVolunteers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVol, setEditingVol] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

    // Filters
    const [search, setSearch] = useState('');
    const [filterCity, setFilterCity] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterSkill, setFilterSkill] = useState('');
    const [filterCar, setFilterCar] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [filterType, setFilterType] = useState(''); // individual vs group

    const loadData = async () => {
        setIsLoading(true);
        // Supabase has 1000 row default limit. We fetch in ranges or just use a larger range if allowed.
        // Let's fetch the first 3000 rows (should cover 1433).
        const { data, error } = await supabase.from('volunteers')
            .select('*')
            .range(0, 2999)
            .order('full_name');

        if (!error && data) setVolunteers(data);
        setIsLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const cities = useMemo(() => [...new Set(volunteers.map(v => v.city).filter(Boolean))].sort(), [volunteers]);

    const filtered = useMemo(() => {
        return volunteers.filter(v => {
            if (search) {
                const searchLower = search.toLowerCase();
                const matchName = (v.full_name || v.group_name || '').toLowerCase().includes(searchLower);
                const matchPhone = (v.phone || v.contact_phone || '').includes(search);
                if (!matchName && !matchPhone) return false;
            }
            if (filterCity && v.city !== filterCity) return false;
            if (filterStatus && v.status !== filterStatus) return false;
            if (filterSkill && !(v.skills || []).includes(filterSkill)) return false;
            if (filterCar === 'yes' && !v.has_car) return false;
            if (filterCar === 'no' && v.has_car) return false;
            if (filterGender && v.gender !== filterGender) return false;
            if (filterType && v.volunteer_type !== filterType) return false;
            return true;
        });
    }, [volunteers, search, filterCity, filterStatus, filterSkill, filterCar, filterGender, filterType]);

    const hasActiveFilters = search || filterCity || filterStatus || filterSkill || filterCar || filterGender || filterType;
    const clearFilters = () => {
        setSearch(''); setFilterCity(''); setFilterStatus(''); setFilterSkill('');
        setFilterCar(''); setFilterGender(''); setFilterType('');
    };

    const handleDelete = async (id) => {
        if (confirm('האם אתה בטוח שברצונך למחוק מתנדב זה?')) {
            const { error } = await supabase.from('volunteers').delete().eq('id', id);
            if (!error) setVolunteers(volunteers.filter(v => v.id !== id));
        }
    };

    const handleSave = async (data) => {
        let lat = data.lat;
        let lng = data.lng;
        if (!data.id) {
            const loc = await geocodeAddress(data.address, data.city);
            lat = loc.lat; lng = loc.lng;
        }

        const allowedFields = ['id', 'full_name', 'phone', 'age', 'address', 'city', 'lat', 'lng',
            'has_car', 'gender', 'skills', 'notes', 'status', 'volunteer_type',
            'group_name', 'org_name', 'group_size', 'contact_person', 'contact_phone'];
        const clean = {};
        allowedFields.forEach(f => { if (data[f] !== undefined) clean[f] = data[f]; });
        clean.lat = lat; clean.lng = lng;

        if (data.id) {
            const { error } = await supabase.from('volunteers').update(clean).eq('id', data.id);
            if (error) { console.error('Volunteer update error:', error); alert('שגיאה בעדכון: ' + error.message); return; }
            setVolunteers(volunteers.map(v => v.id === data.id ? { ...v, ...clean } : v));
        } else {
            const { data: inserted, error } = await supabase.from('volunteers').insert([clean]).select();
            if (error) { console.error('Volunteer insert error:', error); alert('שגיאה בשמירה: ' + error.message); return; }
            if (inserted && inserted.length > 0) setVolunteers([inserted[0], ...volunteers]);
        }
        setIsModalOpen(false);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();

        reader.onload = async (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

            if (data.length === 0) { alert('הקובץ ריק'); return; }

            const mappedData = data.map(row => {
                const nameRaw = getVal(row, ['שם מלא', 'שם']);
                const phoneRaw = getVal(row, ['טלפון נייד', 'נייד', 'טלפון']);
                const cityRaw = getVal(row, ['עיר מגורים', 'עיר', 'מאיפה אני']);
                const ageRaw = getVal(row, ['בן כמה אני', 'גיל']);
                const genderRaw = getVal(row, ['מגדר']);
                const carRaw = getVal(row, ['רכב', 'יש רכב']);

                return {
                    full_name: nameRaw ? String(nameRaw).trim() : 'ללא שם',
                    phone: cleanPhone(phoneRaw),
                    age: ageRaw ? (parseInt(ageRaw) || null) : null,
                    city: cityRaw ? String(cityRaw).trim() : 'לא ידוע',
                    gender: genderRaw ? String(genderRaw).trim() : null,
                    has_car: String(carRaw || '').trim() === 'כן' || String(carRaw || '').toLowerCase() === 'true',
                    status: 'available',
                    volunteer_type: 'individual',
                    skills: []
                };
            });

            const validData = mappedData.filter(r => r.full_name && r.full_name.length >= 2);
            alert(`מתחיל ייבוא של ${validData.length} שורות...`);

            const CHUNK = 50;
            for (let i = 0; i < validData.length; i += CHUNK) {
                const chunk = validData.slice(i, i + CHUNK);
                const { error } = await supabase.from('volunteers').insert(chunk);
                if (error) console.error('Error in batch', i, error);
            }
            loadData();
            alert('הייבוא הושלם! בדקי בטבלה.');
        };
        reader.readAsBinaryString(file);
    };

    const statusBadge = (s) => {
        const styles = {
            available: "bg-emerald-50 text-emerald-700 border-emerald-100",
            assigned: "bg-blue-50 text-blue-700 border-blue-100",
            busy: "bg-red-50 text-red-700 border-red-100"
        };
        const labels = { available: "פנוי", assigned: "בפעילות", busy: "לא זמין" };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${styles[s] || styles.available}`}>{labels[s] || s}</span>;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">מתנדבים</h2>
                    <p className="text-gray-500 mt-1">מנהל {volunteers.length} מתנדבים וקבוצות ({filtered.length} מוצגים)</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls,.csv" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm">
                        <Upload size={16} /> ייבוא
                    </button>
                    <button onClick={() => { setEditingVol(null); setIsModalOpen(true); }} className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-primary/20 hover:scale-105 transition-all">
                        <Plus size={18} /> הוספה ידנית
                    </button>
                </div>
            </div>

            {/* Filters bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-wrap gap-3 items-center">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" placeholder="חיפוש שם/טלפון..." value={search} onChange={e => setSearch(e.target.value)}
                        className="pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none w-56" />
                </div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white">
                    <option value="">סוג (הכל)</option>
                    <option value="individual">יחיד</option>
                    <option value="group">קבוצה</option>
                </select>
                <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white max-w-[150px]">
                    <option value="">עיר (הכל)</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white">
                    <option value="">סטטוס (הכל)</option>
                    <option value="available">פנוי</option>
                    <option value="assigned">בפעילות</option>
                    <option value="busy">לא זמין</option>
                </select>
                <select value={filterCar} onChange={e => setFilterCar(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white">
                    <option value="">רכב (הכל)</option>
                    <option value="yes">יש רכב</option>
                    <option value="no">אין רכב</option>
                </select>
                {hasActiveFilters && (
                    <button onClick={clearFilters} className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 font-medium transition-colors">
                        <X size={14} /> נקה סינונים
                    </button>
                )}
            </div>

            {/* Table layout */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right" dir="rtl">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">שם / קבוצה</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">טלפון</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">מיקום</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">רכב</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">סטטוס</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">גיל / גודל</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-400">טוען נתונים...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-400">לא נמצאו מתנדבים מתאימים</td></tr>
                            ) : filtered.map((v) => (
                                <tr key={v.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${v.volunteer_type === 'group' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {v.volunteer_type === 'group' ? <Users size={16} /> : <User size={16} />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">{v.volunteer_type === 'group' ? v.group_name : v.full_name}</div>
                                                <div className="text-xs text-gray-500">{v.volunteer_type === 'group' ? 'קבוצה' : 'אינדיבידואל'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600" dir="ltr">{v.volunteer_type === 'group' ? v.contact_phone : v.phone}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{v.city}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {v.has_car ? <span className="text-emerald-600 font-bold">כן</span> : <span className="text-gray-300">לא</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{statusBadge(v.status)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {v.volunteer_type === 'group' ? `${v.group_size || '?'} איש` : `${v.age || '?'}`}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingVol(v); setIsModalOpen(true); }} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(v.id)} className="p-1.5 hover:bg-red-50 hover:text-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <VolunteerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} volunteer={editingVol} onSave={handleSave} />
        </div>
    );
};

export default Volunteers;
