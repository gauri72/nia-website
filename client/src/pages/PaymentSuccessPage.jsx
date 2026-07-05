import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getPaymentStatus } from '../services/paymentService';
import './PaymentResultPage.css';

const TYPE_LABELS = {
  membership:   { label: 'Membership',    icon: '🎖️', next: '/membership' },
  event_ticket: { label: 'Event Tickets', icon: '🎟️', next: '/events' },
  donation:     { label: 'Donation',      icon: '💛', next: '/donation' },
  sponsorship:  { label: 'Sponsorship',   icon: '🌟', next: '/sponsorship' },
  booking:            { label: 'Event Booking',  icon: '🎟️', next: '/dashboard/tickets' },
  membership_payment: { label: 'Membership',      icon: '🎖️', next: '/dashboard/membership' },
};

export default function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const type = params.get('type') || 'event_ticket';

  // Mollie doesn't inject paymentId into the redirectUrl, so we stored it
  // in sessionStorage before redirecting to the Mollie checkout page.
  const [paymentId] = useState(() => sessionStorage.getItem('nia_pending_payment_id'));

  const [status, setStatus]     = useState('loading');
  const [pollCount, setPollCount] = useState(0);

  const meta = TYPE_LABELS[type] || TYPE_LABELS.event_ticket;

  useEffect(() => {
    if (!paymentId) {
      // No paymentId found — either direct navigation or sessionStorage cleared.
      // Show processing state; user can still check their email.
      setStatus('processing');
      return;
    }

    let attempts = 0;
    const MAX = 10;

    async function poll() {
      try {
        const result = await getPaymentStatus(paymentId);
        if (result.status === 'paid') {
          sessionStorage.removeItem('nia_pending_payment_id');
          setStatus('paid');
        } else if (['failed', 'expired', 'canceled'].includes(result.status)) {
          sessionStorage.removeItem('nia_pending_payment_id');
          setStatus(result.status);
        } else if (attempts < MAX) {
          attempts++;
          setPollCount(attempts);
          setTimeout(poll, 2000);
        } else {
          // Still open/pending after 10 attempts — webhook will update DB async
          setStatus('processing');
        }
      } catch {
        setStatus('error');
      }
    }

    poll();
  }, [paymentId]);

  if (status === 'loading' || status === 'processing') {
    return (
      <div className="prp">
        <div className="prp__card">
          <div className="prp__spinner" />
          <h1 className="prp__title">
            {status === 'processing' ? 'Payment being processed…' : 'Confirming payment…'}
          </h1>
          <p className="prp__sub">
            {status === 'processing'
              ? 'Your payment is being confirmed. You will receive a confirmation email shortly — please check your inbox.'
              : `Checking payment status${'.'.repeat((pollCount % 3) + 1)}`}
          </p>
          {status === 'processing' && (
            <button className="prp__btn prp__btn--secondary" style={{ marginTop: '1rem' }} onClick={() => navigate('/')}>
              Go to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  if (status === 'paid') {
    return (
      <div className="prp">
        <div className="prp__card prp__card--success">
          <div className="prp__icon">{meta.icon}</div>
          <div className="prp__check">✓</div>
          <h1 className="prp__title">Payment Successful!</h1>
          <p className="prp__sub">
            Your {meta.label.toLowerCase()} payment has been confirmed.
            A confirmation email with details has been sent to your inbox.
          </p>
          {paymentId && <p className="prp__ref">Payment ID: <code>{paymentId}</code></p>}
          <div className="prp__actions">
            <button className="prp__btn prp__btn--primary" onClick={() => navigate(meta.next)}>
              Back to {meta.label}
            </button>
            <button className="prp__btn prp__btn--secondary" onClick={() => navigate('/')}>
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="prp">
      <div className="prp__card prp__card--error">
        <div className="prp__icon">❌</div>
        <h1 className="prp__title">Payment {status === 'error' ? 'Error' : 'Unsuccessful'}</h1>
        <p className="prp__sub">
          {status === 'error'
            ? 'We could not verify your payment. Please contact support if you were charged.'
            : `Your payment was ${status}. No charges have been made.`}
        </p>
        <div className="prp__actions">
          <button className="prp__btn prp__btn--primary" onClick={() => navigate(meta.next)}>
            Try Again
          </button>
          <button className="prp__btn prp__btn--secondary" onClick={() => navigate('/')}>
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
