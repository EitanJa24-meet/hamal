import React from 'react';

const MapView = () => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500 h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">מפת שליטה</h2>
                    <p className="text-gray-500 mt-1">צפייה באירועים בזמן אמת</p>
                </div>
            </div>

            <div className="flex-1 rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative">
                <iframe
                    title="Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight="0"
                    marginWidth="0"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=34.7%2C31.7%2C35.3%2C32.2&amp;layer=mapnik"
                    className="absolute inset-0"
                ></iframe>
            </div>
        </div>
    );
};

export default MapView;
