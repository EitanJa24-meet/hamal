import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, Phone, MapPin, Car, Download, Upload, Plus, Trash2, Edit2, Search, Filter, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import VolunteerModal from '../components/VolunteerModal';
import * as XLSX from 'xlsx';
import { geocodeAddress } from '../utils/geocode';

const SKILLS = ['בייביסיטר', 'עזרה לקשישים', 'ניקיון', 'לוגיסטיקה', 'חלוקת אוכל', 'ניקוי רסיסים', 'עזרה כללית'];

const Volunteers = () => {
    const [volunteers, setVolunteers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVol, setEditingVol] = useState(null);
    const fileInputRef = useRef(null);

    // Filters
    const [search, setSearch] = useState('');
    const [filterCity, setFilterCity] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterSkill, setFilterSkill] = useState('');
    const [filterCar, setFilterCar] = useState('');
    const [filterGender, setFilterGender] = useState('');

    const loadData = () => {
        supabase.from('volunteers').select('*').order('full_name').then(({ data, error }) => {
            if (!error && data) setVolunteers(data);
        });
    };

    useEffect(() => { loadData(); }, []);

    const cities = useMemo(() => [...new Set(volunteers.map(v => v.city).filter(Boolean))].sort(), [volunteers]);

    const filtered = useMemo(() => {
        return volunteers.filter(v => {
            if (search && !v.full_name?.toLowerCase().includes(search.toLowerCase()) && !v.phone?.includes(search)) return false;
            if (filterCity && v.city !== filterCity) return false;
            if (filterStatus && v.status !== filterStatus) return false;
            if (filterSkill && !(v.skills || []).includes(filterSkill)) return false;
            if (filterCar === 'yes' && !v.has_car) return false;
            if (filterCar === 'no' && v.has_car) return false;
            if (filterGender && v.gender !== filterGender) return false;
            return true;
        });
    }, [volunteers, search, filterCity, filterStatus, filterSkill, filterCar, filterGender]);

    const hasActiveFilters = search || filterCity || filterStatus || filterSkill || filterCar || filterGender;
    const clearFilters = () => { setSearch(''); setFilterCity(''); setFilterStatus(''); setFilterSkill(''); setFilterCar(''); setFilterGender(''); };

    const handleDelete = async (id) => {
        if (confirm('האם אתה בטוח שברצונך למחוק מתנדב/ת זה?')) {
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
        if (data.id) {
            const { error } = await supabase.from('volunteers').update(data).eq('id', data.id);
            if (!error) setVolunteers(volunteers.map(v => v.id === data.id ? data : v));
        } else {
            const { data: inserted, error } = await supabase.from('volunteers').insert([{ ...data, lat, lng }]).select();
            if (!error && inserted) setVolunteers([inserted[0], ...volunteers]);
        }
        setIsModalOpen(false);
    };

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(filtered);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Volunteers");
        XLSX.writeFile(wb, "Volunteers_Export.xlsx");
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

            if (data.length === 0) {
                alert('הקובץ ריק או שהפורמט אינו נתמך.');
                return;
            }

            const mappedData = data.map(row => {
                const getVal = (keys) => {
                    for (const key of Object.keys(row)) {
                        const cleanKey = key.replace(/[:\t\r\n]/g, '').trim();
                        if (keys.some(pk => cleanKey.includes(pk))) return row[key];
                    }
                    return null;
                };
                const phoneRaw = getVal(['טלפון נייד', 'טלפון', 'נייד']);
                const phoneStr = phoneRaw != null ? String(phoneRaw).trim() : '';
                const notesVal = getVal(['הערות', 'שאלות']) || '';
                const parentPhone = getVal(['טלפון של הורה']);
                const ageRaw = getVal(['בן כמה אני', 'גיל']);
                const genderRaw = getVal(['מגדר']);

                return {
                    full_name: getVal(['שם מלא', 'שם', 'שחקן']) || 'ללא שם',
                    phone: phoneStr,
                    age: ageRaw ? (parseInt(ageRaw) || null) : null,
                    city: getVal(['עיר מגורים', 'עיר', 'ישוב', 'יישוב']) || 'תל אביב',
                    address: getVal(['כתובת']) || '',
                    gender: genderRaw ? String(genderRaw).trim() : null,
                    has_car: String(getVal(['רכב', 'has_car']) || '').toLowerCase() === 'true' || getVal(['רכב']) === 'כן',
                    notes: parentPhone ? `טלפון הורה: ${parentPhone}. ${notesVal}` : notesVal,
                    status: 'available',
                    skills: [],
                };
            });

            // Filter out rows with no name
            const validData = mappedData.filter(r => r.full_name && r.full_name !== 'ללא שם');

            alert(`נמצאו ${validData.length} שורות תקינות מתוך ${data.length}. מתחיל ייבוא עם גיאוקודינג...`);

            // Geocode by city (cached, bulk mode)
            for (let i = 0; i < validData.length; i++) {
                const loc = await geocodeAddress('', validData[i].city, true);
                validData[i].lat = loc.lat;
                validData[i].lng = loc.lng;
            }

            // Insert in chunks of 50 to avoid Supabase row limit per request
            const CHUNK = 50;
            let inserted = 0;
            let failed = 0;
            for (let i = 0; i < validData.length; i += CHUNK) {
                const chunk = validData.slice(i, i + CHUNK);
                const { error } = await supabase.from('volunteers').insert(chunk);
                if (error) {
                    console.error('Insert error for chunk', i, error);
                    failed += chunk.length;
                } else {
                    inserted += chunk.length;
                }
            }

            loadData();
            alert(`✅ יובאו ${inserted} מתנדבים בהצלחה!\n${failed > 0 ? `⚠️ נכשלו ${failed} שורות. בדוק Console לפרטים.` : ''}`);
        };
        reader.readAsBinaryString(file);
        e.target.value = null;
    };

    const statusLabel = (s) => s === 'available' ? 'פנוי לשיבוץ' : s === 'busy' ? 'לא זמין' : 'בפעילות';
    const statusColor = (s) => s === 'available' ? 'bg-emerald-100 text-emerald-700' : s === 'busy' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700';

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">ניהול מתנדבים</h2>
                    <p className="text-gray-500 mt-1">
                        מציג {filtered.length} מתוך {volunteers.length} מתנדבים
                        {hasActiveFilters && <button onClick={clearFilters} className="mr-2 text-primary text-xs underline">נקה מסננים</button>}
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls,.csv" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-gray-50 shadow-sm text-sm">
                        <Upload size={16} className="text-gray-400" /> יבוא
                    </button>
                    <button onClick={handleExport} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-gray-50 shadow-sm text-sm">
                        <Download size={16} className="text-gray-400" /> יצוא
                    </button>
                    <button onClick={() => { setEditingVol(null); setIsModalOpen(true); }} className="bg-primary text-white px-5 py-2 rounded-xl flex items-center gap-2 font-semibold shadow-md shadow-primary/20 transition-all hover:scale-105 text-sm">
                        <Plus size={18} /> הוסף ידנית
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 text-gray-500 font-semibold text-sm">
                    <Filter size={16} className="text-primary" /> סינונים
                </div>
                {/* Search */}
                <div className="relative">
                    <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="שם / טלפון..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="border border-gray-200 rounded-lg pr-9 pl-3 py-1.5 text-sm focus:outline-none focus:border-primary w-44"
                    />
                </div>
                {/* City */}
                <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white">
                    <option value="">כל הערים</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {/* Status */}
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white">
                    <option value="">כל הסטטוסים</option>
                    <option value="available">פנוי לשיבוץ</option>
                    <option value="assigned">בפעילות</option>
                    <option value="busy">לא זמין</option>
                </select>
                {/* Skill */}
                <select value={filterSkill} onChange={e => setFilterSkill(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white">
                    <option value="">כל הכישורים</option>
                    {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {/* Car */}
                <select value={filterCar} onChange={e => setFilterCar(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white">
                    <option value="">רכב - הכל</option>
                    <option value="yes">יש רכב</option>
                    <option value="no">אין רכב</option>
                </select>
                {/* Gender */}
                <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary bg-white">
                    <option value="">כל המגדרים</option>
                    <option value="זכר">זכר</option>
                    <option value="נקבה">נקבה</option>
                </select>
                {hasActiveFilters && (
                    <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                        <X size={14} /> נקה
                    </button>
                )}
            </div>

            {/* Cards Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400 font-medium">לא נמצאו מתנדבים התואמים לסינון הנוכחי.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((vol) => (
                        <div key={vol.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3 relative group hover:border-primary/30 hover:shadow-md transition-all">
                            {/* Action buttons */}
                            <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingVol(vol); setIsModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-primary bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={15} /></button>
                                <button onClick={() => handleDelete(vol.id)} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
                            </div>

                            {/* Name + Status */}
                            <div className="flex items-center gap-3 pt-1">
                                <div className={`p-2 rounded-full shrink-0 ${vol.status === 'assigned' ? 'bg-purple-100' : vol.status === 'busy' ? 'bg-red-100' : 'bg-blue-100'}`}>
                                    <Users className={vol.status === 'assigned' ? 'text-purple-600' : vol.status === 'busy' ? 'text-red-500' : 'text-blue-600'} size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-base text-gray-900 truncate">
                                        {vol.full_name}
                                        {vol.age && <span className="text-sm font-normal text-gray-400 mr-1">({vol.age})</span>}
                                    </h3>
                                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(vol.status)}`}>
                                            {statusLabel(vol.status)}
                                        </span>
                                        {vol.gender && <span className="text-xs text-gray-400">{vol.gender}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-1.5 text-sm text-gray-600">
                                <div className="flex items-center gap-2"><Phone size={14} className="text-gray-400 shrink-0" /><span dir="ltr">{vol.phone}</span></div>
                                <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400 shrink-0" /><span className="truncate">{[vol.address, vol.city].filter(Boolean).join(', ')}</span></div>
                                <div className="flex items-center gap-2"><Car size={14} className="text-gray-400 shrink-0" /><span>{vol.has_car ? '✓ יש רכב' : 'ללא רכב'}</span></div>
                            </div>

                            {/* Notes */}
                            {vol.notes && <p className="text-xs text-gray-400 italic line-clamp-1 border-t border-gray-50 pt-1">"{vol.notes}"</p>}

                            {/* Skills */}
                            {vol.skills && vol.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 border-t border-gray-50 pt-2">
                                    {vol.skills.slice(0, 3).map(s => <span key={s} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-md">{s}</span>)}
                                    {vol.skills.length > 3 && <span className="bg-gray-50 text-gray-500 text-xs px-2 py-0.5 rounded-md">+{vol.skills.length - 3}</span>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <VolunteerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} volunteer={editingVol} onSave={handleSave} />
        </div>
    );
};

export default Volunteers;
