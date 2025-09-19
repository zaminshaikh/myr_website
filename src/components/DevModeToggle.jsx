import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './DevModeToggle.css';

const DevModeToggle = () => {
  const { currentUser } = useAuth();
  const [testMode, setTestMode] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 }); // Will be set to bottom-right in useEffect
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const toggleRef = useRef(null);

  useEffect(() => {
    // Only show for authenticated admin users
    if (currentUser) {
      setIsVisible(true);
      // Load test mode preference from localStorage
      const savedTestMode = localStorage.getItem('stripe-test-mode') === 'true';
      setTestMode(savedTestMode);
      
      // Load saved position from localStorage or set to bottom-right
      const savedPosition = localStorage.getItem('dev-mode-position');
      if (savedPosition) {
        try {
          setPosition(JSON.parse(savedPosition));
        } catch (e) {
          console.warn('Failed to parse saved position:', e);
          // Set to bottom-right as fallback
          setPosition({ 
            x: Math.max(0, window.innerWidth - 320), 
            y: Math.max(0, window.innerHeight - 250) 
          });
        }
      } else {
        // Set initial position to bottom-right
        setPosition({ 
          x: Math.max(0, window.innerWidth - 320), 
          y: Math.max(0, window.innerHeight - 250) 
        });
      }
    } else {
      setIsVisible(false);
    }
  }, [currentUser]);

  // Mouse event handlers for dragging
  const handleMouseDown = (e) => {
    if (!toggleRef.current) return;
    
    setIsDragging(true);
    const rect = toggleRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    
    const newPosition = {
      x: Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragOffset.x)), // 300px is approx width
      y: Math.max(0, Math.min(window.innerHeight - 200, e.clientY - dragOffset.y)) // Prevent going off screen
    };
    
    setPosition(newPosition);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // Save position to localStorage
      localStorage.setItem('dev-mode-position', JSON.stringify(position));
    }
  };

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, position]);

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
    <div 
      ref={toggleRef}
      className={`dev-mode-toggle ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: 'auto',
        bottom: 'auto'
      }}
    >
      <div className="dev-mode-header" onMouseDown={handleMouseDown}>
        <span className="drag-handle">⋮⋮</span>
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
