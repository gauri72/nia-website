import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getPaymentStatus, getPaymentStatusByReference } from '../services/paymentService';
import './PaymentResultPage.css';

const TYPE_LABELS = {
  membership:   { label: 'Membership',    icon: '🎖️', next: '/membership' },
  event_ticket: { label: 'Event Tickets', icon: '🎟️', next: '/events' },
  donation:     { label: 'Donation',      icon: '💛', next: '/donation' },
  sponsorship:  { label: 'Sponsorship',   icon: '🌟', next: '/sponsorship' },
  booking:            { label: 'Event Booking',  icon: '🎟️', next: '/dashboard/tickets' },
  membership_payment: { label: 'Membership',      icon: '🎖️', next: '/dashboard/membership' },
};

// Fast path: 10 tries every 2s (20s) for the common case of a quick payment
// method. Slow path: a further 18 tries every 5s (90s) for methods that take
// longer to settle at Mollie — a bank redirect can genuinely take a couple of
// minutes. Only after both phases does this give up and offer a manual
// "Check Again" retry, instead of freezing with no way to recover.
const FAST_TRIES = 10;
const FAST_INTERVAL_MS = 2000;
const SLOW_TRIES = 18;
const SLOW_INTERVAL_MS = 5000;

export default function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const type = params.get('type') || 'event_ticket';

  // Mollie doesn't inject a payment ID into the redirectUrl, so it's normally
  // read back from sessionStorage (set right before leaving for Mollie's
  // checkout). That doesn't survive every flow, though — some payment
  // methods (e.g. an iDEAL bank app-switch on mobile) return the browser to
  // this page in a different tab/context than the one that started checkout,
  // where sessionStorage is empty. `ref` — the record's own ID — travels in
  // the redirect URL itself instead, so it survives that case; the backend
  // can look the Mollie payment up from it via /payments/status-by-reference.
  const [paymentId] = useState(() => sessionStorage.getItem('nia_pending_payment_id'));
  const referenceId = params.get('ref');

  const [status, setStatus]     = useState('loading');
  const [pollCount, setPollCount] = useState(0);

  const meta = TYPE_LABELS[type] || TYPE_LABELS.event_ticket;

  const runPoll = useCallback(() => {
    if (!paymentId && !referenceId) {
      // Truly nothing to check against — direct navigation with no context.
      setStatus('processing');
      return;
    }

    setStatus('loading');
    let attempts = 0;
    const maxAttempts = FAST_TRIES + SLOW_TRIES;
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const result = paymentId
          ? await getPaymentStatus(paymentId)
          : await getPaymentStatusByReference(type, referenceId);

        if (result.status === 'paid' || result.status === 'no_payment_required') {
          sessionStorage.removeItem('nia_pending_payment_id');
          setStatus('paid');
        } else if (['failed', 'expired', 'canceled'].includes(result.status)) {
          sessionStorage.removeItem('nia_pending_payment_id');
          setStatus(result.status);
        } else if (attempts < maxAttempts) {
          attempts++;
          setPollCount(attempts);
          setTimeout(poll, attempts <= FAST_TRIES ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS);
        } else {
          // Still open/pending after ~110s of polling — webhook will update the
          // DB whenever Mollie settles, but stop making the user wait on this
          // screen for it; let them check again manually instead.
          setStatus('processing');
        }
      } catch (err) {
        console.error('[PaymentSuccess] Status check failed:', err.message);
        setStatus('error');
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [paymentId, referenceId, type]);

  useEffect(() => runPoll(), [runPoll]);

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
              ? 'Your payment is taking longer than usual to confirm. You will receive a confirmation email as soon as it clears — please check your inbox, or check again below.'
              : `Checking payment status${'.'.repeat((pollCount % 3) + 1)}`}
          </p>
          {status === 'processing' && (
            <div className="prp__actions">
              <button className="prp__btn prp__btn--primary" onClick={runPoll}>
                Check Again
              </button>
              <button className="prp__btn prp__btn--secondary" onClick={() => navigate('/')}>
                Go to Home
              </button>
            </div>
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
