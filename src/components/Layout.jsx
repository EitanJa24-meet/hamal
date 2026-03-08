import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, Users, ClipboardList, AlertTriangle, Shield } from 'lucide-react';
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
            <aside className="w-64 bg-white shadow-xl flex flex-col z-20 shrink-0">
                <div className="bg-primary text-white p-6 flex flex-col items-center justify-center relative overflow-hidden">
                    {/* Header Graphic */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white to-transparent"></div>
                    <div className="flex flex-col items-center gap-2 z-10 w-full justify-center">
                        <img src="/logo.png" alt="Logo" className="h-20 w-auto bg-white/20 rounded-md p-0.5" />
                        <div className="text-center">
                            <h1 className="text-lg font-bold tracking-tight">לב אחד</h1>
                            <p className="text-xs opacity-80 font-medium">חמ"ל דרך פרת</p>
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
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-primary hover:scale-[1.01]'
                                    }`}
                            >
                                <item.icon size={20} className={isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} />
                                <span className="font-semibold">{item.label}</span>
                            </Link>
                        );
                    })}

                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <button onClick={() => setIsEmergencyOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-alert hover:bg-red-50 hover:scale-[1.01] group">
                            <AlertTriangle size={20} className="opacity-80 group-hover:opacity-100" />
                            <span className="font-semibold">חירום מהיר</span>
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
                task={{ name: 'אירוע חירום דחוף!', type: 'עזרה כללית', description: '', address: '', city: '', urgency: 'high', volunteers_needed: 1, status: 'open', general_help: false }}
                onSave={handleEmergencySave}
            />
        </div>
    );
};

export default Layout;
