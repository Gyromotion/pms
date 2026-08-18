import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, Users, LayoutDashboard, Settings, Calendar, LogOut, Shield, Menu, X } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PatientList from './components/PatientList';
import PatientForm from './components/PatientForm';
import PatientProfile from './components/PatientProfile';
import Appointments from './components/Appointments';
import StaffManager from './components/StaffManager';
import Invoice from './components/Invoice';
import DataExport from './components/DataExport';
import GuidedTour from './components/GuidedTour';
import './index.css';
import logo from './assets/logo.png';

function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const navItems = [
    { path: '/', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { path: '/patients', label: 'Patients', icon: <Users size={20} /> },
    { path: '/appointments', label: 'Appointments', icon: <Calendar size={20} /> },
  ];

  if (currentUser?.role === 'admin') {
    navItems.push({ path: '/data', label: 'Data & Reports', icon: <Activity size={20} /> });
    navItems.push({ path: '/staff', label: 'Manage Staff', icon: <Shield size={20} /> });
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={() => setIsOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 998 }}
        />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div className="sidebar-header">
        <div className="logo-container">
          <img src={logo} alt="Gyromotion Logo" style={{ width: '140px', height: 'auto', objectFit: 'contain' }} />
        </div>
      </div>
      <nav className="sidebar-nav" style={{ flex: 1 }}>
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path} 
            onClick={() => setIsOpen(false)}
            className={`nav-item ${location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)) ? 'active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer" style={{ padding: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0 0.5rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {currentUser?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>
            {currentUser?.name}
          </div>
        </div>
        <button onClick={logout} className="nav-item" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </aside>
    </>
  );
}

function MainApp() {
  const { currentUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  if (!currentUser) {
    return <Login />;
  }

  return (
    <Router>
      <div className="app-container">
        <GuidedTour currentUser={currentUser} />
        
        {/* Mobile Header */}
        <div className="mobile-header">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="mobile-menu-btn" aria-label="Toggle Menu">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <img src={logo} alt="Gyromotion Logo" style={{ height: '30px', objectFit: 'contain' }} />
          <div style={{ width: '24px' }}></div> {/* Spacer to center logo */}
        </div>

        <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
        <main className="main-content glass-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/patients" element={<PatientList />} />
              <Route path="/patients/new" element={<PatientForm />} />
              <Route path="/patients/:id" element={<PatientProfile />} />
              <Route path="/patients/:id/edit" element={<PatientForm />} />
              <Route path="/patients/:id/invoice" element={<Invoice />} />
              <Route path="/appointments" element={<Appointments />} />
              {currentUser.role === 'admin' && (
                <>
                  <Route path="/data" element={<DataExport />} />
                  <Route path="/staff" element={<StaffManager />} />
                </>
              )}
            </Routes>
          </div>
          
          <footer style={{ 
            textAlign: 'center', 
            padding: '1.5rem 1rem 0.5rem', 
            marginTop: '2rem', 
            color: 'var(--text-muted)', 
            fontSize: '0.85rem', 
            borderTop: '1px solid var(--border-color)' 
          }}>
            &copy; {new Date().getFullYear()} Gyromotion Physiotherapy Clinic &bull; Created by <strong>Pratham Joshi</strong>
          </footer>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
