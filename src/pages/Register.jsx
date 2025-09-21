import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import InputMask from 'react-input-mask';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import DevModeToggle from '../components/DevModeToggle';
import './Register.css';

// Load Stripe with dynamic key based on test mode
const getStripeKey = () => {
  const testMode = localStorage.getItem('stripe-test-mode') === 'true';
  return testMode 
    ? import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY 
    : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
};

let stripePromise = loadStripe(getStripeKey());

const CheckoutForm = ({ registrationData, total, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    // Check test mode from localStorage
    const isTestMode = localStorage.getItem('stripe-test-mode') === 'true';
    setTestMode(isTestMode);
    
    // Create payment intent when component mounts
    createPaymentIntent();
    
    // Listen for test mode changes
    const handleModeChange = (event) => {
      const newTestMode = event.detail.testMode;
      setTestMode(newTestMode);
      // Reload Stripe with new key
      stripePromise = loadStripe(getStripeKey());
      // Recreate payment intent
      createPaymentIntent();
    };
    
    window.addEventListener('stripe-mode-changed', handleModeChange);
    return () => window.removeEventListener('stripe-mode-changed', handleModeChange);
  }, []);

  const createPaymentIntent = async () => {
    try {
      // Get the Firebase Functions URL
      const functionsUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 'https://us-central1-myr-website.cloudfunctions.net';
      
      const currentTestMode = localStorage.getItem('stripe-test-mode') === 'true';
      
      const response = await fetch(`${functionsUrl}/createPaymentIntent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: total,
          registrationData: registrationData,
          testMode: currentTestMode
        }),
      });

      const data = await response.json();
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        setError('Failed to initialize payment');
      }
    } catch (err) {
      console.error('Error creating payment intent:', err);
      setError('Failed to initialize payment');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Confirm payment with Stripe first
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: registrationData.parent.name,
            email: registrationData.parent.email,
            phone: registrationData.parent.phone,
            address: {
              line1: registrationData.parent.address,
              line2: registrationData.parent.apartment,
              city: registrationData.parent.city,
              state: registrationData.parent.state,
              postal_code: registrationData.parent.zipCode,
              country: registrationData.parent.country,
            },
          },
        },
      });

      if (stripeError) {
        // Save payment error to savedRegistrations
        try {
          const saveRegistrationProgress = httpsCallable(functions, 'saveRegistrationProgress');
          await saveRegistrationProgress({
            progressData: {
              ...registrationData,
              total: total,
              step: 5,
              paymentError: stripeError.message,
              paymentAttemptedAt: new Date().toISOString()
            }
          });
        } catch (saveError) {
          console.error('Error saving payment error:', saveError);
        }
        
        setError(stripeError.message);
        setLoading(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        // Now create the full registration with successful payment
        const saveRegistration = httpsCallable(functions, 'saveRegistration');
        const registrationResult = await saveRegistration({
          registrationData: {
            ...registrationData,
            total: total
          },
          paymentIntentId: paymentIntent.id
        });

        if (!registrationResult.data.success) {
          throw new Error('Failed to save registration');
        }

        const registrationId = registrationResult.data.registrationId;

        // Confirm payment in our backend
        const confirmPayment = httpsCallable(functions, 'confirmPayment');
        await confirmPayment({
          paymentIntentId: paymentIntent.id,
          registrationId: registrationId,
          testMode: testMode
        });

        // Send confirmation email after successful payment
        try {
          const sendConfirmationEmail = httpsCallable(functions, 'sendConfirmationEmail');
          await sendConfirmationEmail({
            recipientEmail: registrationData.parent.email,
            recipientName: registrationData.parent.name,
            registrationId: registrationId,
            children: registrationData.children,
            total: total,
            type: 'payment'
          });
          console.log('Confirmation email sent successfully');
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
          // Don't fail the registration if email fails
        }

        onSuccess(registrationId);
      }

    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'An error occurred during payment');
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        fontFamily: 'Inter, Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif',
        fontSmoothing: 'antialiased',
        lineHeight: '24px',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
        iconColor: '#9e2146',
      },
      complete: {
        color: '#424770',
      },
    },
    hidePostalCode: false,
    iconStyle: 'solid',
  };

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <div className="card-element-container">
        <label htmlFor="card-element">
          Credit or debit card
        </label>
        <CardElement
          id="card-element"
          options={cardElementOptions}
        />
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <button 
        type="submit" 
        disabled={!stripe || loading || !clientSecret}
        className={`pay-button ${testMode ? 'test-mode' : ''}`}
      >
        {loading ? 'Processing...' : `${testMode ? '🧪 TEST: ' : ''}Complete Registration - $${total}`}
      </button>
      
      <div className="payment-security">
        <p>🔒 Your payment information is secure and encrypted</p>
      </div>
    </form>
  );
};

export default function Register() {
  const [step, setStep] = useState(1);
  const [children, setChildren] = useState([
    { 
      name: '', 
      dateOfBirth: '', 
      gender: '', 
      grade: '',
      dietary: '',
      medical: ''
    },
  ]);
  const [registrationDisabled, setRegistrationDisabled] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState('');

  // Emergency contact information (shared across all participants)
  const [emergencyContact, setEmergencyContact] = useState({
    name: '',
    phone: '',
    relationship: ''
  });
  const [customRelationship, setCustomRelationship] = useState('');
  const [parent, setParent] = useState({ 
    name: '', 
    email: '', 
    phone: '',
    address: '',
    apartment: '',
    city: '',
    country: 'US',
    state: '',
    zipCode: ''
  });
  const [emailError, setEmailError] = useState('');
  const [agreement, setAgreement] = useState({
    informedConsent: false,
    medicalRelease: false
  });
  
  const [signature, setSignature] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [registrationId, setRegistrationId] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);

  // Auto-save registration data to localStorage and backend
  const saveRegistrationProgress = async (progressData) => {
    try {
      const dataToSave = {
        step: progressData.step || step,
        parent: progressData.parent || parent,
        children: progressData.children || children,
        agreement: progressData.agreement || agreement,
        emergencyContact: progressData.emergencyContact || emergencyContact,
        signature: progressData.signature || signature,
        timestamp: new Date().toISOString()
      };
      
      // Save to localStorage for immediate recovery
      localStorage.setItem('myr_registration_progress', JSON.stringify(dataToSave));
      
      // Only save to backend if we have an email (prevents spam and enables proper deduplication)
      if (dataToSave.parent.email && dataToSave.parent.email.includes('@')) {
        try {
          const saveProgressToBackend = httpsCallable(functions, 'saveRegistrationProgress');
          await saveProgressToBackend({ 
            progressData: {
              step: dataToSave.step,
              parent: dataToSave.parent,
              children: dataToSave.children,
              agreement: dataToSave.agreement,
              emergencyContact: dataToSave.emergencyContact,
              signature: dataToSave.signature
            }
          });
        } catch (backendError) {
          console.warn('Failed to save progress to backend:', backendError);
          // Don't throw - localStorage save is still working
        }
      }
    } catch (error) {
      console.warn('Failed to save registration progress:', error);
    }
  };

  // Load saved registration data from localStorage
  const loadSavedData = () => {
    try {
      const savedData = localStorage.getItem('myr_registration_progress');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        // Check if data is not too old (24 hours)
        const dataAge = new Date() - new Date(parsedData.timestamp);
        if (dataAge < 24 * 60 * 60 * 1000) { // 24 hours in milliseconds
          return parsedData;
        } else {
          // Clear old data
          clearSavedData();
        }
      }
    } catch (error) {
      console.warn('Failed to load saved registration data:', error);
      // Clear corrupted data
      clearSavedData();
    }
    return null;
  };

  // Clear saved registration data
  const clearSavedData = () => {
    try {
      localStorage.removeItem('myr_registration_progress');
    } catch (error) {
      console.warn('Failed to clear saved data:', error);
    }
  };

  // Handle continuing from saved progress
  const handleContinueFromSaved = () => {
    const savedData = loadSavedData();
    if (savedData) {
      setStep(savedData.step);
      setParent(savedData.parent);
      setChildren(savedData.children);
      setAgreement(savedData.agreement);
      if (savedData.emergencyContact) {
        setEmergencyContact(savedData.emergencyContact);
      }
      if (savedData.signature) {
        setSignature(savedData.signature);
      }
    }
    setShowContinueDialog(false);
    setHasSavedData(false);
  };

  // Handle starting fresh
  const handleStartFresh = async () => {
    // Delete saved registration from backend if we have an email
    const currentEmail = parent.email || loadSavedData()?.parent?.email;
    if (currentEmail && currentEmail.includes('@')) {
      try {
        const deleteSavedRegistrationByEmail = httpsCallable(functions, 'deleteSavedRegistrationByEmail');
        await deleteSavedRegistrationByEmail({ email: currentEmail });
        console.log('Saved registration deleted from backend');
      } catch (error) {
        console.warn('Failed to delete saved registration from backend:', error);
        // Continue anyway - localStorage will still be cleared
      }
    }
    
    clearSavedData();
    setShowContinueDialog(false);
    setHasSavedData(false);
  };

  // Check registration status
  const checkRegistrationStatus = async () => {
    try {
      const getRegistrationSettings = httpsCallable(functions, 'getRegistrationSettings');
      const result = await getRegistrationSettings();
      
      if (result.data.success) {
        const isEnabled = result.data.settings?.enabled !== false;
        const message = result.data.settings?.message || 'Registration is currently unavailable. Please check back later.';
        
        setRegistrationDisabled(!isEnabled);
        setRegistrationMessage(message);
      }
    } catch (error) {
      console.warn('Error checking registration status:', error);
      // If we can't check status, assume registration is enabled
    }
  };

  // Check for saved data and registration status on component mount
  useEffect(() => {
    checkRegistrationStatus();
    
    const savedData = loadSavedData();
    if (savedData) {
      setHasSavedData(true);
      setShowContinueDialog(true);
    }
  }, []);

  // Auto-save when registration data changes
  useEffect(() => {
    // Don't auto-save if we haven't started or if we're showing the continue dialog
    if (!hasSavedData && !showContinueDialog && (
      parent.name || parent.email || parent.phone || 
      children.some(child => child.name || child.dateOfBirth) ||
      Object.values(agreement).some(val => val)
    )) {
      const timeoutId = setTimeout(() => {
        saveRegistrationProgress({ step, parent, children, agreement, emergencyContact, signature });
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [step, parent, children, agreement, emergencyContact, signature, hasSavedData, showContinueDialog]);

  const handleChildChange = (idx, field, value) => {
    setChildren((prev) => {
      const updated = [...prev];
      updated[idx][field] = value;
      return updated;
    });
  };

  const handleParentChange = (field, value) => {
    setParent(prev => ({ 
      ...prev, 
      [field]: value,
      // Reset state when country changes
      ...(field === 'country' && { state: '' })
    }));
    
    // Email validation
    if (field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError('');
      }
    }
  };

  const handleAgreementChange = (field, value) => {
    setAgreement(prev => ({ ...prev, [field]: value }));
  };

  const handleEmergencyContactChange = (field, value) => {
    setEmergencyContact(prev => ({ ...prev, [field]: value }));
  };

  const addChild = () => {
    setChildren((prev) => [
      ...prev,
      { 
        name: '', 
        dateOfBirth: '', 
        gender: '', 
        grade: '',
        dietary: '',
        medical: ''
      },
    ]);
  };

  const removeChild = (idx) => {
    if (children.length > 1) {
      setChildren((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  // Pricing: Single child $275, multiple children get $25 discount on first child
  const total = children.length === 1 ? 275 : 250 + (children.length - 1) * 275;

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handlePaymentSuccess = async (regId) => {
    setRegistrationId(regId);
    setPaymentSuccess(true);
    
    // Clear saved data since registration is complete
    clearSavedData();
    
    // Also delete saved registration from backend
    if (parent.email && parent.email.includes('@')) {
      try {
        const deleteSavedRegistrationByEmail = httpsCallable(functions, 'deleteSavedRegistrationByEmail');
        await deleteSavedRegistrationByEmail({ email: parent.email });
        console.log('Saved registration cleaned up from backend after successful payment');
      } catch (error) {
        console.warn('Failed to clean up saved registration from backend:', error);
        // This is not critical since payment was successful
      }
    }
  };

  // Check test mode on component mount and listen for changes
  React.useEffect(() => {
    const checkTestMode = () => {
      const isTestMode = localStorage.getItem('stripe-test-mode') === 'true';
      setTestMode(isTestMode);
    };
    
    checkTestMode();
    
    // Listen for test mode changes
    const handleModeChange = (event) => {
      setTestMode(event.detail.testMode);
    };
    
    window.addEventListener('stripe-mode-changed', handleModeChange);
    return () => window.removeEventListener('stripe-mode-changed', handleModeChange);
  }, []);

  const isStep1Valid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return parent.name && parent.email && emailRegex.test(parent.email) && 
           parent.phone && parent.address && parent.city && parent.country && parent.state && parent.zipCode;
  };

  const isStep2Valid = () => {
    return children.every(child => 
      child.name && child.dateOfBirth && child.gender && child.grade
    );
  };

  const isStep3Valid = () => {
    const hasRelationship = emergencyContact.relationship && 
      (emergencyContact.relationship !== 'Other' || customRelationship.trim());
    return emergencyContact.name && emergencyContact.phone && hasRelationship;
  };

  const isStep4Valid = () => {
    return agreement.informedConsent === true && agreement.medicalRelease === true && signature;
  };

  // Signature functionality
  React.useEffect(() => {
    const canvas = document.getElementById('signature-canvas');
    if (canvas && step === 4) {
      const ctx = canvas.getContext('2d');
      let isDrawing = false;

      const startDrawing = (e) => {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      };

      const draw = (e) => {
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
        setSignature(canvas.toDataURL());
      };

      const stopDrawing = () => {
        isDrawing = false;
        ctx.beginPath();
      };

      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);

      // Touch events for mobile
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
      });

      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
      });

      canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        canvas.dispatchEvent(mouseEvent);
      });

      return () => {
        canvas.removeEventListener('mousedown', startDrawing);
        canvas.removeEventListener('mousemove', draw);
        canvas.removeEventListener('mouseup', stopDrawing);
      };
    }
  }, [step]);

  const clearSignature = () => {
    const canvas = document.getElementById('signature-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignature('');
    }
  };

  // Country and state/province data
  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IN', name: 'India' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'BD', name: 'Bangladesh' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'EG', name: 'Egypt' },
    { code: 'TR', name: 'Turkey' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'SG', name: 'Singapore' },
    { code: 'OTHER', name: 'Other' }
  ];

  const getStatesForCountry = (countryCode) => {
    const stateData = {
      'US': [
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
        'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
        'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
        'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
        'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
        'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
        'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
      ],
      'CA': [
        'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
        'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
        'Quebec', 'Saskatchewan', 'Yukon'
      ],
      'GB': [
        'England', 'Scotland', 'Wales', 'Northern Ireland'
      ],
      'AU': [
        'Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland',
        'South Australia', 'Tasmania', 'Victoria', 'Western Australia'
      ]
    };
    return stateData[countryCode] || [];
  };

  const currentStates = getStatesForCountry(parent.country);

  if (paymentSuccess) {
    return (
      <div className="register-container">
        <div className="success-message">
          <h2>Registration Successful!</h2>
          <p>Thank you for registering for the Muslim Youth Retreat 2025.</p>
          <p><strong>Registration ID:</strong> {registrationId}</p>
          <p>You will receive a confirmation email shortly with all the details.</p>
          <Link to="/" className="back-home-btn">Back to Home</Link>
        </div>
      </div>
    );
  }

  if (registrationDisabled) {
    return (
      <div className="register-container">
        <div className="register-header">
          <Link to="/" className="back-link">← Back to Home</Link>
          <h1>Register for Muslim Youth Retreat 2025</h1>
        </div>
        <div className="registration-disabled">
          <div className="disabled-message">
            <h2>Registration Currently Unavailable</h2>
            <p>{registrationMessage}</p>
            <Link to="/" className="back-home-btn">Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-container">
      <div className="register-header">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>Register for Muslim Youth Retreat 2025</h1>
        <div className="progress-bar">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3</div>
          <div className={`progress-step ${step >= 4 ? 'active' : ''}`}>4</div>
          <div className={`progress-step ${step >= 5 ? 'active' : ''}`}>5</div>
        </div>
      </div>

      {/* Continue Registration Dialog */}
      {showContinueDialog && (
        <div className="dialog-overlay">
          <div className="dialog-content">
            <div className="dialog-header">
              <h3>Continue Previous Registration?</h3>
            </div>
            <div className="dialog-body">
              <p>We found that you have a registration in progress from earlier. Would you like to continue from where you left off, or start fresh?</p>
              <div className="dialog-actions">
                <button 
                  onClick={handleContinueFromSaved}
                  className="continue-btn"
                >
                  Continue from where I left off
                </button>
                <button 
                  onClick={handleStartFresh}
                  className="start-fresh-btn"
                >
                  Start fresh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="register-form">
        {step === 1 && (
          <div className="form-step">
            <h2>Parent/Guardian Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input 
                  type="text"
                  required 
                  value={parent.name} 
                  onChange={e => handleParentChange('name', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input 
                  type="email"
                  required 
                  value={parent.email} 
                  onChange={e => handleParentChange('email', e.target.value)}
                  className={emailError ? 'error' : ''}
                />
                {emailError && <span className="error-message">{emailError}</span>}
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <InputMask
                  mask="(999) 999-9999"
                  value={parent.phone}
                  onChange={e => handleParentChange('phone', e.target.value)}
                >
                  {(inputProps) => (
                    <input 
                      {...inputProps}
                      type="tel"
                      required
                      placeholder="(123) 456-7890"
                    />
                  )}
                </InputMask>
              </div>
              <div className="form-group full-width">
                <label>Street Address *</label>
                <input 
                  type="text"
                  required 
                  value={parent.address} 
                  onChange={e => handleParentChange('address', e.target.value)}
                  placeholder="Enter your street address"
                />
              </div>
              <div className="form-group">
                <label>Apartment/Unit/Suite</label>
                <input 
                  type="text"
                  value={parent.apartment} 
                  onChange={e => handleParentChange('apartment', e.target.value)}
                  placeholder="Apt 123, Unit B, Suite 456"
                />
              </div>
              <div className="form-group">
                <label>City *</label>
                <input 
                  type="text"
                  required 
                  value={parent.city} 
                  onChange={e => handleParentChange('city', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Country *</label>
                <select 
                  required 
                  value={parent.country} 
                  onChange={e => handleParentChange('country', e.target.value)}
                >
                  {countries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>
                  {parent.country === 'US' ? 'State' : 
                   parent.country === 'CA' ? 'Province' : 
                   parent.country === 'GB' ? 'Region' : 
                   parent.country === 'AU' ? 'State/Territory' : 
                   'State/Province'} *
                </label>
                {currentStates.length > 0 ? (
                  <select 
                    required 
                    value={parent.state} 
                    onChange={e => handleParentChange('state', e.target.value)}
                  >
                    <option value="">Select {parent.country === 'US' ? 'State' : parent.country === 'CA' ? 'Province' : 'Region'}</option>
                    {currentStates.map(state => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text"
                    required 
                    value={parent.state} 
                    onChange={e => handleParentChange('state', e.target.value)}
                    placeholder="Enter state/province"
                  />
                )}
              </div>
              <div className="form-group">
                <label>
                  {parent.country === 'US' ? 'Zip Code' : 
                   parent.country === 'CA' ? 'Postal Code' : 
                   parent.country === 'GB' ? 'Postcode' : 
                   'Postal Code'} *
                </label>
                <input 
                  type="text"
                  required 
                  value={parent.zipCode} 
                  onChange={e => handleParentChange('zipCode', e.target.value)}
                  placeholder={parent.country === 'US' ? '12345' : 
                             parent.country === 'CA' ? 'A1A 1A1' : 
                             parent.country === 'GB' ? 'SW1A 1AA' : 
                             'Enter postal code'}
                />
              </div>
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                onClick={handleNext} 
                disabled={!isStep1Valid()}
                className="next-btn"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form-step">
            <div className="step-header">
              <h2>Participant Information</h2>
            </div>
            {children.map((child, idx) => (
              <div key={idx} className="child-form">
                <div className="child-header">
                  <h3>Participant {idx + 1}</h3>
                  {children.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeChild(idx)}
                      className="remove-btn"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input 
                      type="text"
                      required 
                      value={child.name} 
                      onChange={e => handleChildChange(idx, 'name', e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth *</label>
                    <input 
                      type="date" 
                      required
                      value={child.dateOfBirth} 
                      onChange={e => handleChildChange(idx, 'dateOfBirth', e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Gender *</label>
                    <select 
                      required 
                      value={child.gender} 
                      onChange={e => handleChildChange(idx, 'gender', e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Grade *</label>
                    <select 
                      required 
                      value={child.grade} 
                      onChange={e => handleChildChange(idx, 'grade', e.target.value)}
                    >
                      <option value="">Select Grade</option>
                      <option value="6">6th Grade</option>
                      <option value="7">7th Grade</option>
                      <option value="8">8th Grade</option>
                      <option value="9">9th Grade</option>
                      <option value="10">10th Grade</option>
                      <option value="11">11th Grade</option>
                      <option value="12">12th Grade</option>
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Dietary Restrictions/Allergies</label>
                    <input 
                      type="text"
                      value={child.dietary} 
                      onChange={e => handleChildChange(idx, 'dietary', e.target.value)} 
                      placeholder="Please list any dietary restrictions or food allergies"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Medical Conditions/Medications</label>
                    <textarea 
                      value={child.medical} 
                      onChange={e => handleChildChange(idx, 'medical', e.target.value)} 
                      placeholder="Please list any medical conditions, medications, or special needs"
                      rows="3"
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="add-participant-section">
              <button 
                type="button" 
                onClick={addChild} 
                className="add-child-btn"
              >
                + Add Another Participant
              </button>
            </div>
            <div className="form-actions">
              <button type="button" onClick={handleBack} className="back-btn">Back</button>
              <button 
                type="button" 
                onClick={handleNext} 
                disabled={!isStep2Valid()}
                className="next-btn"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-step">
            <h2>Emergency Contact Information</h2>
            <p className="section-description">
              List a contact, other than yourself that would be available if you are not in case of emergency.
            </p>
            
            <div className="emergency-contact-form">
              <div className="form-group">
                <label>Emergency Contact Name *</label>
                <input 
                  type="text"
                  required 
                  value={emergencyContact.name} 
                  onChange={e => handleEmergencyContactChange('name', e.target.value)} 
                  placeholder="Full name of emergency contact"
                />
              </div>
              
              <div className="form-group">
                <label>Emergency Contact Phone *</label>
                <InputMask
                  mask="(999) 999-9999"
                  value={emergencyContact.phone}
                  onChange={e => handleEmergencyContactChange('phone', e.target.value)}
                >
                  {(inputProps) => (
                    <input 
                      {...inputProps}
                      type="tel"
                      required
                      placeholder="(123) 456-7890"
                    />
                  )}
                </InputMask>
              </div>
              
              <div className="form-group">
                <label>Emergency Contact Relationship *</label>
                <select 
                  required 
                  value={emergencyContact.relationship} 
                  onChange={e => handleEmergencyContactChange('relationship', e.target.value)}
                >
                  <option value="">Select relationship</option>
                  <option value="Parent">Parent</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Relative">Relative</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {emergencyContact.relationship === 'Other' && (
                <div className="form-group">
                  <label>Please specify relationship *</label>
                  <input
                    type="text"
                    required
                    value={customRelationship}
                    onChange={e => setCustomRelationship(e.target.value)}
                    placeholder="Enter relationship"
                  />
                </div>
              )}
            </div>
            
            <div className="form-actions">
              <button type="button" onClick={handleBack} className="back-btn">Back</button>
              <button 
                type="button" 
                onClick={handleNext} 
                disabled={!isStep3Valid()}
                className="next-btn"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="form-step">
            <h2>Agreements & Waivers</h2>
            {/* Informed Consent and Acknowledgement */}
            <div className="agreement-section">
              <h3>Informed Consent and Acknowledgement</h3>
              <div className="agreement-text">
                <p>
                  I hereby give my approval for my child's participation in any and all activities prepared by WISE Academy during the selected camp. In exchange for the acceptance of said child, I assume all risk and hazards incidental to the conduct of the activities, and release, absolve and hold harmless WISE Academy, the organizers and all their respective officers, agents, and representatives from any and all liability for injuries to said child arising out of traveling to, participating in, or returning from selected camp sessions.
                </p>
              </div>
              <div className="consent-options">
                <label className="radio-label">
                  <input 
                    type="radio"
                    name="informedConsent"
                    checked={agreement.informedConsent === true}
                    onChange={e => handleAgreementChange('informedConsent', true)}
                  />
                  <span className="radio-mark"></span>
                  I Consent
                </label>
                <label className="radio-label">
                  <input 
                    type="radio"
                    name="informedConsent"
                    checked={agreement.informedConsent === false}
                    onChange={e => handleAgreementChange('informedConsent', false)}
                  />
                  <span className="radio-mark"></span>
                  I Do Not Consent
                </label>
              </div>
            </div>

            {/* Medical Release and Authorization */}
            <div className="agreement-section">
              <h3>Medical Release and Authorization</h3>
              <div className="agreement-text">
                <p>
                  As Parent and/or Guardian of the named child, I hereby authorize the diagnosis and treatment by a qualified and licensed medical professional, of the minor child, in the event of a medical emergency, which in the opinion of the attending medical professional, requires immediate attention to prevent further endangerment of the minor's life, physical disfigurement, physical impairment, or other undue pain, suffering or discomfort, if delayed.
                </p>
                <p>
                  Permission is hereby granted to the attending physician to proceed with any medical or minor surgical treatment, x-ray examination and immunizations for the named child. In the event of an emergency arising out of serious illness, the need for major surgery, or significant accidental injury, I understand that every attempt will be made by the attending physician to contact me in the most expeditious way possible. This authorization is granted only after a reasonable effort has been made to reach me.
                </p>
                <p>
                  Permission is also granted to WISE Academy, the organizers and its affiliates including Facilitators, Volunteers, and Camp Staff to provide the needed emergency treatment prior to the child's admission to the medical facility.
                </p>
                <p>
                  Release authorized on the dates and/or duration of the camp sessions.
                </p>
                <p>
                  This release is authorized and executed of my own free will, with the sole purpose of authorizing medical treatment under emergency circumstances, for the protection of life and limb of the named minor child, in my absence.
                </p>
              </div>
              <div className="consent-options">
                <label className="radio-label">
                  <input 
                    type="radio"
                    name="medicalRelease"
                    checked={agreement.medicalRelease === true}
                    onChange={e => handleAgreementChange('medicalRelease', true)}
                  />
                  <span className="radio-mark"></span>
                  I Consent
                </label>
                <label className="radio-label">
                  <input 
                    type="radio"
                    name="medicalRelease"
                    checked={agreement.medicalRelease === false}
                    onChange={e => handleAgreementChange('medicalRelease', false)}
                  />
                  <span className="radio-mark"></span>
                  I Do Not Consent
                </label>
              </div>
            </div>

            {/* Confirmation and Signature */}
            <div className="agreement-section">
              <h3>Confirmation</h3>
              <div className="agreement-text">
                <p>
                  BY ACKNOWLEDGING AND SIGNING BELOW, I AM DELIVERING AN ELECTRONIC SIGNATURE THAT WILL HAVE THE SAME EFFECT AS AN ORIGINAL MANUAL PAPER SIGNATURE. THE ELECTRONIC SIGNATURE WILL BE EQUALLY AS BINDING AS AN ORIGINAL MANUAL PAPER SIGNATURE.
                </p>
              </div>
              
              <div className="signature-section">
                <label>Parent / Guardian Signature *</label>
                <div className="signature-box">
                  <canvas 
                    id="signature-canvas"
                    width="400" 
                    height="150"
                    style={{border: '2px solid #ddd', borderRadius: '8px', cursor: 'crosshair'}}
                  ></canvas>
                  <div className="signature-controls">
                    <button 
                      type="button" 
                      onClick={() => clearSignature()}
                      className="clear-signature-btn"
                    >
                      Clear Signature
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pricing-summary">
              <h3>Registration Summary</h3>
              <div className="pricing-details">
                <p>Number of participants: {children.length}</p>
                {children.length === 1 ? (
                  <p>Price per participant: $275</p>
                ) : (
                  <>
                    <p>First participant: $250 (includes $25 multi-child discount)</p>
                    <p>Additional participants ({children.length - 1}): ${(children.length - 1) * 275}</p>
                  </>
                )}
                <div className="total-price">
                  <strong>Total: ${total}</strong>
                </div>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" onClick={handleBack} className="back-btn">Back</button>
              <button 
                type="button" 
                onClick={handleNext} 
                disabled={!isStep4Valid()}
                className="next-btn"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="form-step">
            <h2>Payment Information</h2>
            {testMode && (
              <div className="test-mode-banner">
                🧪 <strong>TEST MODE ACTIVE</strong> - No real charges will be made
                <div style={{fontSize: '12px', marginTop: '5px'}}>
                  Use test card: 4242 4242 4242 4242
                </div>
              </div>
            )}
            <div className="payment-summary">
              <h3>Order Summary</h3>
              <div className="summary-details">
                {children.map((child, idx) => (
                  <div key={idx} className="participant-summary">
                    <span>{child.name}</span>
                    <span>${(idx === 0 && children.length > 1) ? '250' : '275'}</span>
                  </div>
                ))}
                <div className="total-summary">
                  <strong>Total: ${total}</strong>
                </div>
              </div>
            </div>
            
            <Elements stripe={stripePromise}>
              <CheckoutForm 
                registrationData={{ 
                  parent, 
                  children, 
                  agreement, 
                  emergencyContact: {
                    ...emergencyContact,
                    relationship: emergencyContact.relationship === 'Other' ? customRelationship : emergencyContact.relationship
                  }, 
                  signature 
                }}
                total={total}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
            
            <div className="form-actions">
              <button type="button" onClick={handleBack} className="back-btn">Back</button>
            </div>
          </div>
        )}
      </div>
      <DevModeToggle />
    </div>
  );
}
