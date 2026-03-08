import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, Phone, MapPin, Car, Download, Upload, Plus, Trash2, Edit2, Search, Filter, X, User, MoreVertical, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import VolunteerModal from '../components/VolunteerModal';
import * as XLSX from 'xlsx';
import { geocodeAddress } from '../utils/geocode';
import { useSearchParams } from 'react-router-dom';

const SKILLS = ['בייביסיטר', 'עזרה לקשישים', 'ניקיון', 'לוגיסטיקה', 'חלוקת אוכל', 'ניקוי רסיסים', 'עזרה כללית'];

const getVal = (row, keys) => {
    for (const key of Object.keys(row)) {
        const cleanKey = key.replace(/[\u200f\u200e\u202a-\u202e:]/g, '').replace(/[\t\r\n]/g, '').trim();
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
    return String(raw).replace(/^[''`״"']/, '').replace(/[-\s]/g, '').trim();
};

const Volunteers = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const targetedId = searchParams.get('id');

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
    const [filterType, setFilterType] = useState('');

    const loadData = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('volunteers').select('*').range(0, 3000).order('full_name');
        if (!error && data) setVolunteers(data);
        setIsLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const cities = useMemo(() => [...new Set(volunteers.map(v => v.city).filter(Boolean))].sort(), [volunteers]);

    const filtered = useMemo(() => {
        return volunteers.filter(v => {
            if (targetedId && v.id === targetedId) return true;
            if (targetedId) return false; // If we have a target ID from map, hide others unless cleared

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
    }, [volunteers, search, filterCity, filterStatus, filterSkill, filterCar, filterGender, filterType, targetedId]);

    const hasActiveFilters = search || filterCity || filterStatus || filterSkill || filterCar || filterGender || filterType || targetedId;
    const clearFilters = () => {
        setSearch(''); setFilterCity(''); setFilterStatus(''); setFilterSkill('');
        setFilterCar(''); setFilterGender(''); setFilterType('');
        setSearchParams({});
    };

    const handleSave = async (data) => {
        let lat = data.lat;
        let lng = data.lng;
        // Geocode if missing or city changed
        if (!data.id || (editingVol && editingVol.city !== data.city)) {
            const loc = await geocodeAddress(data.address, data.city);
            lat = loc.lat; lng = loc.lng;
        }

        const allowedFields = ['full_name', 'phone', 'age', 'address', 'city', 'lat', 'lng',
            'has_car', 'gender', 'skills', 'notes', 'status', 'volunteer_type',
            'group_name', 'org_name', 'group_size', 'contact_person', 'contact_phone'];
        const clean = {};
        allowedFields.forEach(f => { if (data[f] !== undefined) clean[f] = data[f]; });
        clean.lat = lat; clean.lng = lng;

        if (data.id) {
            const { error } = await supabase.from('volunteers').update(clean).eq('id', data.id);
            if (error) { alert('שגיאה בעדכון: ' + error.message); return; }
            setVolunteers(volunteers.map(v => v.id === data.id ? { ...v, ...clean } : v));
        } else {
            const { data: inserted, error } = await supabase.from('volunteers').insert([clean]).select();
            if (error) { alert('שגיאה בשמירה (ודאו שהרצתם את קוד ה-SQL ב-Supabase): ' + error.message); return; }
            if (inserted) setVolunteers([inserted[0], ...volunteers]);
        }
        setIsModalOpen(false);
    };

    const statusBadge = (s) => {
        const styles = { available: "bg-emerald-50 text-emerald-700 border-emerald-100", assigned: "bg-blue-50 text-blue-700 border-blue-100", busy: "bg-red-50 text-red-700 border-red-100" };
        const labels = { available: "פנוי", assigned: "בפעילות", busy: "לא זמין" };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${styles[s] || styles.available}`}>{labels[s] || s}</span>;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">מתנדבים</h2>
                    <p className="text-gray-500 mt-1">מנהל {volunteers.length} מתנדבים ({filtered.length} מוצגים)</p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm font-bold">
                    <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm"> <Upload size={16} /> ייבוא </button>
                    <button onClick={() => { setEditingVol(null); setIsModalOpen(true); }} className="px-5 py-2 bg-primary text-white rounded-xl flex items-center gap-2 shadow-md shadow-primary/20 hover:scale-105 transition-all"> <Plus size={18} /> הוספה ידנית </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-wrap gap-3 items-center">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" placeholder="חיפוש שם/טלפון..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-sm outline-none w-56" />
                </div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white"><option value="">סוג (הכל)</option><option value="individual">יחיד</option><option value="group">קבוצה</option></select>
                <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white max-w-[150px]"><option value="">עיר (הכל)</option>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white"><option value="">סטטוס (הכל)</option><option value="available">פנוי</option><option value="assigned">בפעילות</option><option value="busy">לא זמין</option></select>
                {hasActiveFilters && (<button onClick={clearFilters} className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 font-medium transition-colors"> <X size={14} /> נקה סינונים </button>)}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right" dir="rtl">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">שם / קבוצה</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">טלפון</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">מיקום</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">סטטוס</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (<tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400"><Loader2 className="animate-spin inline mr-2" />טוען...</td></tr>)
                                : filtered.map((v) => (
                                    <tr key={v.id} className={`hover:bg-gray-50/50 transition-colors group ${v.id === targetedId ? 'bg-blue-50/50 ring-2 ring-primary ring-inset' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${v.volunteer_type === 'group' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}> {v.volunteer_type === 'group' ? <Users size={16} /> : <User size={16} />} </div>
                                                <div><div className="text-sm font-bold text-gray-900">{v.volunteer_type === 'group' ? v.group_name : v.full_name}</div><div className="text-[10px] text-gray-500 uppercase font-black">{v.volunteer_type === 'group' ? 'קבוצה' : 'אינדיבידואל'}</div></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600" dir="ltr">{v.volunteer_type === 'group' ? v.contact_phone : v.phone}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{v.city}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{statusBadge(v.status)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingVol(v); setIsModalOpen(true); }} className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDelete(v.id)} className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={(e) => { }} accept=".xlsx,.xls,.csv" className="hidden" />
            <VolunteerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} volunteer={editingVol} onSave={handleSave} />
        </div>
    );
};

export default Volunteers;
