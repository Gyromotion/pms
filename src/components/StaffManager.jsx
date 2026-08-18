import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { adminAuth, createUserWithEmailAndPassword } from '../lib/adminAuth';
import { Shield, UserPlus, History, Compass } from 'lucide-react';

export default function StaffManager() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Edit state
  const [editingStaff, setEditingStaff] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Login Logs state
  const [viewingLogsFor, setViewingLogsFor] = useState(null);
  const [userLogs, setUserLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const usersList = [];
      snap.forEach(doc => {
        usersList.push({ id: doc.id, ...doc.data() });
      });
      setStaff(usersList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    
    try {
      // Create user in secondary auth instance
      const userCred = await createUserWithEmailAndPassword(adminAuth, email, password);
      
      // Save profile to firestore
      await setDoc(doc(db, 'users', userCred.user.uid), {
        name,
        email,
        role: 'worker',
        isActive: true,
        createdAt: new Date().toISOString()
      });

      // Clear form
      setName('');
      setEmail('');
      setPassword('');
      alert("Doctor account created successfully!");
      loadStaff();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleRole = async (user) => {
    try {
      const newRole = user.role === 'admin' ? 'worker' : 'admin';
      await setDoc(doc(db, 'users', user.id), { role: newRole }, { merge: true });
      loadStaff();
    } catch (e) {
      console.error(e);
      alert('Error updating role');
    }
  };

  const handleEditClick = (user) => {
    setEditingStaff(user);
    setEditName(user.name);
    setEditEmail(user.email);
  };

  const handleSaveEdit = async () => {
    if (!editName || !editEmail) return alert("Fields cannot be empty");
    try {
      await setDoc(doc(db, 'users', editingStaff.id), { name: editName, email: editEmail }, { merge: true });
      setEditingStaff(null);
      loadStaff();
      alert("Staff details updated!\\n\\nNote: If you changed the email, it only updates their display profile. They must still use their ORIGINAL email address to log in.");
    } catch(e) {
      console.error(e);
      alert('Error updating staff');
    }
  };

  const handleTriggerTour = async (user) => {
    try {
      // Use a timestamp so we can track exactly WHICH tour request the user finished
      await setDoc(doc(db, 'users', user.id), { needsTour: Date.now() }, { merge: true });
      loadStaff();
      alert(`Tour triggered! The interactive guide will launch for ${user.name} the next time they log in.`);
    } catch(e) {
      console.error(e);
      alert('Error triggering tour');
    }
  };

  const handleViewLogs = async (user) => {
    setViewingLogsFor(user);
    setLoadingLogs(true);
    setUserLogs([]);
    try {
      const q = query(
        collection(db, 'login_logs'),
        where('uid', '==', user.id)
        // Note: orderBy requires a composite index in Firestore if combined with where. 
        // We will fetch and sort in memory to avoid needing user to create an index right away.
      );
      const snap = await getDocs(q);
      const logs = [];
      snap.forEach(d => logs.push(d.data()));
      
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setUserLogs(logs.slice(0, 20)); // Limit to last 20 in memory
    } catch(e) {
      console.error(e);
      alert('Error loading logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleToggleActive = async (user) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} ${user.name}?`)) {
      await setDoc(doc(db, 'users', user.id), { isActive: !user.isActive }, { merge: true });
      loadStaff();
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield size={28} className="text-primary" />
        <h1>Manage Staff</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card glass-panel">
            <h3 className="mb-4 flex items-center gap-2"><UserPlus size={20} /> Add New Doctor</h3>
            {error && <div className="mb-4 text-sm text-danger">{error}</div>}
            <form onSubmit={handleCreateUser}>
              <div className="form-group mb-4">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control" required value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-control" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="form-group mb-6">
                <label className="form-label">Password</label>
                <input type="password" className="form-control" required minLength="6" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={creating}>
                {creating ? 'Creating...' : 'Create Doctor Account'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card glass-panel">
            <h3 className="mb-4">Clinic Staff</h3>
            {loading ? <p>Loading...</p> : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(user => (
                      <tr key={user.id}>
                        <td style={{ fontWeight: '500' }}>{user.name}</td>
                        <td className="text-muted">{user.email}</td>
                        <td><span className="badge" style={{ backgroundColor: user.role === 'admin' ? '#fef3c7' : '#e0e7ff', color: user.role === 'admin' ? '#d97706' : '#4338ca', textTransform: 'capitalize' }}>{user.role === 'worker' ? 'Doctor' : user.role}</span></td>
                        <td>
                          <span className={`badge ${user.isActive ? 'badge-success' : 'badge-warning'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => handleViewLogs(user)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#6366f1', borderColor: '#6366f1' }}>
                              <History size={14} style={{ display: 'inline', marginRight: '4px' }} /> View Logins
                            </button>
                            <button onClick={() => handleTriggerTour(user)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#10b981', borderColor: '#10b981' }}>
                              <Compass size={14} style={{ display: 'inline', marginRight: '4px' }} /> Tour
                            </button>
                            {user.email !== 'gyromotion.physio@gmail.com' && (
                              <>
                                <button onClick={() => handleEditClick(user)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                                  Edit
                                </button>
                                {user.role !== 'admin' && (
                                  <button onClick={() => handleToggleActive(user)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                                    {user.isActive ? 'Deactivate' : 'Activate'}
                                  </button>
                                )}
                                <button onClick={() => handleToggleRole(user)} className={`btn ${user.role === 'admin' ? 'btn-secondary' : 'btn-outline'}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                                  {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '90%', maxWidth: '400px', backgroundColor: '#fff', padding: '2rem' }}>
            <h3 className="mb-4">Edit Staff Profile</h3>
            <div className="form-group mb-3">
              <label>Name</label>
              <input type="text" className="input w-full" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="form-group mb-4">
              <label>Display Email</label>
              <input type="email" className="input w-full" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
              <small className="text-muted" style={{ display: 'block', marginTop: '5px', fontSize: '0.75rem' }}>
                Warning: Changing this does not change their actual login credentials.
              </small>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn btn-outline" onClick={() => setEditingStaff(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* View Logs Modal */}
      {viewingLogsFor && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '90%', maxWidth: '500px', backgroundColor: '#fff', padding: '2rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 className="mb-4">Login History: {viewingLogsFor.name}</h3>
            {loadingLogs ? <p>Loading logs...</p> : (
              userLogs.length === 0 ? <p className="text-muted">No login history found.</p> : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '10px 15px', fontWeight: '600', fontSize: '0.85rem' }}>Date</th>
                        <th style={{ padding: '10px 15px', fontWeight: '600', fontSize: '0.85rem' }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userLogs.map((log, idx) => {
                        const d = new Date(log.timestamp);
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '10px 15px', fontSize: '0.9rem' }}>{d.toLocaleDateString()}</td>
                            <td style={{ padding: '10px 15px', fontSize: '0.9rem' }}>{d.toLocaleTimeString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button className="btn btn-outline" onClick={() => setViewingLogsFor(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
