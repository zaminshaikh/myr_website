import { useState } from 'react';

// Placeholder for Stripe integration
const STRIPE_PLACEHOLDER = true;

export default function Register() {
  const [children, setChildren] = useState([
    { name: '', age: '', gender: '', dietary: '' },
  ]);
  const [parent, setParent] = useState({ name: '', email: '', phone: '' });

  const handleChildChange = (idx, field, value) => {
    setChildren((prev) => {
      const updated = [...prev];
      updated[idx][field] = value;
      return updated;
    });
  };

  const addChild = () => {
    setChildren((prev) => [
      ...prev,
      { name: '', age: '', gender: '', dietary: '' },
    ]);
  };

  const removeChild = (idx) => {
    setChildren((prev) => prev.filter((_, i) => i !== idx));
  };

  const total = children.length > 1 ? 250 * children.length : 275;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Integrate with Stripe checkout here
    alert('Stripe checkout placeholder. Total: $' + total);
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', background: '#fff', padding: 24, borderRadius: 8 }}>
      <h2>Register for MYR 2025</h2>
      <form onSubmit={handleSubmit}>
        <h3>Parent/Guardian Info</h3>
        <label>Name:<br />
          <input required value={parent.name} onChange={e => setParent({ ...parent, name: e.target.value })} />
        </label><br />
        <label>Email:<br />
          <input required type="email" value={parent.email} onChange={e => setParent({ ...parent, email: e.target.value })} />
        </label><br />
        <label>Phone:<br />
          <input required value={parent.phone} onChange={e => setParent({ ...parent, phone: e.target.value })} />
        </label>
        <h3>Children</h3>
        {children.map((child, idx) => (
          <div key={idx} style={{ border: '1px solid #eee', padding: 12, marginBottom: 12, borderRadius: 6 }}>
            <label>Name:<br />
              <input required value={child.name} onChange={e => handleChildChange(idx, 'name', e.target.value)} />
            </label><br />
            <label>Age:<br />
              <input required type="number" min="5" max="18" value={child.age} onChange={e => handleChildChange(idx, 'age', e.target.value)} />
            </label><br />
            <label>Gender:<br />
              <select required value={child.gender} onChange={e => handleChildChange(idx, 'gender', e.target.value)}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label><br />
            <label>Dietary Restrictions:<br />
              <input value={child.dietary} onChange={e => handleChildChange(idx, 'dietary', e.target.value)} />
            </label><br />
            {children.length > 1 && (
              <button type="button" onClick={() => removeChild(idx)} style={{ color: 'red', marginTop: 4 }}>Remove</button>
            )}
          </div>
        ))}
        <button type="button" onClick={addChild} style={{ marginBottom: 16 }}>Add Another Child</button>
        <h3>Total: ${total}</h3>
        <button type="submit" style={{ background: '#38b2ac', color: '#fff', padding: '0.75rem 1.5rem', border: 'none', borderRadius: 4, fontSize: 18 }}>Proceed to Payment</button>
      </form>
      <p style={{ marginTop: 16, color: '#888' }}><b>Note:</b> Stripe checkout integration is a placeholder. Replace with your Stripe integration.</p>
    </div>
  );
}
