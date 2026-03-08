import React, { useState, useEffect } from 'react';
import { Users, Phone, MapPin, Car, ShieldCheck } from 'lucide-react';

const Volunteers = () => {
    const [volunteers, setVolunteers] = useState([]);

    useEffect(() => {
        fetch('/api/volunteers')
            .then(res => res.json())
            .then(data => setVolunteers(data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">מתנדבים</h2>
                    <p className="text-gray-500 mt-1">{volunteers.length} מתנדבים רשומים</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {volunteers.map((vol) => (
                    <div key={vol.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-full">
                                    <Users className="text-blue-600" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{vol.name}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${vol.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {vol.status === 'available' ? 'פנוי' : 'עסוק'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mt-2">
                            <div className="flex items-center gap-2 text-gray-600 text-sm">
                                <Phone size={16} />
                                <span dir="ltr">{vol.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 text-sm">
                                <MapPin size={16} />
                                <span>{vol.city}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 text-sm">
                                <Car size={16} />
                                <span>{vol.vehicle}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Volunteers;
