import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css'; // Reuse login styles

const AdminSetup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const { signup, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    if (!email || !password) {
      setLocalError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      setLocalError('');
      await signup(email, password);
      navigate('/admin');
    } catch (error) {
      console.error('Setup failed:', error);
      // Error is handled by the AuthContext
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Link to="/" className="back-link">← Back to Home</Link>
          <h1>Admin Setup</h1>
          <p>Create your first admin account for MYR 2025</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {displayError && (
            <div className="error-message">
              {displayError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Admin Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password (min. 6 characters)</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              required
              disabled={loading}
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              disabled={loading}
              minLength="6"
            />
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Creating Admin Account...' : 'Create Admin Account'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            <strong>Important:</strong> This will create your first admin account. 
            Keep these credentials secure as they will provide full access to all 
            registration data.
          </p>
          <p style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
            After creating this account, you can access the admin panel at /admin
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
