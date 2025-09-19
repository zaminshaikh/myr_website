import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import DevModeToggle from '../components/DevModeToggle';
import { FaUser, FaSync, FaSignOutAlt, FaArrowLeft } from 'react-icons/fa';
import './Admin.css';

const Admin = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { currentUser, signout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const getRegistrations = httpsCallable(functions, 'getRegistrations');
      const result = await getRegistrations();
      
      if (result.data.success) {
        setRegistrations(result.data.registrations);
      } else {
        setError('Failed to fetch registrations');
      }
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setError('Failed to fetch registrations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRegistrations = registrations.filter(registration => {
    const matchesSearch = 
      registration.parent?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.registrationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.children?.some(child => 
        child.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesStatus = statusFilter === 'all' || registration.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getTotalParticipants = () => {
    return registrations.reduce((total, reg) => total + (reg.children?.length || 0), 0);
  };

  const getTotalRevenue = () => {
    return registrations
      .filter(reg => reg.status === 'paid')
      .reduce((total, reg) => total + (reg.total || 0), 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#28a745';
      case 'pending': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      try {
        await signout();
        navigate('/');
      } catch (error) {
        console.error('Error logging out:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading">Loading registrations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="error">Error: {error}</div>
        <button onClick={fetchRegistrations} className="retry-btn">Retry</button>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-nav">
          <Link to="/" className="back-link"><FaArrowLeft /> Back to Home</Link>
          <h1>Admin Portal - MYR 2025 Registrations</h1>
          <div className="admin-controls-right">
            <div className="user-info">
              <span className="user-email"><FaUser /> {currentUser?.email}</span>
            </div>
            <button onClick={fetchRegistrations} className="refresh-btn"><FaSync /> Refresh</button>
            <button onClick={handleLogout} className="logout-btn"><FaSignOutAlt /> Logout</button>
          </div>
        </div>
        
        <div className="admin-stats">
          <div className="stat-card">
            <h3>Total Registrations</h3>
            <div className="stat-number">{registrations.length}</div>
          </div>
          <div className="stat-card">
            <h3>Total Participants</h3>
            <div className="stat-number">{getTotalParticipants()}</div>
          </div>
          <div className="stat-card">
            <h3>Total Revenue</h3>
            <div className="stat-number">${getTotalRevenue()}</div>
          </div>
          <div className="stat-card">
            <h3>Paid Registrations</h3>
            <div className="stat-number">
              {registrations.filter(r => r.status === 'paid').length}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-controls">
        <div className="search-filter-container">
          <input
            type="text"
            placeholder="Search by name or registration ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="registrations-list">
        {filteredRegistrations.length === 0 ? (
          <div className="no-registrations">
            {searchTerm || statusFilter !== 'all' 
              ? 'No registrations match your search criteria.' 
              : 'No registrations found.'}
          </div>
        ) : (
          filteredRegistrations.map((registration) => (
            <div key={registration.id} className="registration-card">
              <div className="registration-header">
                <div className="registration-info">
                  <h3>{registration.parent?.name || 'N/A'}</h3>
                  <p className="registration-id">ID: {registration.registrationId}</p>
                  <p className="registration-date">
                    Registered: {formatDate(registration.createdAt)}
                  </p>
                </div>
                <div className="registration-status">
                  <span 
                    className="status-badge" 
                    style={{ backgroundColor: getStatusColor(registration.status) }}
                  >
                    {registration.status?.toUpperCase()}
                  </span>
                  <div className="registration-total">
                    ${registration.total}
                  </div>
                </div>
              </div>
              
              <div className="registration-details">
                <div className="detail-section">
                  <h4>Contact Information</h4>
                  <p><strong>Email:</strong> {registration.parent?.email || 'N/A'}</p>
                  <p><strong>Phone:</strong> {registration.parent?.phone || 'N/A'}</p>
                  <p><strong>Address:</strong> {registration.parent?.address || 'N/A'} 
                    {registration.parent?.apartment && `, ${registration.parent.apartment}`}
                  </p>
                  <p><strong>City:</strong> {registration.parent?.city || 'N/A'}, {registration.parent?.state || 'N/A'} {registration.parent?.zipCode || 'N/A'}</p>
                  <p><strong>Country:</strong> {registration.parent?.country || 'N/A'}</p>
                </div>

                <div className="detail-section">
                  <h4>Participants ({registration.children?.length || 0})</h4>
                  {registration.children?.map((child, idx) => (
                    <div key={idx} className="participant-info">
                      <p><strong>{child.name}</strong> - Age {child.age}, Grade {child.grade}, {child.gender}</p>
                      {child.dietary && <p><em>Dietary:</em> {child.dietary}</p>}
                      {child.medical && <p><em>Medical:</em> {child.medical}</p>}
                      <p><em>Emergency Contact:</em> {child.emergencyContact} ({child.emergencyPhone})</p>
                    </div>
                  ))}
                </div>

                {registration.paymentIntentId && (
                  <div className="detail-section">
                    <h4>Payment Information</h4>
                    <p><strong>Payment Intent ID:</strong> {registration.paymentIntentId}</p>
                    {registration.paymentConfirmedAt && (
                      <p><strong>Payment Confirmed:</strong> {formatDate(registration.paymentConfirmedAt)}</p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="registration-actions">
                <button 
                  onClick={() => setSelectedRegistration(
                    selectedRegistration === registration.id ? null : registration.id
                  )}
                  className="toggle-details-btn"
                >
                  {selectedRegistration === registration.id ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <DevModeToggle />
    </div>
  );
};

export default Admin;