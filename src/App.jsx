import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Volunteers from './pages/Volunteers';
import MapView from './pages/Map';
import Login from './pages/Login';
import Register from './pages/Register';

// Mock Auth Guard
const RequireAuth = ({ children }) => {
  const isAuth = localStorage.getItem('auth') === 'true';
  return isAuth ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }>
          <Route index element={<Dashboard />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="volunteers" element={<Volunteers />} />
          <Route path="map" element={<MapView />} />
          <Route path="*" element={<div className="p-8 text-center text-gray-500">עמוד בבנייה (Under Construction)</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
