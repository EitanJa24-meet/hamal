import React, { useState, useEffect, useRef } from 'react';
import { Users, Phone, MapPin, Car, Download, Upload, Plus, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import VolunteerModal from '../components/VolunteerModal';
import * as XLSX from 'xlsx';

const Volunteers = () => {
    const [volunteers, setVolunteers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVol, setEditingVol] = useState(null);
    const fileInputRef = useRef(null);

    const loadData = () => {
        supabase.from('volunteers').select('*').order('full_name').then(({ data, error }) => {
            if (!error && data) setVolunteers(data);
        });
    }

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (id) => {
        if (confirm('האם אתה בטוח שברצונך למחוק מתנדב/ת זה?')) {
            const { error } = await supabase.from('volunteers').delete().eq('id', id);
            if (!error) setVolunteers(volunteers.filter(v => v.id !== id));
        }
    };

    const handleSave = async (data) => {
        const lat = data.lat || (32.0853 + (Math.random() * 0.1 - 0.05));
        const lng = data.lng || (34.7818 + (Math.random() * 0.1 - 0.05));

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
        const ws = XLSX.utils.json_to_sheet(volunteers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Volunteers");
        XLSX.writeFile(wb, "Volunteers_Export.xlsx");
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

            const mappedData = data.map(row => ({
                full_name: row.full_name || row['שם מלא'] || row['שחקן'] || 'ללא שם',
                phone: row.phone || row['טלפון'] || row['נייד'] || '',
                city: row.city || row['עיר'] || 'תל אביב',
                address: row.address || row['כתובת'] || '',
                has_car: String(row.has_car || row['רכב']).toLowerCase() === 'true' || row['רכב'] === 'כן',
                lat: 32.0853 + (Math.random() * 0.1 - 0.05),
                lng: 34.7818 + (Math.random() * 0.1 - 0.05),
                status: 'available',
                skills: []
            }));

            if (mappedData.length > 0) {
                await supabase.from('volunteers').insert(mappedData);
                loadData();
                alert(`יובאו ${mappedData.length} מתנדבים בהצלחה`);
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = null; // reset
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">ניהול מתנדבים</h2>
                    <p className="text-gray-500 mt-1">{volunteers.length} מתנדבים רשומים</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
                    <button onClick={handleImportClick} className="bg-white border text-sm md:text-base border-gray-200 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-gray-50 transition-colors shadow-sm">
                        <Upload size={18} className="text-gray-400" /> יבוא
                    </button>
                    <button onClick={handleExport} className="bg-white border text-sm md:text-base border-gray-200 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-gray-50 transition-colors shadow-sm">
                        <Download size={18} className="text-gray-400" /> יצוא
                    </button>
                    <button onClick={() => { setEditingVol(null); setIsModalOpen(true); }} className="bg-primary hover:bg-blue-700 text-white text-sm md:text-base px-5 py-2 rounded-xl flex items-center gap-2 font-semibold shadow-md shadow-primary/20 transition-all hover:scale-105">
                        <Plus size={20} /> הוסף ידנית
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {volunteers.map((vol) => (
                    <div key={vol.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4 relative group hover:border-blue-200 transition-colors">
                        <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingVol(vol); setIsModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-primary bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(vol.id)} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                        <div className="flex justify-between items-start pt-1">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${vol.status === 'assigned' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                                    <Users className={vol.status === 'assigned' ? 'text-purple-600' : 'text-blue-600'} size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{vol.full_name}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${vol.status === 'available' ? 'bg-emerald-100 text-emerald-700' : (vol.status === 'busy' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700')}`}>
                                        {vol.status === 'available' ? 'פנוי לשיבוץ' : (vol.status === 'busy' ? 'לא זמין' : 'בפעילות')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mt-2">
                            <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
                                <Phone size={16} className="text-gray-400" />
                                <span dir="ltr">{vol.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
                                <MapPin size={16} className="text-gray-400" />
                                <span>{vol.address}, {vol.city}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
                                <Car size={16} className="text-gray-400" />
                                <span>{vol.has_car ? 'נייד עם רכב' : 'ללא רכב ממנוע'}</span>
                            </div>
                            {vol.skills && vol.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-gray-100 line-clamp-2">
                                    {vol.skills.slice(0, 3).map(s => <span key={s} className="bg-gray-50 border border-gray-100 text-xs px-2 py-0.5 rounded-md text-gray-600">{s}</span>)}
                                    {vol.skills.length > 3 && <span className="bg-gray-50 border border-gray-100 text-xs px-2 py-0.5 rounded-md text-gray-600">+{vol.skills.length - 3}</span>}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <VolunteerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                volunteer={editingVol}
                onSave={handleSave}
            />
        </div>
    );
};

export default Volunteers;
