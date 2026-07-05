import { useSearchParams, useNavigate } from 'react-router-dom';
import './PaymentResultPage.css';

const TYPE_NEXT = {
  membership:   '/membership',
  event_ticket: '/events',
  donation:     '/donation',
  sponsorship:  '/sponsorship',
  booking:            '/dashboard/events',
  membership_payment: '/dashboard/membership',
};

export default function PaymentCancelPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const type = params.get('type') || 'membership';

  return (
    <div className="prp">
      <div className="prp__card prp__card--cancel">
        <div className="prp__icon">↩️</div>
        <h1 className="prp__title">Payment Cancelled</h1>
        <p className="prp__sub">
          You cancelled the payment. No charges have been made.
          You can try again whenever you're ready.
        </p>
        <div className="prp__actions">
          <button className="prp__btn prp__btn--primary" onClick={() => navigate(TYPE_NEXT[type] || '/')}>
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
