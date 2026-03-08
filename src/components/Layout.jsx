import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, Users, ClipboardList, AlertTriangle, LogOut, Shield } from 'lucide-react';

const Layout = () => {
    const location = useLocation();

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
                    <div className="flex items-center gap-3 z-10 w-full justify-center">
                        <div className="text-right">
                            <h1 className="text-xl font-bold tracking-tight">מרכז שליטה</h1>
                            <p className="text-sm opacity-80 font-medium">ניהול מתנדבים</p>
                        </div>
                        <Shield size={32} className="opacity-90 mt-1" />
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
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-alert hover:bg-red-50 hover:scale-[1.01] group">
                            <AlertTriangle size={20} className="opacity-80 group-hover:opacity-100" />
                            <span className="font-semibold">חירום מהיר</span>
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
        </div>
    );
};

export default Layout;
