import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import DevModeToggle from '../components/DevModeToggle';
import { FaUser, FaSync, FaSignOutAlt, FaArrowLeft, FaDownload } from 'react-icons/fa';
import './Admin.css';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('registrations');
  const [registrations, setRegistrations] = useState([]);
  const [guardians, setGuardians] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [guardianActiveFilter, setGuardianActiveFilter] = useState('all');
  const [participantActiveFilter, setParticipantActiveFilter] = useState('all');
  const { currentUser, signout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRegistrations(),
        fetchGuardians(), 
        fetchParticipants()
      ]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    const getRegistrations = httpsCallable(functions, 'getRegistrations');
    const result = await getRegistrations();
    
    if (result.data.success) {
      setRegistrations(result.data.registrations);
    } else {
      throw new Error('Failed to fetch registrations');
    }
  };

  const fetchGuardians = async () => {
    const getGuardians = httpsCallable(functions, 'getGuardians');
    const result = await getGuardians();
    
    if (result.data.success) {
      setGuardians(result.data.guardians);
    } else {
      throw new Error('Failed to fetch guardians');
    }
  };

  const fetchParticipants = async () => {
    const getParticipants = httpsCallable(functions, 'getParticipants');
    const result = await getParticipants();
    
    if (result.data.success) {
      setParticipants(result.data.participants);
    } else {
      throw new Error('Failed to fetch participants');
    }
  };

  // Filter functions for each data type
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

  const filteredGuardians = guardians.filter(guardian => {
    const matchesSearch = guardian.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           guardian.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           guardian.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           guardian.guardianId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActiveFilter = guardianActiveFilter === 'all' || 
           (guardianActiveFilter === 'active' && guardian.active !== false) ||
           (guardianActiveFilter === 'inactive' && guardian.active === false);
    
    return matchesSearch && matchesActiveFilter;
  });

  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = participant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           participant.participantId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           participant.guardian?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           participant.guardian?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActiveFilter = participantActiveFilter === 'all' || 
           (participantActiveFilter === 'active' && participant.active !== false) ||
           (participantActiveFilter === 'inactive' && participant.active === false);
    
    return matchesSearch && matchesActiveFilter;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    let date;
    
    // Handle different timestamp formats from Firebase
    if (timestamp && typeof timestamp === 'object') {
      // Firestore Timestamp object with toDate method
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // Firestore Timestamp object with seconds and nanoseconds
      else if (timestamp.seconds !== undefined) {
        date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
      }
      // Firebase Timestamp object with _seconds
      else if (timestamp._seconds !== undefined) {
        date = new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
      }
      // Regular Date object or other object
      else {
        date = new Date(timestamp);
      }
    } else {
      // String or number timestamp
      date = new Date(timestamp);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // CSV Export Functions
  const convertToCSV = (data, headers) => {
    if (!data || data.length === 0) return '';
    
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (value && (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n'))) {
          return `"${value.toString().replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
  };

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportGuardiansCSV = () => {
    const headers = ['guardianId', 'name', 'email', 'phone', 'street', 'apartment', 'city', 'state', 'zipCode', 'country', 'participantCount', 'createdAt'];
    
    const csvData = guardians.map(guardian => ({
      guardianId: guardian.guardianId || '',
      name: guardian.name || '',
      email: guardian.email || '',
      phone: guardian.phone || '',
      street: guardian.address?.street || '',
      apartment: guardian.address?.apartment || '',
      city: guardian.address?.city || '',
      state: guardian.address?.state || '',
      zipCode: guardian.address?.zipCode || '',
      country: guardian.address?.country || '',
      participantCount: guardian.participantCount || 0,
      createdAt: formatDate(guardian.createdAt)
    }));
    
    const csvContent = convertToCSV(csvData, headers);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csvContent, `guardians_${timestamp}.csv`);
  };

  const exportParticipantsCSV = () => {
    const headers = ['participantId', 'name', 'age', 'grade', 'gender', 'guardianName', 'guardianEmail', 'guardianPhone', 'emergencyContactName', 'emergencyContactPhone', 'dietary', 'medical', 'createdAt'];
    
    const csvData = participants.map(participant => ({
      participantId: participant.participantId || '',
      name: participant.name || '',
      age: participant.age || '',
      grade: participant.grade || '',
      gender: participant.gender || '',
      guardianName: participant.guardian?.name || '',
      guardianEmail: participant.guardian?.email || '',
      guardianPhone: participant.guardian?.phone || '',
      emergencyContactName: participant.emergencyContact?.name || '',
      emergencyContactPhone: participant.emergencyContact?.phone || '',
      dietary: participant.dietary || '',
      medical: participant.medical || '',
      createdAt: formatDate(participant.createdAt)
    }));
    
    const csvContent = convertToCSV(csvData, headers);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csvContent, `participants_${timestamp}.csv`);
  };

  // Get statistics for dashboard
  const getTotalParticipants = () => {
    return participants.length;
  };

  const getTotalGuardians = () => {
    return guardians.length;
  };

  const getTotalRevenue = () => {
    return registrations
      .filter(reg => reg.status === 'paid')
      .reduce((total, reg) => total + (reg.total || 0), 0);
  };

  const getPaidRegistrations = () => {
    return registrations.filter(r => r.status === 'paid').length;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#28a745';
      case 'pending': return '#ffc107';
      case 'refunded': return '#dc3545';
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

  const handleRefund = async (registration) => {
    const confirmRefund = window.confirm(
      `Are you sure you want to refund the payment for ${registration.parent?.name || 'this registration'}?\n\n` +
      `Amount: $${registration.total}\n` +
      `Registration ID: ${registration.registrationId}\n\n` +
      `This action will process a full refund through Stripe and cannot be undone.`
    );

    if (!confirmRefund) return;

    try {
      setLoading(true);
      const refundPayment = httpsCallable(functions, 'refundPayment');
      const result = await refundPayment({
        paymentIntentId: registration.paymentIntentId,
        registrationId: registration.registrationId,
        amount: registration.total,
        reason: 'requested_by_customer'
      });

      if (result.data.success) {
        alert(`Refund processed successfully!\nRefund ID: ${result.data.refundId}\nAmount: $${result.data.refundAmount}`);
        await fetchAllData(); // Refresh data
      } else {
        throw new Error('Refund failed');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      alert(`Failed to process refund: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (registration) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to PERMANENTLY DELETE this registration?\n\n` +
      `Guardian: ${registration.parent?.name || 'N/A'}\n` +
      `Registration ID: ${registration.registrationId}\n` +
      `Participants: ${registration.children?.length || 0}\n\n` +
      `This action will:\n` +
      `• Delete the registration completely\n` +
      `• Remove all participant records\n` +
      `• Remove guardian record (if no other registrations)\n\n` +
      `THIS CANNOT BE UNDONE!`
    );

    if (!confirmDelete) return;

    // Double confirmation for delete
    const doubleConfirm = window.confirm(
      `FINAL CONFIRMATION\n\n` +
      `Type "DELETE" in your mind and click OK to proceed with permanent deletion of registration ${registration.registrationId}`
    );

    if (!doubleConfirm) return;

    try {
      setLoading(true);
      const deleteRegistration = httpsCallable(functions, 'deleteRegistration');
      const result = await deleteRegistration({
        registrationId: registration.registrationId
      });

      if (result.data.success) {
        alert(`Registration deleted successfully!\nRegistration ID: ${result.data.deletedRegistrationId}`);
        await fetchAllData(); // Refresh data
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Error deleting registration:', error);
      alert(`Failed to delete registration: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading">Loading data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="error">Error: {error}</div>
        <button onClick={fetchAllData} className="retry-btn">Retry</button>
      </div>
    );
  }

  // Get active data based on current tab
  const getActiveData = () => {
    switch (activeTab) {
      case 'registrations':
        return filteredRegistrations;
      case 'guardians':
        return filteredGuardians;
      case 'participants':
        return filteredParticipants;
      default:
        return [];
    }
  };

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'registrations':
        return 'Search by registration ID, guardian name, or participant name...';
      case 'guardians':
        return 'Search by guardian name, email, or phone...';
      case 'participants':
        return 'Search by participant name or guardian...';
      default:
        return 'Search...';
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-nav">
          <Link to="/" className="back-link"><FaArrowLeft /> Back to Home</Link>
          <h1>Admin Portal - MYR 2025</h1>
          <div className="admin-controls-right">
            <div className="user-info">
              <span className="user-email"><FaUser /> {currentUser?.email}</span>
            </div>
            <button onClick={fetchAllData} className="refresh-btn"><FaSync /> Refresh</button>
            <button onClick={handleLogout} className="logout-btn"><FaSignOutAlt /> Logout</button>
          </div>
        </div>
        
        <div className="admin-stats">
          <div className="stat-card">
            <h3>Total Registrations</h3>
            <div className="stat-number">{registrations.length}</div>
          </div>
          <div className="stat-card">
            <h3>Total Guardians</h3>
            <div className="stat-number">{getTotalGuardians()}</div>
          </div>
          <div className="stat-card">
            <h3>Total Participants</h3>
            <div className="stat-number">{getTotalParticipants()}</div>
          </div>
          <div className="stat-card">
            <h3>Total Revenue</h3>
            <div className="stat-number">${getTotalRevenue()}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'registrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('registrations')}
        >
          Registrations ({registrations.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'guardians' ? 'active' : ''}`}
          onClick={() => setActiveTab('guardians')}
        >
          Guardians ({guardians.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'participants' ? 'active' : ''}`}
          onClick={() => setActiveTab('participants')}
        >
          Participants ({participants.length})
        </button>
      </div>

      <div className="admin-controls">
        <div className="search-filter-container">
          <input
            type="text"
            placeholder={getSearchPlaceholder()}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {activeTab === 'registrations' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          )}
          {activeTab === 'guardians' && (
            <>
              <select
                value={guardianActiveFilter}
                onChange={(e) => setGuardianActiveFilter(e.target.value)}
                className="status-filter"
              >
                <option value="all">All Guardians</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={exportGuardiansCSV}
                className="export-csv-btn"
                disabled={guardians.length === 0}
              >
                <FaDownload /> Export CSV
              </button>
            </>
          )}
          {activeTab === 'participants' && (
            <>
              <select
                value={participantActiveFilter}
                onChange={(e) => setParticipantActiveFilter(e.target.value)}
                className="status-filter"
              >
                <option value="all">All Participants</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={exportParticipantsCSV}
                className="export-csv-btn"
                disabled={participants.length === 0}
              >
                <FaDownload /> Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'registrations' && (
          <div className="registrations-list">
            {filteredRegistrations.length === 0 ? (
              <div className="no-data">
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
                      <div className="registration-actions">
                        {(registration.status === 'paid' || registration.status === 'PAID') && registration.paymentIntentId && (
                          <button
                            onClick={() => handleRefund(registration)}
                            className="refund-btn"
                            title={`Process full refund for $${registration.total}`}
                          >
                            Refund
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(registration)}
                          className="delete-btn"
                          title="Permanently delete registration"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="registration-details">
                    <div className="detail-section">
                      <h4>Contact Information</h4>
                      <p><strong>Email:</strong> {registration.parent?.email || 'N/A'}</p>
                      <p><strong>Phone:</strong> {registration.parent?.phone || 'N/A'}</p>
                      <p><strong>Address:</strong> {registration.parent?.address?.street || registration.parent?.address || 'N/A'} 
                        {(registration.parent?.apartment || registration.parent?.address?.apartment) && `, ${registration.parent.apartment || registration.parent.address.apartment}`}
                      </p>
                      <p><strong>City:</strong> {registration.parent?.address?.city || registration.parent?.city || 'N/A'}, {registration.parent?.address?.state || registration.parent?.state || 'N/A'} {registration.parent?.address?.zipCode || registration.parent?.zipCode || 'N/A'}</p>
                      <p><strong>Country:</strong> {registration.parent?.address?.country || registration.parent?.country || 'N/A'}</p>
                    </div>

                    <div className="detail-section">
                      <h4>Participants ({registration.children?.length || 0})</h4>
                      {registration.children?.map((child, idx) => (
                        <div key={idx} className="participant-info">
                          <p><strong>{child.name}</strong> - Age {child.age}, Grade {child.grade}, {child.gender}</p>
                          {child.dietary && <p><em>Dietary:</em> {child.dietary}</p>}
                          {child.medical && <p><em>Medical:</em> {child.medical}</p>}
                          <p><em>Emergency Contact:</em> {child.emergencyContact?.name || child.emergencyContact || 'N/A'} ({child.emergencyPhone || child.emergencyContact?.phone || 'N/A'})</p>
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
                        {registration.status === 'refunded' && (
                          <>
                            <p><strong>Refund ID:</strong> {registration.refundId || 'N/A'}</p>
                            <p><strong>Refund Amount:</strong> ${registration.refundAmount || registration.total}</p>
                            <p><strong>Refunded At:</strong> {formatDate(registration.refundedAt)}</p>
                            <p><strong>Refund Reason:</strong> {registration.refundReason || 'N/A'}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'guardians' && (
          <div className="guardians-list">
            {filteredGuardians.length === 0 ? (
              <div className="no-data">
                {searchTerm ? 'No guardians match your search criteria.' : 'No guardians found.'}
              </div>
            ) : (
              <div className="data-table">
                <div className="table-header">
                  <div className="table-row">
                    <div className="table-cell">Guardian ID</div>
                    <div className="table-cell">Name</div>
                    <div className="table-cell">Email</div>
                    <div className="table-cell">Phone</div>
                    <div className="table-cell">Location</div>
                    <div className="table-cell">Participants</div>
                    <div className="table-cell">Status</div>
                    <div className="table-cell">Created</div>
                  </div>
                </div>
                <div className="table-body">
                  {filteredGuardians.map((guardian) => (
                    <div key={guardian.id} className="table-row">
                      <div className="table-cell">{guardian.guardianId}</div>
                      <div className="table-cell">{guardian.name}</div>
                      <div className="table-cell">{guardian.email}</div>
                      <div className="table-cell">{guardian.phone}</div>
                      <div className="table-cell">
                        {guardian.address?.city && guardian.address?.state ? 
                          `${guardian.address.city}, ${guardian.address.state}` : 
                          'N/A'
                        }
                      </div>
                      <div className="table-cell">
                        {guardian.participantCount ? 
                          `${guardian.participantCount} participant${guardian.participantCount > 1 ? 's' : ''}` : 
                          '0 participants'
                        }
                      </div>
                      <div className="table-cell">
                        <span 
                          className="status-badge" 
                          style={{ backgroundColor: guardian.active === false ? '#dc3545' : '#28a745' }}
                        >
                          {guardian.active === false ? 'INACTIVE' : 'ACTIVE'}
                        </span>
                      </div>
                      <div className="table-cell">{formatDate(guardian.createdAt)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="participants-list">
            {filteredParticipants.length === 0 ? (
              <div className="no-data">
                {searchTerm ? 'No participants match your search criteria.' : 'No participants found.'}
              </div>
            ) : (
              <div className="data-table">
                <div className="table-header">
                  <div className="table-row">
                    <div className="table-cell">Participant ID</div>
                    <div className="table-cell">Name</div>
                    <div className="table-cell">Age</div>
                    <div className="table-cell">Grade</div>
                    <div className="table-cell">Gender</div>
                    <div className="table-cell">Guardian</div>
                    <div className="table-cell">Emergency Contact</div>
                    <div className="table-cell">Status</div>
                    <div className="table-cell">Created</div>
                  </div>
                </div>
                <div className="table-body">
                  {filteredParticipants.map((participant) => (
                    <div key={participant.id} className="table-row">
                      <div className="table-cell">{participant.participantId}</div>
                      <div className="table-cell">{participant.name}</div>
                      <div className="table-cell">{participant.age}</div>
                      <div className="table-cell">{participant.grade}</div>
                      <div className="table-cell">{participant.gender}</div>
                      <div className="table-cell">{participant.guardian?.name || 'N/A'}</div>
                      <div className="table-cell">
                        {participant.emergencyContact?.name ? 
                          `${participant.emergencyContact.name} (${participant.emergencyContact.phone})` : 
                          'N/A'
                        }
                      </div>
                      <div className="table-cell">
                        <span 
                          className="status-badge" 
                          style={{ backgroundColor: participant.active === false ? '#dc3545' : '#28a745' }}
                        >
                          {participant.active === false ? 'INACTIVE' : 'ACTIVE'}
                        </span>
                      </div>
                      <div className="table-cell">{formatDate(participant.createdAt)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <DevModeToggle />
    </div>
  );
};

export default Admin;