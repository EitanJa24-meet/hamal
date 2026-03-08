```javascript
import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, ClipboardList, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { supabase } from '../supabaseClient';

const StatCard = ({ title, subtitle, count, icon: Icon, iconColor, iconBg }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p - 3 rounded - xl ${ iconBg } shadow - sm group - hover: scale - 110 transition - transform`}>
        <Icon className={iconColor} size={24} />
      </div>
      <div className="text-right w-full pr-4">
        <h3 className="text-gray-500 font-medium text-sm">{title}</h3>
        {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
      </div>
    </div>
    <div className="flex justify-end items-end">
      <span className="text-4xl font-bold tracking-tight text-gray-900">{count}</span>
    </div>
  </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({
        volunteers_available: 0,
        tasks_open: 0,
        emergencies_active: 0,
        tasks_completed: 0
    });
    const [charts, setCharts] = useState({ byType: [], byCity: [] });

    useEffect(() => {
        const fetchStats = async () => {
            const vols = await supabase.from('volunteers').select('*', { count: 'exact', head: true }).eq('status', 'available');
            const openT = await supabase.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['פתוחה', 'open']);
            const compT = await supabase.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['הושלמה', 'completed']);
            const actE = await supabase.from('emergencies').select('*', { count: 'exact', head: true }).eq('status', 'active');
            
            setStats({
                volunteers_available: vols.count || 0,
                tasks_open: openT.count || 0,
                tasks_completed: compT.count || 0,
                emergencies_active: actE.count || 0
            });

            const { data: allTasks } = await supabase.from('tasks').select('type, location');
            if (allTasks) {
                const typeCounts = {};
                const cityCounts = {};
                allTasks.forEach(t => {
                    typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
                    if(t.location) {
                        const city = t.location.split(',')[0].trim();
                        cityCounts[city] = (cityCounts[city] || 0) + 1;
                    }
                });
                setCharts({
                    byType: Object.keys(typeCounts).map(type => ({ name: type, value: typeCounts[type], color: '#2563eb' })),
                    byCity: Object.keys(cityCounts).map(city => ({ city, count: cityCounts[city] }))
                });
            }
        };
        fetchStats();
    }, []);
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">דאשבורד מרכז שליטה</h2>
                    <p className="text-gray-500 mt-1">סקירת מצב בזמן אמת</p>
                </div>
                <button className="bg-alert hover:bg-red-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-semibold shadow-lg shadow-alert/20 transition-all hover:scale-105 active:scale-95">
                    <AlertTriangle size={20} />
                    אירוע חירום חדש
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="הושלמו"
                    count={stats.tasks_completed}
                    icon={CheckCircle2}
                    iconColor="text-emerald-500"
                    iconBg="bg-emerald-100"
                />
                <StatCard
                    title="חירום פעיל"
                    count={stats.emergencies_active}
                    icon={AlertTriangle}
                    iconColor="text-red-500"
                    iconBg="bg-red-100"
                />
                <StatCard
                    title="משימות פתוחות"
                    subtitle={`${ stats.tasks_open } סה״כ`}
                    count={stats.tasks_open}
                    icon={ClipboardList}
                    iconColor="text-yellow-600"
                    iconBg="bg-yellow-100"
                />
                <StatCard
                    title="מתנדבים"
                    subtitle={`${ stats.volunteers_available } זמינים`}
                    count={stats.volunteers_available}
                    icon={Users}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-100"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6 self-start">משימות לפי סוג</h3>
                    <div className="h-64 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={charts.byType}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name }) => name}
                                    labelLine={false}
                                >
                                    {charts.byType.map((entry, index) => (
                                        <Cell key={`cell - ${ index } `} fill={entry.color || '#2563eb'} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bar Chart */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">משימות לפי עיר</h3>
                    <div className="h-64 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.byCity}
                                layout="vertical"
                                margin={{ top: 0, right: 0, left: 40, bottom: 0 }}
                            >
                                <XAxis type="number" hide />
                                <YAxis dataKey="city" type="category" axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '12px', borderColor: '#f3f4f6' }}
                                />
                                <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
