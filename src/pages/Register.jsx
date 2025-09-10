import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './Register.css';

// Initialize Stripe (you'll need to replace with your actual publishable key)
const stripePromise = loadStripe('pk_test_51234567890abcdef...');

const CheckoutForm = ({ registrationData, total, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);

    try {
      // Create payment method
      const { error: paymentError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: registrationData.parent.name,
          email: registrationData.parent.email,
          phone: registrationData.parent.phone,
        },
      });

      if (paymentError) {
        setError(paymentError.message);
        setLoading(false);
        return;
      }

      // Here you would typically send the payment method to your backend
      // For now, we'll simulate a successful payment
      console.log('Payment Method:', paymentMethod);
      console.log('Registration Data:', registrationData);
      
      // Simulate API call delay
      setTimeout(() => {
        setLoading(false);
        onSuccess();
      }, 2000);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <div className="card-element-container">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>
      {error && <div className="error-message">{error}</div>}
      <button 
        type="submit" 
        disabled={!stripe || loading}
        className="pay-button"
      >
        {loading ? 'Processing...' : `Pay $${total}`}
      </button>
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
    city: '',
    state: '',
    zipCode: ''
  });
  const [agreement, setAgreement] = useState({
    liability: false,
    medical: false,
    photos: false,
    conduct: false
  });
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleChildChange = (idx, field, value) => {
    setChildren((prev) => {
      const updated = [...prev];
      updated[idx][field] = value;
      return updated;
    });
  };

  const handleParentChange = (field, value) => {
    setParent(prev => ({ ...prev, [field]: value }));
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
        emergencyContact: '',
        emergencyPhone: ''
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
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
  };

  const isStep1Valid = () => {
    return parent.name && parent.email && parent.phone && parent.address && 
           parent.city && parent.state && parent.zipCode;
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

  if (paymentSuccess) {
    return (
      <div className="register-container">
        <div className="success-message">
          <h2>Registration Successful!</h2>
          <p>Thank you for registering for the Muslim Youth Retreat 2023.</p>
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
        <h1>Register for Muslim Youth Retreat 2023</h1>
        <div className="progress-bar">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3</div>
          <div className={`progress-step ${step >= 4 ? 'active' : ''}`}>4</div>
        </div>
      </div>

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
                />
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input 
                  type="tel"
                  required 
                  value={parent.phone} 
                  onChange={e => handleParentChange('phone', e.target.value)} 
                />
              </div>
              <div className="form-group full-width">
                <label>Address *</label>
                <input 
                  type="text"
                  required 
                  value={parent.address} 
                  onChange={e => handleParentChange('address', e.target.value)} 
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
                <label>State *</label>
                <input 
                  type="text"
                  required 
                  value={parent.state} 
                  onChange={e => handleParentChange('state', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Zip Code *</label>
                <input 
                  type="text"
                  required 
                  value={parent.zipCode} 
                  onChange={e => handleParentChange('zipCode', e.target.value)} 
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
            <h2>Participant Information</h2>
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
                      placeholder="Different from parent/guardian"
                    />
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact Phone *</label>
                    <input 
                      type="tel"
                      required 
                      value={child.emergencyPhone} 
                      onChange={e => handleChildChange(idx, 'emergencyPhone', e.target.value)} 
                    />
                  </div>
                </div>
              </div>
            ))}
            <button 
              type="button" 
              onClick={addChild} 
              className="add-child-btn"
            >
              + Add Another Participant
            </button>
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
            
            <div className="payment-note">
              <p><strong>Note:</strong> This is a demo implementation. In production, you would need to:</p>
              <ul>
                <li>Replace the Stripe publishable key with your actual key</li>
                <li>Set up a backend server to handle payment processing</li>
                <li>Implement proper error handling and validation</li>
                <li>Store registration data securely</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
