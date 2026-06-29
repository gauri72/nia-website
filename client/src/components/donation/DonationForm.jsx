import { useState } from 'react';
import { FaHeart, FaLock, FaCreditCard, FaCheckCircle } from 'react-icons/fa';
import './DonationForm.css';

const PRESET_AMOUNTS = [50, 75, 100, 200];

const CAUSES = [
  { value: 'general', label: 'General Community Fund' },
  { value: 'events',  label: 'Cultural Events & Festivals' },
  { value: 'youth',   label: 'Youth & Education Programmes' },
  { value: 'welfare', label: 'Community Welfare Initiatives' },
];

export default function DonationForm() {
  const [selected, setSelected]   = useState(null);
  const [custom, setCustom]       = useState('');
  const [cause, setCause]         = useState('general');
  const [frequency, setFrequency] = useState('once');
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', card: '', expiry: '', cvv: '',
  });

  const displayAmount = selected !== 'custom'
    ? (selected ? `€${selected}` : null)
    : (custom ? `€${custom}` : null);

  function handleAmountClick(amt) {
    setSelected(amt);
    setCustom('');
  }

  function handleCustomChange(e) {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustom(val);
    setSelected('custom');
  }

  function handleField(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  const amount = selected === 'custom' ? Number(custom) : selected;
  const canSubmit = amount > 0 && form.name && form.email && form.card && form.expiry && form.cvv;

  if (submitted) {
    return (
      <section className="don-form">
        <div className="don-form__inner">
          <div className="don-success">
            <FaCheckCircle className="don-success__icon" />
            <h2 className="don-success__heading">Thank You for Your Donation!</h2>
            <p className="don-success__body">
              Your contribution of <strong>{displayAmount}</strong> to the{' '}
              <strong>{CAUSES.find(c => c.value === cause)?.label}</strong> has been received.
              Together we keep our community strong.
            </p>
            <button className="don-success__btn" onClick={() => { setSubmitted(false); setSelected(null); setCustom(''); setForm({ name:'',email:'',card:'',expiry:'',cvv:'' }); }}>
              Donate Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="don-form" id="donate">
      <div className="don-form__inner">

        {/* Left — context panel */}
        <div className="don-form__panel">
          <p className="don-form__panel-eyebrow">DONATE TODAY</p>
          <h2 className="don-form__panel-heading">Make a Difference</h2>
          <p className="don-form__panel-body">
            Your donation — big or small — directly supports cultural events, community welfare
            programmes, and youth initiatives organised by the Netherlands India Association.
          </p>

          <ul className="don-form__panel-list">
            <li><FaHeart className="don-form__panel-bullet" /> €50 — sponsors one community activity</li>
            <li><FaHeart className="don-form__panel-bullet" /> €75 — funds refreshments at an event</li>
            <li><FaHeart className="don-form__panel-bullet" /> €100 — covers décor for a cultural evening</li>
            <li><FaHeart className="don-form__panel-bullet" /> €200 — co-sponsors a flagship event segment</li>
          </ul>

          <div className="don-form__panel-badge">
            <FaLock className="don-form__panel-lock" />
            <span>Secure &amp; encrypted payment</span>
          </div>
        </div>

        {/* Right — form */}
        <form className="don-form__form" onSubmit={handleSubmit}>

          {/* Frequency toggle */}
          <div className="don-freq">
            {['once', 'monthly'].map(f => (
              <button
                key={f}
                type="button"
                className={`don-freq__btn${frequency === f ? ' don-freq__btn--active' : ''}`}
                onClick={() => setFrequency(f)}
              >
                {f === 'once' ? 'One-Time' : 'Monthly'}
              </button>
            ))}
          </div>

          {/* Amount selector */}
          <p className="don-form__label">Select Amount</p>
          <div className="don-amounts">
            {PRESET_AMOUNTS.map(amt => (
              <button
                key={amt}
                type="button"
                className={`don-amount__btn${selected === amt ? ' don-amount__btn--active' : ''}`}
                onClick={() => handleAmountClick(amt)}
              >
                €{amt}
              </button>
            ))}
            <input
              type="text"
              inputMode="numeric"
              placeholder="Custom €"
              className={`don-amount__custom${selected === 'custom' ? ' don-amount__custom--active' : ''}`}
              value={custom}
              onChange={handleCustomChange}
              maxLength={6}
            />
          </div>

          {/* Cause */}
          <label className="don-form__label" htmlFor="don-cause">Donate Towards</label>
          <select
            id="don-cause"
            className="don-form__select"
            value={cause}
            onChange={e => setCause(e.target.value)}
          >
            {CAUSES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          {/* Personal details */}
          <p className="don-form__label">Your Details</p>
          <div className="don-form__row">
            <input
              name="name"
              className="don-form__input"
              placeholder="Full Name"
              value={form.name}
              onChange={handleField}
              required
            />
            <input
              name="email"
              type="email"
              className="don-form__input"
              placeholder="Email Address"
              value={form.email}
              onChange={handleField}
              required
            />
          </div>

          {/* Payment */}
          <p className="don-form__label"><FaCreditCard style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />Payment Details</p>
          <input
            name="card"
            className="don-form__input don-form__input--full"
            placeholder="Card Number"
            maxLength={19}
            value={form.card}
            onChange={handleField}
            required
          />
          <div className="don-form__row">
            <input
              name="expiry"
              className="don-form__input"
              placeholder="MM / YY"
              maxLength={7}
              value={form.expiry}
              onChange={handleField}
              required
            />
            <input
              name="cvv"
              className="don-form__input"
              placeholder="CVV"
              maxLength={4}
              value={form.cvv}
              onChange={handleField}
              required
            />
          </div>

          <button
            type="submit"
            className="don-form__submit"
            disabled={!canSubmit}
          >
            {displayAmount ? `DONATE ${displayAmount} NOW →` : 'DONATE NOW →'}
          </button>

          <p className="don-form__disclaimer">
            <FaLock style={{ fontSize: '0.7rem', marginRight: '0.3rem' }} />
            Your payment is secured with 256-bit SSL encryption.
          </p>
        </form>

      </div>
    </section>
  );
}
