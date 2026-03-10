import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Volunteers from './pages/Volunteers';
import ErrorBoundary from './components/ErrorBoundary';

const MapView = lazy(() => import('./pages/Map'));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="volunteers" element={<Volunteers />} />
          <Route path="map" element={
            <ErrorBoundary>
              <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]" dir="rtl"><div className="text-gray-500 font-bold">טוען מפה...</div></div>}>
                <MapView />
              </Suspense>
            </ErrorBoundary>
          } />
          <Route path="*" element={<div className="p-8 text-center text-gray-500">עמוד בבנייה (Under Construction)</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
