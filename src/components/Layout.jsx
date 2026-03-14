import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, Users, ClipboardList, AlertTriangle, Zap } from 'lucide-react';
import TaskModal from './TaskModal';
import { supabase } from '../supabaseClient';
import { geocodeAddress } from '../utils/geocode';
import { cleanTaskData } from '../utils/taskUtils';

const Layout = () => {
    const location = useLocation();
    const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

    const handleEmergencySave = async (data) => {
        const loc = await geocodeAddress(data.address, data.city);
        const clean = cleanTaskData({ ...data, lat: loc.lat, lng: loc.lng, status: 'open' });
        const { error } = await supabase.from('tasks').insert([clean]);
        setIsEmergencyOpen(false);
        if (!error) alert("אירוע חירום נפתח בהצלחה והוזן במפה!");
        else alert("שגיאה בפתיחת אירוע חירום: " + error.message);
    };

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'דאשבורד' },
        { path: '/match', icon: Zap, label: 'התאמת מתנדבים' },
        { path: '/map', icon: Map, label: 'מפה' },
        { path: '/volunteers', icon: Users, label: 'מתנדבים' },
        { path: '/tasks', icon: ClipboardList, label: 'משימות' },
    ];

    return (
        <div className="flex h-screen w-full bg-surface overflow-hidden">
            <aside className="group w-16 hover:w-64 bg-white shadow-xl flex flex-col z-20 shrink-0 border-l border-gray-100 transition-all duration-200 overflow-hidden">
                <div className="bg-white p-4 group-hover:p-6 flex flex-col items-center justify-center border-b border-gray-50 min-w-[256px]">
                    <div className="flex flex-col items-center gap-2 w-full">
                        <img src="/logo.png" alt="Logo" className="h-12 group-hover:h-20 w-auto object-contain transition-all duration-200" />
                        <div className="text-center max-w-0 group-hover:max-w-[140px] overflow-hidden transition-all duration-200">
                            <h1 className="text-lg font-bold tracking-tight text-primary whitespace-nowrap">לב אחד</h1>
                            <p className="text-xs text-gray-400 font-bold whitespace-nowrap">חמ"ל דרך פרת</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-3 group-hover:px-4 space-y-2 min-w-[256px]">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 group-hover:px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                                    }`}
                            >
                                <item.icon size={20} className="shrink-0" />
                                <span className="font-semibold max-w-0 group-hover:max-w-[140px] overflow-hidden transition-all duration-200 whitespace-nowrap">{item.label}</span>
                            </Link>
                        );
                    })}

                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <button onClick={() => setIsEmergencyOpen(true)} className="w-full flex items-center gap-3 px-3 group-hover:px-4 py-3 rounded-xl transition-all duration-200 text-alert hover:bg-red-50">
                            <AlertTriangle size={20} className="shrink-0" />
                            <span className="font-semibold max-w-0 group-hover:max-w-[100px] overflow-hidden transition-all duration-200 whitespace-nowrap">חירום מהיר</span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 h-screen overflow-y-auto bg-surface relative">
                <div className="max-w-7xl mx-auto p-8 relative z-10">
                    <Outlet />
                </div>
            </main>

            <TaskModal
                isOpen={isEmergencyOpen}
                onClose={() => setIsEmergencyOpen(false)}
                task={{ name: 'אירוע חירום דחוף!', type: 'עזרה כללית', description: '', address: '', city: '', urgency: 'emergency', volunteers_needed: 1, status: 'open', general_help: false }}
                onSave={handleEmergencySave}
            />
        </div>
    );
};

export default Layout;
