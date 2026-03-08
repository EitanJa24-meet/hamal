import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, Users, ClipboardList, AlertTriangle, LogOut, Shield } from 'lucide-react';
import TaskModal from './TaskModal';
import { supabase } from '../supabaseClient';
import { geocodeAddress } from '../utils/geocode';

const Layout = () => {
    const location = useLocation();
    const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

    const handleEmergencySave = async (data) => {
        const loc = await geocodeAddress(data.address, data.city);
        const { error } = await supabase.from('tasks').insert([{ ...data, lat: loc.lat, lng: loc.lng }]);
        setIsEmergencyOpen(false);
        if (!error) alert("אירוע חירום נפתח בהצלחה והוזן במפה!");
    };

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'דאשבורד' },
        { path: '/map', icon: Map, label: 'מפה' },
        { path: '/volunteers', icon: Users, label: 'מתנדבים' },
        { path: '/tasks', icon: ClipboardList, label: 'משימות' },
    ];

    return (
        <div className="flex h-screen w-full bg-surface overflow-hidden">
            {/* Right Sidebar */}
            <aside className="w-64 bg-white shadow-2xl flex flex-col z-20 shrink-0 border-l border-gray-100">
                <div className="bg-white p-6 border-b border-gray-100 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="flex flex-col items-center gap-2 z-10 w-full">
                        <img src="/logo.png" alt="דרך פרת" className="h-[75px] w-auto drop-shadow-sm mb-1" />
                        <div className="text-center">
                            <h1 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase opacity-70">מרכז שליטה חברתי</h1>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-primary'
                                    }`}
                            >
                                <item.icon size={20} className={isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'} />
                                <span className={`font-bold text-sm ${isActive ? 'tracking-wide' : 'tracking-normal'}`}>{item.label}</span>
                            </Link>
                        );
                    })}

                    <div className="pt-6 mt-6 border-t border-gray-100">
                        <button onClick={() => setIsEmergencyOpen(true)} className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all duration-300 bg-secondary/5 text-secondary border border-secondary/10 hover:bg-secondary hover:text-white shadow-sm hover:shadow-secondary/20 group">
                            <AlertTriangle size={20} className="animate-pulse" />
                            <span className="font-black text-sm uppercase tracking-tighter">פתיחת אירוע חירום</span>
                        </button>
                    </div>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-gray-800 transition-colors">
                        <LogOut size={20} />
                        <span className="font-medium">התנתק</span>
                    </button>
                </div>
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
                task={{ name: 'אירוע חירום דחוף!', type: 'עזרה כללית', description: '', address: '', city: '', urgency: 'high', volunteers_needed: 1, status: 'open', general_help: false }}
                onSave={handleEmergencySave}
            />
        </div>
    );
};

export default Layout;
