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
              step: 4,
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
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
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
      age: '', 
      gender: '', 
      grade: '',
      dietary: '',
      medical: '',
      emergencyContact: '',
      emergencyPhone: ''
    },
  ]);
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
    liability: false,
    medical: false,
    photos: false,
    conduct: false
  });
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
              agreement: dataToSave.agreement
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

  // Check for saved data on component mount
  useEffect(() => {
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
      children.some(child => child.name || child.age) ||
      Object.values(agreement).some(val => val)
    )) {
      const timeoutId = setTimeout(() => {
        saveRegistrationProgress({ step, parent, children, agreement });
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [step, parent, children, agreement, hasSavedData, showContinueDialog]);

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

  const addChild = () => {
    setChildren((prev) => [
      ...prev,
      { 
        name: '', 
        age: '', 
        gender: '', 
        grade: '',
        dietary: '',
        medical: '',
        emergencyContact: parent.name || '',
        emergencyPhone: parent.phone || ''
      },
    ]);
  };

  const removeChild = (idx) => {
    if (children.length > 1) {
      setChildren((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const total = children.length > 1 ? 250 * children.length : 275;

  const handleNext = () => {
    // Auto-fill emergency contact fields when moving to step 2
    if (step === 1) {
      setChildren((prev) => 
        prev.map(child => ({
          ...child,
          emergencyContact: child.emergencyContact || parent.name,
          emergencyPhone: child.emergencyPhone || parent.phone
        }))
      );
    }
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
      child.name && child.age && child.gender && child.grade && 
      child.emergencyContact && child.emergencyPhone
    );
  };

  const isStep3Valid = () => {
    return agreement.liability && agreement.medical && agreement.photos && agreement.conduct;
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
              <button 
                type="button" 
                onClick={addChild} 
                className="add-child-btn-top-right"
              >
                + Add Another Participant
              </button>
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
                    <label>Age *</label>
                    <input 
                      type="number" 
                      min="6" 
                      max="18" 
                      required
                      value={child.age} 
                      onChange={e => handleChildChange(idx, 'age', e.target.value)} 
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
                  <div className="form-group">
                    <label>Emergency Contact Name *</label>
                    <input 
                      type="text"
                      required 
                      value={child.emergencyContact} 
                      onChange={e => handleChildChange(idx, 'emergencyContact', e.target.value)} 
                      placeholder="Auto-filled from parent/guardian info"
                    />
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact Phone *</label>
                    <InputMask
                      mask="(999) 999-9999"
                      value={child.emergencyPhone}
                      onChange={e => handleChildChange(idx, 'emergencyPhone', e.target.value)}
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
                </div>
              </div>
            ))}
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
            <h2>Agreements & Waivers</h2>
            <div className="agreements">
              <div className="agreement-item">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={agreement.liability}
                    onChange={e => handleAgreementChange('liability', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  I understand and agree to the liability waiver and release of claims. I acknowledge that participation in outdoor activities involves inherent risks.
                </label>
              </div>
              
              <div className="agreement-item">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={agreement.medical}
                    onChange={e => handleAgreementChange('medical', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  I authorize the retreat organizers to seek emergency medical treatment for my child if necessary.
                </label>
              </div>
              
              <div className="agreement-item">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={agreement.photos}
                    onChange={e => handleAgreementChange('photos', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  I give permission for my child to be photographed/videotaped for promotional materials.
                </label>
              </div>
              
              <div className="agreement-item">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={agreement.conduct}
                    onChange={e => handleAgreementChange('conduct', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  I agree that my child will follow the retreat's code of conduct and Islamic guidelines.
                </label>
              </div>
            </div>
            
            <div className="pricing-summary">
              <h3>Registration Summary</h3>
              <div className="pricing-details">
                <p>Number of participants: {children.length}</p>
                <p>Price per participant: ${children.length > 1 ? '250' : '275'}</p>
                {children.length > 1 && (
                  <p className="discount-note">Multi-child discount applied!</p>
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
                disabled={!isStep3Valid()}
                className="next-btn"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
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
                    <span>${children.length > 1 ? '250' : '275'}</span>
                  </div>
                ))}
                <div className="total-summary">
                  <strong>Total: ${total}</strong>
                </div>
              </div>
            </div>
            
            <Elements stripe={stripePromise}>
              <CheckoutForm 
                registrationData={{ parent, children, agreement }}
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
