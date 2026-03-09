import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, Phone, MapPin, Car, Download, Upload, Plus, Trash2, Edit2, Search, Filter, X, User, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import VolunteerModal from '../components/VolunteerModal';
import * as XLSX from 'xlsx';
import { geocodeAddress } from '../utils/geocode';
import { cleanVolunteerData } from '../utils/taskUtils';
import { useSearchParams } from 'react-router-dom';

const SKILLS = ['בייביסיטר', 'עזרה לקשישים', 'ניקיון', 'לוגיסטיקה', 'חלוקת אוכל', 'ניקוי רסיסים', 'עזרה כללית'];
const PRIORITY_CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'אשדוד', 'אשקלון', 'שדרות'];

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
    const [filterContactStatus, setFilterContactStatus] = useState('');

    const loadData = async () => {
        setIsLoading(true);
        let allData = [];
        let from = 0;
        let to = 999;
        let finished = false;

        // Fetch in chunks of 1000 to bypass Supabase server-side limits
        while (!finished) {
            const { data, error } = await supabase
                .from('volunteers')
                .select('*')
                .range(from, to)
                .order('full_name');

            if (error) {
                console.error("Fetch error:", error);
                break;
            }
            if (!data || data.length === 0) {
                finished = true;
            } else {
                allData = [...allData, ...data];
                if (data.length < 1000) finished = true;
                else {
                    from += 1000;
                    to += 1000;
                }
            }
        }
        setVolunteers(allData);
        setIsLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const cities = useMemo(() => {
        const rawCities = [...new Set(volunteers.map(v => v.city).filter(Boolean))].sort();
        const prioritized = PRIORITY_CITIES.filter(pc => rawCities.includes(pc));
        const rest = rawCities.filter(rc => !PRIORITY_CITIES.includes(rc));
        return [...prioritized, ...rest];
    }, [volunteers]);

    const filtered = useMemo(() => {
        return volunteers.filter(v => {
            if (targetedId && v.id === targetedId) return true;
            if (targetedId) return false;

            if (search) {
                const searchLower = search.toLowerCase();
                if (!(v.full_name || v.group_name || '').toLowerCase().includes(searchLower) &&
                    !(v.phone || v.contact_phone || '').includes(search)) return false;
            }
            if (filterCity && v.city !== filterCity) return false;
            if (filterStatus && v.status !== filterStatus) return false;
            if (filterSkill && !(v.skills || []).includes(filterSkill)) return false;
            if (filterCar === 'yes' && !v.has_car) return false;
            if (filterCar === 'no' && v.has_car) return false;
            if (filterGender && v.gender !== filterGender) return false;
            if (filterType && v.volunteer_type !== filterType) return false;
            if (filterContactStatus && v.contact_status !== filterContactStatus) return false;
            return true;
        });
    }, [volunteers, search, filterCity, filterStatus, filterSkill, filterCar, filterGender, filterType, targetedId]);

    const hasActiveFilters = search || filterCity || filterStatus || filterSkill || filterCar || filterGender || filterType || targetedId;
    const clearFilters = () => {
        setSearch(''); setFilterCity(''); setFilterStatus(''); setFilterSkill('');
        setFilterCar(''); setFilterGender(''); setFilterType(''); setFilterContactStatus('');
        setSearchParams({});
    };

    const handleSave = async (data) => {
        let lat = data.lat;
        let lng = data.lng;
        if (!data.id || (editingVol && editingVol.city !== data.city)) {
            const loc = await geocodeAddress(data.address, data.city);
            lat = loc.lat; lng = loc.lng;
        }

        const clean = cleanVolunteerData({ ...data, lat, lng });

        if (data.id) {
            const { error } = await supabase.from('volunteers').update(clean).eq('id', data.id);
            if (error) { alert('שגיאה: ' + error.message); return; }
            setVolunteers(volunteers.map(v => v.id === data.id ? { ...v, ...clean } : v));
        } else {
            const { data: inserted, error } = await supabase.from('volunteers').insert([clean]).select();
            if (error) { alert('שגיאה: ' + error.message); return; }
            if (inserted) setVolunteers([inserted[0], ...volunteers]);
        }
        setIsModalOpen(false);
    };

    const handleExport = () => {
        const dataToExport = filtered.map(v => ({
            'שם מלא/קבוצה': v.volunteer_type === 'group' ? v.group_name : v.full_name,
            'סוג': v.volunteer_type === 'group' ? 'קבוצה' : 'יחיד',
            'טלפון': v.volunteer_type === 'group' ? v.contact_phone : v.phone,
            'עיר': v.city,
            'כתובת': v.address,
            'גיל/גודל': v.volunteer_type === 'group' ? v.group_size : v.age,
            'מגדר': v.gender,
            'סטטוס עבודה': v.status === 'available' ? 'פנוי' : (v.status === 'assigned' ? 'בפעילות' : 'לא זמין'),
            'סטטוס קשר': v.contact_status,
            'מיומנויות': (v.skills || []).join(', '),
            'הערות': v.notes
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Volunteers");
        XLSX.writeFile(wb, `volunteers_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            setIsLoading(true);
            const newVolunteers = data.map(row => ({
                full_name: row['שם מלא/קבוצה'] || row['שם'] || '',
                phone: row['טלפון'] || row['נייד'] || '',
                city: row['עיר'] || '',
                address: row['כתובת'] || '',
                age: parseInt(row['גיל/גודל'] || row['גיל']) || null,
                gender: row['מגדר'] || '',
                status: 'available',
                contact_status: row['סטטוס קשר'] || 'עדין לא נוצר קשר',
                volunteer_type: (row['סוג'] === 'קבוצה') ? 'group' : 'individual',
                group_name: (row['סוג'] === 'קבוצה') ? (row['שם מלא/קבוצה'] || '') : '',
                group_size: (row['סוג'] === 'קבוצה') ? (parseInt(row['גיל/גודל']) || 2) : 1
            }));

            const { data: inserted, error } = await supabase.from('volunteers').insert(newVolunteers).select();
            if (error) alert('שגיאה בייבוא: ' + error.message);
            else {
                alert(`יובאו בהצלחה ${inserted?.length || 0} מתנדבים`);
                loadData();
            }
            setIsLoading(false);
            e.target.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const statusBadge = (s) => {
        const styles = { available: "bg-emerald-50 text-emerald-700 border-emerald-100", assigned: "bg-blue-50 text-blue-700 border-blue-100", busy: "bg-red-50 text-red-700 border-red-100" };
        const labels = { available: "פנוי", assigned: "בפעילות", busy: "לא זמין" };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${styles[s] || styles.available}`}>{labels[s] || s}</span>;
    };

    const contactStatusBadge = (s) => {
        const styles = {
            'עדין לא נוצר קשר': "bg-gray-50 text-gray-500 border-gray-100",
            'לא רלוונטי': "bg-red-50 text-red-500 border-red-100",
            'מתנדב חוזר': "bg-purple-50 text-purple-600 border-purple-100",
            'רוצה להתנדב': "bg-blue-50 text-blue-600 border-blue-100"
        };
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${styles[s] || styles['עדין לא נוצר קשר']}`}>{s || 'עדין לא נוצר קשר'}</span>;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">מתנדבים</h2>
                    <p className="text-gray-500 mt-1">מציג {filtered.length} מתוך {volunteers.length} מתנדבים</p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm font-bold">
                    <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls, .csv" />
                    <button onClick={() => fileInputRef.current.click()} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"> <Upload size={18} /> ייבוא אקסל </button>
                    <button onClick={handleExport} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"> <Download size={18} /> ייצוא </button>
                    <button onClick={() => { setEditingVol(null); setIsModalOpen(true); }} className="px-5 py-2 bg-primary text-white rounded-xl flex items-center gap-2 shadow-md shadow-primary/20 hover:scale-105 transition-all"> <Plus size={18} /> הוספה ידנית </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-wrap gap-3 items-center">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" placeholder="חיפוש..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-sm outline-none w-56" />
                </div>
                <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white">
                    <option value="">כל האזורים</option>
                    <optgroup label="אזורים חשובים">
                        {PRIORITY_CITIES.map(c => <option key={`p-${c}`} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="שאר הארץ">
                        {cities.filter(c => !PRIORITY_CITIES.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                </select>
                <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white">
                    <option value="">מגדר (הכל)</option>
                    <option value="זכר">זכר</option>
                    <option value="נקבה">נקבה</option>
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white">
                    <option value="">סטטוס (הכל)</option>
                    <option value="available">פנוי</option>
                    <option value="assigned">בפעילות</option>
                    <option value="busy">לא זמין</option>
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none bg-white">
                    <option value="">סוג (הכל)</option>
                    <option value="individual">יחיד</option>
                    <option value="group">קבוצה</option>
                </select>
                <select value={filterContactStatus} onChange={e => setFilterContactStatus(e.target.value)} className="px-3 py-2 border border-blue-200 rounded-xl text-sm outline-none bg-blue-50/30 text-blue-700 font-bold">
                    <option value="">כל הסטטוסים (קשר)</option>
                    <option value="עדין לא נוצר קשר">עדין לא נוצר קשר</option>
                    <option value="לא רלוונטי">לא רלוונטי</option>
                    <option value="מתנדב חוזר">מתנדב חוזר</option>
                    <option value="רוצה להתנדב">רוצה להתנדב</option>
                </select>
                {hasActiveFilters && (<button onClick={clearFilters} className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 font-medium transition-colors"> <X size={14} /> נקה </button>)}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right" dir="rtl">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">שם / קבוצה</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">טלפון</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">אזור</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">גיל</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">מגדר</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">סטטוס קשר</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">סטטוס עבודה</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading && volunteers.length === 0 ? (<tr><td colSpan="7" className="px-6 py-12 text-center text-gray-400"><Loader2 className="animate-spin inline mr-2" />טוען...</td></tr>)
                                : filtered.map((v) => (
                                    <tr key={v.id} className={`hover:bg-gray-50/50 transition-colors group ${v.id === targetedId ? 'bg-blue-50/50 ring-2 ring-primary ring-inset' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${v.volunteer_type === 'group' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}> {v.volunteer_type === 'group' ? <Users size={16} /> : <User size={16} />} </div>
                                                <div><div className="text-sm font-bold text-gray-900">{v.volunteer_type === 'group' ? v.group_name : v.full_name}</div><div className="text-[10px] text-gray-500 uppercase font-black">{v.volunteer_type === 'group' ? 'קבוצה' : 'אינדיבידואל'}</div></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600" dir="ltr">{v.volunteer_type === 'group' ? v.contact_phone : v.phone}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-bold">{v.city}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{v.volunteer_type === 'group' ? v.group_size : v.age || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{v.gender || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{contactStatusBadge(v.contact_status)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{statusBadge(v.status)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingVol(v); setIsModalOpen(true); }} className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"><Edit2 size={16} /></button>
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
