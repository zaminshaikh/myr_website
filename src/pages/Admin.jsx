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
  const [savedRegistrations, setSavedRegistrations] = useState([]);
  const [waivers, setWaivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [guardianActiveFilter, setGuardianActiveFilter] = useState('all');
  const [participantActiveFilter, setParticipantActiveFilter] = useState('all');
  const [selectedRegistrations, setSelectedRegistrations] = useState([]);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [registrationMessage, setRegistrationMessage] = useState('Registration is currently unavailable. Please check back later.');
  const { currentUser, signout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllData();
    fetchRegistrationSettings();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRegistrations(),
        fetchGuardians(), 
        fetchParticipants(),
        fetchSavedRegistrations(),
        fetchWaivers()
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

  const fetchSavedRegistrations = async () => {
    const getSavedRegistrations = httpsCallable(functions, 'getSavedRegistrations');
    const result = await getSavedRegistrations();
    
    if (result.data.success) {
      setSavedRegistrations(result.data.savedRegistrations);
    } else {
      throw new Error('Failed to fetch saved registrations');
    }
  };

  const fetchWaivers = async () => {
    try {
      const getWaivers = httpsCallable(functions, 'getWaivers');
      const result = await getWaivers();
      
      if (result.data.success) {
        setWaivers(result.data.waivers || []);
      } else {
        console.warn('Failed to fetch waivers:', result.data);
        setWaivers([]); // Set empty array instead of throwing error
      }
    } catch (error) {
      console.warn('Error fetching waivers (setting empty array):', error);
      setWaivers([]); // Set empty array to prevent admin panel from breaking
    }
  };

  const fetchRegistrationSettings = async () => {
    try {
      const getRegistrationSettings = httpsCallable(functions, 'getRegistrationSettings');
      const result = await getRegistrationSettings();
      
      if (result.data.success) {
        setRegistrationEnabled(result.data.settings?.enabled !== false);
        setRegistrationMessage(result.data.settings?.message || 'Registration is currently unavailable. Please check back later.');
      }
    } catch (error) {
      console.warn('Error fetching registration settings:', error);
      // Keep default values
    }
  };

  const updateRegistrationSettings = async (enabled, message) => {
    try {
      const updateSettings = httpsCallable(functions, 'updateRegistrationSettings');
      const result = await updateSettings({
        enabled: enabled,
        message: message
      });
      
      if (result.data.success) {
        setRegistrationEnabled(enabled);
        setRegistrationMessage(message);
        alert('Registration settings updated successfully!');
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating registration settings:', error);
      alert(`Failed to update registration settings: ${error.message}`);
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

  const filteredSavedRegistrations = savedRegistrations.filter(saved => {
    const matchesSearch = 
      saved.parent?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      saved.parent?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      saved.savedRegistrationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      saved.children?.some(child => 
        child.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    return matchesSearch;
  });

  const filteredWaivers = waivers.filter(waiver => {
    const matchesSearch = 
      waiver.parentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      waiver.parentEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      waiver.registrationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      waiver.children?.some(child => 
        child.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    return matchesSearch;
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
    const headers = ['participantId', 'name', 'dob', 'grade', 'gender', 'guardianName', 'guardianEmail', 'guardianPhone', 'emergencyContactName', 'emergencyContactPhone', 'dietary', 'medical', 'createdAt'];
    
    const csvData = participants.map(participant => ({
      participantId: participant.participantId || '',
      name: participant.name || '',
      dob: participant.dateOfBirth || participant.age || '',
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
      .filter(reg => reg.status === 'paid' && !reg.testMode)
      .reduce((total, reg) => total + (reg.total || 0), 0);
  };

  const getPaidRegistrations = () => {
    return registrations.filter(r => r.status === 'paid').length;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#28a745';
      case 'pending': return '#ffc107';
      case 'refunded': return '#6c757d';
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

  const handleDeleteSaved = async (savedRegistration) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this saved registration?\n\n` +
      `Guardian: ${savedRegistration.parent?.name || 'N/A'}\n` +
      `Email: ${savedRegistration.parent?.email || 'N/A'}\n` +
      `Participants: ${savedRegistration.children?.length || 0}\n` +
      `Step: ${savedRegistration.step || 1}\n\n` +
      `This will remove the saved progress data.`
    );

    if (!confirmDelete) return;

    try {
      setLoading(true);
      const deleteSavedRegistration = httpsCallable(functions, 'deleteSavedRegistration');
      const result = await deleteSavedRegistration({
        savedRegistrationId: savedRegistration.savedRegistrationId
      });

      if (result.data.success) {
        alert('Saved registration deleted successfully!');
        await fetchAllData(); // Refresh data
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Error deleting saved registration:', error);
      alert(`Failed to delete saved registration: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRegistrations.length === 0) {
      alert('Please select registrations to delete.');
      return;
    }

    const selectedRegs = registrations.filter(reg => selectedRegistrations.includes(reg.registrationId));
    const confirmDelete = window.confirm(
      `Are you sure you want to PERMANENTLY DELETE ${selectedRegistrations.length} registration(s)?\n\n` +
      `Selected registrations:\n${selectedRegs.map(reg => `• ${reg.parent?.name || 'N/A'} (${reg.registrationId})`).join('\n')}\n\n` +
      `This action will:\n` +
      `• Delete all selected registrations completely\n` +
      `• Remove all participant records\n` +
      `• Remove guardian records (if no other registrations)\n\n` +
      `THIS CANNOT BE UNDONE!`
    );

    if (!confirmDelete) return;

    // Double confirmation for bulk delete
    const doubleConfirm = window.confirm(
      `FINAL CONFIRMATION\n\n` +
      `Type "DELETE ALL" in your mind and click OK to proceed with permanent deletion of ${selectedRegistrations.length} registrations`
    );

    if (!doubleConfirm) return;

    try {
      setLoading(true);
      const bulkDeleteRegistrations = httpsCallable(functions, 'bulkDeleteRegistrations');
      const result = await bulkDeleteRegistrations({
        registrationIds: selectedRegistrations
      });

      if (result.data.success) {
        alert(`${result.data.deletedCount} registration(s) deleted successfully!`);
        setSelectedRegistrations([]); // Clear selection
        await fetchAllData(); // Refresh data
      } else {
        throw new Error('Bulk delete failed');
      }
    } catch (error) {
      console.error('Error bulk deleting registrations:', error);
      alert(`Failed to delete registrations: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRegistration = (registrationId) => {
    setSelectedRegistrations(prev => {
      if (prev.includes(registrationId)) {
        return prev.filter(id => id !== registrationId);
      } else {
        return [...prev, registrationId];
      }
    });
  };

  const handleSelectAllRegistrations = () => {
    if (selectedRegistrations.length === filteredRegistrations.length) {
      setSelectedRegistrations([]);
    } else {
      setSelectedRegistrations(filteredRegistrations.map(reg => reg.registrationId));
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
      case 'saved':
        return filteredSavedRegistrations;
      case 'waivers':
        return filteredWaivers;
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
      case 'saved':
        return 'Search by saved registration ID, guardian name, or participant name...';
      case 'waivers':
        return 'Search by registration ID, parent name, or participant name...';
      default:
        return 'Search...';
    }
  };

  const downloadAllWaivers = async () => {
    try {
      if (filteredWaivers.length === 0) {
        alert('No waivers to download');
        return;
      }

      const confirmed = window.confirm(`This will create a ZIP file with ${filteredWaivers.length} waivers. Continue?`);
      if (!confirmed) return;

      // Show loading state
      const button = document.querySelector('.download-all-btn');
      const originalText = button.textContent;
      button.textContent = 'Creating ZIP...';
      button.disabled = true;

      const downloadAllWaiversFunc = httpsCallable(functions, 'downloadAllWaivers');
      const result = await downloadAllWaiversFunc();

      if (result.data.success) {
        // Create a temporary link to download the ZIP file
        const link = document.createElement('a');
        link.href = result.data.downloadUrl;
        link.download = result.data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert(`ZIP file created successfully with ${result.data.waiverCount} waivers!`);
      } else {
        throw new Error(result.data.error || 'Failed to create ZIP file');
      }
    } catch (error) {
      console.error('Error downloading waivers:', error);
      alert(`Failed to create ZIP file: ${error.message}`);
    } finally {
      // Reset button state
      const button = document.querySelector('.download-all-btn');
      if (button) {
        button.textContent = originalText;
        button.disabled = false;
      }
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
        <button 
          className={`tab-button ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          Registrations In Progress ({savedRegistrations.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'waivers' ? 'active' : ''}`}
          onClick={() => setActiveTab('waivers')}
        >
          Waivers ({waivers.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Registration Settings
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
            <>
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
              {selectedRegistrations.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="bulk-delete-btn"
                  title={`Delete ${selectedRegistrations.length} selected registration(s)`}
                >
                  Delete Selected ({selectedRegistrations.length})
                </button>
              )}
            </>
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
              <>
                <div className="bulk-actions-bar">
                  <label className="select-all-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedRegistrations.length === filteredRegistrations.length && filteredRegistrations.length > 0}
                      onChange={handleSelectAllRegistrations}
                    />
                    <span>Select All ({filteredRegistrations.length})</span>
                  </label>
                </div>
                {filteredRegistrations.map((registration) => (
                  <div key={registration.id} className="registration-card-modern">
                    <div className="card-header">
                      <div className="card-select">
                        <input
                          type="checkbox"
                          checked={selectedRegistrations.includes(registration.registrationId)}
                          onChange={() => handleSelectRegistration(registration.registrationId)}
                        />
                      </div>
                      
                      <div className="card-main-info">
                        <h3 className="parent-name">{registration.parent?.name || 'N/A'}</h3>
                        <p className="registration-id">{registration.registrationId}</p>
                      </div>
                      
                      <div className="card-status-section">
                        <div className="status-badges">
                          <span 
                            className="status-badge" 
                            style={{ backgroundColor: getStatusColor(registration.status) }}
                          >
                            {registration.status?.toUpperCase()}
                          </span>
                          {registration.testMode && (
                            <span className="test-payment-badge" title="Test Payment - No real money was charged">
                              🧪 TEST
                            </span>
                          )}
                        </div>
                        <div className="total-amount">${registration.total}</div>
                      </div>
                    </div>
                    
                    <div className="card-body">
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="label">Contact</span>
                          <div className="value">
                            <div>{registration.parent?.email || 'N/A'}</div>
                            <div className="phone">{registration.parent?.phone || 'N/A'}</div>
                          </div>
                        </div>
                        
                        <div className="info-item">
                          <span className="label">Participants</span>
                          <div className="value">
                            {registration.children?.length || 0} participant{(registration.children?.length || 0) !== 1 ? 's' : ''}
                          </div>
                        </div>
                        
                        <div className="info-item">
                          <span className="label">Registered</span>
                          <div className="value">{formatDate(registration.createdAt)}</div>
                        </div>
                        
                        <div className="info-item">
                          <span className="label">Actions</span>
                          <div className="value">
                            <div className="action-buttons">
                              {(registration.status === 'paid' || registration.status === 'PAID') && registration.paymentIntentId && (
                                <button
                                  onClick={() => handleRefund(registration)}
                                  className="btn-refund"
                                  title={`Process full refund for $${registration.total}`}
                                >
                                  Refund
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(registration)}
                                className="btn-delete"
                                title="Permanently delete registration"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
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
                          <p><strong>{child.name}</strong> - DOB: {child.dateOfBirth || child.age || 'N/A'}, Grade {child.grade}, {child.gender}</p>
                          {child.dietary && <p><em>Dietary:</em> {child.dietary}</p>}
                          {child.medical && <p><em>Medical:</em> {child.medical}</p>}
                          <p><em>Emergency Contact:</em> {
                            typeof child.emergencyContact === 'object' && child.emergencyContact?.name 
                              ? `${child.emergencyContact.name} (${child.emergencyContact.phone || 'N/A'})` 
                              : typeof child.emergencyContact === 'string' 
                                ? `${child.emergencyContact} (${child.emergencyPhone || 'N/A'})` 
                                : 'N/A'
                          }</p>
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
              ))}
            </>
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
                    <div className="table-cell">DOB</div>
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
                      <div className="table-cell">{participant.dateOfBirth || participant.age || 'N/A'}</div>
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

        {activeTab === 'saved' && (
          <div className="saved-registrations-list">
            {filteredSavedRegistrations.length === 0 ? (
              <div className="no-data">
                {searchTerm ? 'No saved registrations match your search criteria.' : 'No saved registrations found.'}
              </div>
            ) : (
              filteredSavedRegistrations.map((saved) => (
                <div key={saved.id} className="saved-registration-card">
                  <div className="saved-registration-header">
                    <div className="saved-registration-info">
                      <h3>{saved.parent?.name || 'N/A'}</h3>
                      <p className="saved-registration-id">ID: {saved.savedRegistrationId}</p>
                      <p className="saved-registration-date">
                        Started: {formatDate(saved.createdAt)}
                      </p>
                      <p className="saved-registration-date">
                        Last Updated: {formatDate(saved.updatedAt)}
                      </p>
                    </div>
                    <div className="saved-registration-status">
                      <span className={`status-badge ${saved.paymentError ? 'failed-status' : 'incomplete-status'}`}>
                        {saved.paymentError ? 'PAYMENT FAILED' : 'INCOMPLETE'}
                      </span>
                      <div className="step-info">
                        Step {saved.step || 1} of 5
                      </div>
                      {saved.total && (
                        <div className="saved-registration-total">
                          ${saved.total}
                        </div>
                      )}
                      <div className="saved-registration-actions">
                        <button
                          onClick={() => handleDeleteSaved(saved)}
                          className="delete-btn"
                          title="Delete saved registration"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="saved-registration-details">
                    <div className="detail-section">
                      <h4>Contact Information</h4>
                      <p><strong>Email:</strong> {saved.parent?.email || 'N/A'}</p>
                      <p><strong>Phone:</strong> {saved.parent?.phone || 'N/A'}</p>
                      <p><strong>Address:</strong> {saved.parent?.address || 'N/A'}</p>
                      <p><strong>City:</strong> {saved.parent?.city || 'N/A'}</p>
                      <p><strong>State:</strong> {saved.parent?.state || 'N/A'}</p>
                      <p><strong>Zip:</strong> {saved.parent?.zipCode || 'N/A'}</p>
                      <p><strong>Country:</strong> {saved.parent?.country || 'N/A'}</p>
                    </div>

                    <div className="detail-section">
                      <h4>Participants ({saved.children?.length || 0})</h4>
                      {saved.children && saved.children.length > 0 ? (
                        saved.children.map((child, idx) => (
                          <div key={idx} className="participant-info">
                            <p><strong>{child.name || 'Unnamed'}</strong></p>
                            {(child.dateOfBirth || child.age) && <p>DOB: {child.dateOfBirth || child.age}</p>}
                            {child.grade && <p>Grade: {child.grade}</p>}
                            {child.gender && <p>Gender: {child.gender}</p>}
                            {child.dietary && <p><em>Dietary:</em> {child.dietary}</p>}
                            {child.medical && <p><em>Medical:</em> {child.medical}</p>}
                          </div>
                        ))
                      ) : (
                        <p>No participant information entered yet.</p>
                      )}
                    </div>

                    <div className="detail-section">
                      <h4>Progress Status</h4>
                      <p><strong>Current Step:</strong> {saved.step || 1} of 5</p>
                      <div className="step-indicator">
                        <div className={`step ${saved.step >= 1 ? 'completed' : ''}`}>1. Parent Info</div>
                        <div className={`step ${saved.step >= 2 ? 'completed' : ''}`}>2. Participants</div>
                        <div className={`step ${saved.step >= 3 ? 'completed' : ''}`}>3. Emergency Contact</div>
                        <div className={`step ${saved.step >= 4 ? 'completed' : ''}`}>4. Agreements</div>
                        <div className={`step ${saved.step >= 5 ? 'completed' : ''}`}>5. Payment</div>
                      </div>
                      
                      {saved.paymentError && (
                        <div className="payment-error-section">
                          <p><strong>Payment Error:</strong></p>
                          <p className="error-message" style={{color: '#dc3545', backgroundColor: '#f8d7da', padding: '8px', borderRadius: '4px', border: '1px solid #f5c6cb'}}>
                            {saved.paymentError}
                          </p>
                          {saved.paymentAttemptedAt && (
                            <p className="error-timestamp" style={{fontSize: '0.9em', color: '#6c757d'}}>
                              Payment attempted: {formatDate(saved.paymentAttemptedAt)}
                            </p>
                          )}
                        </div>
                      )}
                      {saved.agreement && Object.values(saved.agreement).some(val => val) && (
                        <div>
                          <p><strong>Agreements Status:</strong></p>
                          <p>Liability: {saved.agreement.liability ? '✅' : '❌'}</p>
                          <p>Medical: {saved.agreement.medical ? '✅' : '❌'}</p>
                          <p>Photos: {saved.agreement.photos ? '✅' : '❌'}</p>
                          <p>Conduct: {saved.agreement.conduct ? '✅' : '❌'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'waivers' && (
          <div className="waivers-section">
            {/* Download All Button */}
            {filteredWaivers.length > 0 && (
              <div className="waivers-header">
                <button 
                  onClick={downloadAllWaivers}
                  className="download-all-btn"
                >
                  <FaDownload /> Download All Waivers (ZIP)
                </button>
              </div>
            )}

            {/* Simple Waivers Table */}
            {filteredWaivers.length === 0 ? (
              <div className="no-data">
                {searchTerm ? 'No waivers match your search criteria.' : 
                  <div>
                    <p>No waivers found.</p>
                    <p style={{color: '#6b7280', fontSize: '14px', marginTop: '8px'}}>
                      Waivers are automatically generated when users complete registration with the new form (including agreements and signature).
                    </p>
                  </div>
                }
              </div>
            ) : (
              <div className="waivers-table">
                <div className="table-header">
                  <div className="table-cell">Document Name</div>
                  <div className="table-cell">Date/Time</div>
                  <div className="table-cell">Action</div>
                </div>
                <div className="table-body">
                  {filteredWaivers.map((waiver) => (
                    <div key={waiver.id} className="table-row">
                      <div className="table-cell">
                        <div className="document-name">
                          <strong>{waiver.parentName || 'Unknown'} - Waiver</strong>
                          <p className="document-details">
                            ID: {waiver.registrationId} | {waiver.participantCount} participant{waiver.participantCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="table-cell">
                        <div className="date-info">
                          {formatDate(waiver.waiverPdf?.generatedAt)}
                        </div>
                      </div>
                      <div className="table-cell">
                        {waiver.waiverPdf?.publicUrl ? (
                          <a 
                            href={waiver.waiverPdf.publicUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="view-waiver-btn"
                          >
                            <FaDownload /> View
                          </a>
                        ) : (
                          <span className="no-document">No PDF</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-section">
            <div className="settings-card">
              <h3>Registration Control</h3>
              <div className="setting-group">
                <div className="setting-header">
                  <label className="setting-toggle">
                    <input
                      type="checkbox"
                      checked={registrationEnabled}
                      onChange={(e) => setRegistrationEnabled(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    Registration Enabled
                  </label>
                  <span className={`status-indicator ${registrationEnabled ? 'enabled' : 'disabled'}`}>
                    {registrationEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                
                <div className="setting-description">
                  <p>When disabled, users will see a message instead of the registration form.</p>
                </div>

                <div className="setting-field">
                  <label htmlFor="registration-message">Message to display when registration is disabled:</label>
                  <textarea
                    id="registration-message"
                    value={registrationMessage}
                    onChange={(e) => setRegistrationMessage(e.target.value)}
                    placeholder="Enter the message users will see when registration is disabled..."
                    rows="3"
                    className="message-textarea"
                  />
                </div>

                <div className="setting-actions">
                  <button
                    onClick={() => updateRegistrationSettings(registrationEnabled, registrationMessage)}
                    className="save-settings-btn"
                  >
                    Save Settings
                  </button>
                  <button
                    onClick={() => {
                      setRegistrationEnabled(true);
                      setRegistrationMessage('Registration is currently unavailable. Please check back later.');
                    }}
                    className="reset-settings-btn"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>

              <div className="settings-preview">
                <h4>Preview</h4>
                <div className={`preview-box ${registrationEnabled ? 'enabled-preview' : 'disabled-preview'}`}>
                  {registrationEnabled ? (
                    <div className="enabled-message">
                      ✅ Registration form will be displayed to users
                    </div>
                  ) : (
                    <div className="disabled-message">
                      ⚠️ Users will see: "{registrationMessage}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <DevModeToggle />
    </div>
  );
};

export default Admin;