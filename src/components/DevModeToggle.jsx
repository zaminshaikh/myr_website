import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './DevModeToggle.css';

const DevModeToggle = () => {
  const { currentUser } = useAuth();
  const [testMode, setTestMode] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show for authenticated admin users
    if (currentUser) {
      setIsVisible(true);
      // Load test mode preference from localStorage
      const savedTestMode = localStorage.getItem('stripe-test-mode') === 'true';
      setTestMode(savedTestMode);
    } else {
      setIsVisible(false);
    }
  }, [currentUser]);

  const toggleTestMode = () => {
    const newTestMode = !testMode;
    setTestMode(newTestMode);
    localStorage.setItem('stripe-test-mode', newTestMode.toString());
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('stripe-mode-changed', { 
      detail: { testMode: newTestMode } 
    }));
    
    // Show confirmation
    const message = newTestMode 
      ? '🧪 Switched to TEST mode - Safe for testing!' 
      : '🔴 Switched to LIVE mode - Real payments will be processed!';
    
    // Simple notification (you can replace with a proper toast system)
    if (window.confirm(`${message}\n\nRefresh the page to apply changes to payment forms.`)) {
      window.location.reload();
    }
  };

  const testStripeAPI = async () => {
    try {
      const response = await fetch('/api/test-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testMode: true, amount: 1 })
      });
      
      if (response.ok) {
        alert('✅ Test API call successful!');
      } else {
        alert('❌ Test API call failed. Check console for details.');
      }
    } catch (error) {
      console.error('Test failed:', error);
      alert('❌ Test failed: ' + error.message);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="dev-mode-toggle">
      <div className="dev-mode-header">
        <span className="dev-icon">🛠️</span>
        <span className="dev-title">Developer Mode</span>
      </div>
      
      <div className="dev-mode-controls">
        <div className="mode-switch">
          <label className="switch">
            <input
              type="checkbox"
              checked={testMode}
              onChange={toggleTestMode}
            />
            <span className="slider"></span>
          </label>
          <div className="mode-labels">
            <span className={`mode-label ${!testMode ? 'active' : ''}`}>
              🔴 LIVE
            </span>
            <span className={`mode-label ${testMode ? 'active' : ''}`}>
              🧪 TEST
            </span>
          </div>
        </div>
        
        <div className="mode-info">
          <div className={`mode-status ${testMode ? 'test' : 'live'}`}>
            {testMode ? '🧪 TEST MODE' : '🔴 LIVE MODE'}
          </div>
          <div className="mode-description">
            {testMode 
              ? 'Safe testing - No real charges' 
              : 'Production mode - Real payments!'
            }
          </div>
        </div>
        
        {testMode && (
          <div className="test-cards-info">
            <div className="test-cards-title">Test Cards:</div>
            <div className="test-card">4242 4242 4242 4242 (Success)</div>
            <div className="test-card">4000 0000 0000 0002 (Declined)</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevModeToggle;
