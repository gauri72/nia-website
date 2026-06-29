import { useState, useRef, useEffect } from 'react';
import { FaUser, FaChild, FaStar, FaShieldAlt, FaTimes, FaLock, FaTag, FaIdCard, FaRobot, FaCreditCard } from 'react-icons/fa';
import './BookTickets.css';

const TICKETS = [
  {
    id: 'regular',
    icon: <FaUser />,
    type: 'Regular Entry',
    perks: ['No drinks included', 'No food included'],
    price: 20,
    badge: null,
    highlight: false,
    color: 'navy',
  },
  {
    id: 'vip',
    icon: <FaStar />,
    type: 'VIP Experience',
    perks: ['2 drinks included', 'Food included'],
    price: 45,
    badge: 'BEST VALUE',
    highlight: true,
    color: 'orange',
  },
  {
    id: 'child',
    icon: <FaChild />,
    type: 'Child (6–12 yrs)',
    perks: ['Per child', 'Accompanied by adult'],
    price: 5,
    badge: null,
    highlight: false,
    color: 'green',
  },
];

function AIHint({ ticket, qty, discount }) {
  if (qty < 1) return null;
  const total = ticket.price * qty;
  const saved = discount > 0 ? Math.round(total * discount) : 0;
  const final = total - saved;
  if (ticket.id === 'vip' && qty >= 2)
    return <span className="bt-ai-hint"><FaRobot /> Great choice — VIP for {qty} saves you time at the bar!</span>;
  if (ticket.id === 'regular' && qty >= 4)
    return <span className="bt-ai-hint"><FaRobot /> Tip: upgrading to VIP for groups of {qty} is only €{((45 - 20) * qty).toLocaleString()} more and includes food &amp; drinks.</span>;
  if (saved > 0)
    return <span className="bt-ai-hint"><FaRobot /> Discount applied — you save €{saved}!</span>;
  return null;
}

export default function BookTickets() {
  const [qtys, setQtys]           = useState({ regular: 1, vip: 1, child: 1 });
  const [discounts, setDiscounts] = useState({ regular: '', vip: '', child: '' });
  const [memberships, setMemberships] = useState({ regular: '', vip: '', child: '' });
  const [discountPct, setDiscountPct] = useState({ regular: 0, vip: 0, child: 0 });
  const [selected, setSelected]   = useState(null); // ticket id
  const payRef = useRef(null);

  // Fake discount validation
  function applyDiscount(id) {
    const code = discounts[id].trim().toUpperCase();
    if (code === 'NIA10')  setDiscountPct(p => ({ ...p, [id]: 0.10 }));
    else if (code === 'NIA20') setDiscountPct(p => ({ ...p, [id]: 0.20 }));
    else setDiscountPct(p => ({ ...p, [id]: 0 }));
  }

  function handleSelect(id) {
    setSelected(id);
    // scroll to payment after short delay so section renders first
    setTimeout(() => payRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }

  function handleClose() {
    setSelected(null);
  }

  const sel = TICKETS.find(t => t.id === selected);
  const selQty = selected ? qtys[selected] : 1;
  const selDisc = selected ? discountPct[selected] : 0;
  const subtotal = sel ? sel.price * selQty : 0;
  const saved    = Math.round(subtotal * selDisc);
  const total    = subtotal - saved;

  return (
    <>
      <section className="book-tickets" id="tickets">
        <div className="book-tickets__inner">

          <div className="book-tickets__header">
            <h2 className="book-tickets__heading">Book Your Tickets</h2>
            <p className="book-tickets__sub">Choose your category, set quantity, and apply any codes.</p>
          </div>

          <div className="book-tickets__rows">
            {TICKETS.map((t) => {
              const qty  = qtys[t.id];
              const disc = discountPct[t.id];
              const lineTotal = t.price * qty;
              const lineSaved = Math.round(lineTotal * disc);
              const lineFinal = lineTotal - lineSaved;

              return (
                <div
                  key={t.id}
                  className={`bt-row${t.highlight ? ' bt-row--highlight' : ''}${selected === t.id ? ' bt-row--active' : ''}`}
                >
                  {t.badge && <span className="bt-row__badge">{t.badge}</span>}

                  {/* ── Left: icon + label + perks ── */}
                  <div className="bt-row__identity">
                    <div className={`bt-row__icon-wrap bt-row__icon-wrap--${t.color}`}>
                      {t.icon}
                    </div>
                    <div>
                      <p className="bt-row__type">{t.type}</p>
                      <ul className="bt-row__perks">
                        {t.perks.map(p => <li key={p}>{p}</li>)}
                      </ul>
                    </div>
                  </div>

                  {/* ── Middle: price + qty + codes ── */}
                  <div className="bt-row__controls">
                    <div className="bt-row__price-wrap">
                      <span className={`bt-row__price bt-row__price--${t.color}`}>€{t.price}</span>
                      <span className="bt-row__price-unit">/ person</span>
                    </div>

                    <div className="bt-row__fields">
                      {/* Quantity */}
                      <div className="bt-field bt-field--qty">
                        <label className="bt-field__label">Qty</label>
                        <div className="bt-qty">
                          <button
                            className="bt-qty__btn"
                            onClick={() => setQtys(q => ({ ...q, [t.id]: Math.max(1, q[t.id] - 1) }))}
                            aria-label="Decrease"
                          >−</button>
                          <span className="bt-qty__num">{qty}</span>
                          <button
                            className="bt-qty__btn"
                            onClick={() => setQtys(q => ({ ...q, [t.id]: q[t.id] + 1 }))}
                            aria-label="Increase"
                          >+</button>
                        </div>
                      </div>

                      {/* Discount code */}
                      <div className="bt-field">
                        <label className="bt-field__label"><FaTag /> Discount Code</label>
                        <div className="bt-code-wrap">
                          <input
                            className="bt-code-input"
                            placeholder="e.g. NIA10"
                            value={discounts[t.id]}
                            onChange={e => setDiscounts(d => ({ ...d, [t.id]: e.target.value }))}
                          />
                          <button className="bt-code-apply" onClick={() => applyDiscount(t.id)}>Apply</button>
                        </div>
                      </div>

                      {/* Membership code */}
                      <div className="bt-field">
                        <label className="bt-field__label"><FaIdCard /> Membership Code</label>
                        <input
                          className="bt-code-input"
                          placeholder="Member ID"
                          value={memberships[t.id]}
                          onChange={e => setMemberships(m => ({ ...m, [t.id]: e.target.value }))}
                        />
                      </div>
                    </div>

                    <AIHint ticket={t} qty={qty} discount={disc} />
                  </div>

                  {/* ── Right: total + select ── */}
                  <div className="bt-row__action">
                    <div className="bt-row__total-wrap">
                      {lineSaved > 0 && <span className="bt-row__saved">−€{lineSaved}</span>}
                      <span className={`bt-row__total bt-row__total--${t.color}`}>€{lineFinal}</span>
                    </div>
                    <button
                      className={`bt-row__select-btn bt-row__select-btn--${t.color}`}
                      onClick={() => handleSelect(t.id)}
                    >
                      {selected === t.id ? 'Selected ✓' : 'Select & Pay'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="book-tickets__note">
            <FaShieldAlt className="book-tickets__note-icon" />
            Secure Booking &nbsp;|&nbsp; Limited Seats — Book Early!
          </p>
        </div>
      </section>

      {/* ── Inline payment panel ── */}
      {selected && (
        <section className="bt-payment" ref={payRef} id="payment">
          <div className="bt-payment__inner">
            <div className="bt-payment__header">
              <div>
                <p className="bt-payment__eyebrow"><FaCreditCard /> Complete Your Booking</p>
                <h3 className="bt-payment__title">{sel.type} × {selQty} — <span>€{total}</span></h3>
                {saved > 0 && <p className="bt-payment__saved">You save €{saved} with your discount</p>}
              </div>
              <button className="bt-payment__close" onClick={handleClose} aria-label="Close payment">
                <FaTimes />
              </button>
            </div>

            <form className="bt-payment__form" onSubmit={e => e.preventDefault()}>
              <div className="bt-payment__row">
                <div className="bt-pfield">
                  <label className="bt-pfield__label">Full Name</label>
                  <input className="bt-pfield__input" type="text" placeholder="Your full name" required />
                </div>
                <div className="bt-pfield">
                  <label className="bt-pfield__label">Email</label>
                  <input className="bt-pfield__input" type="email" placeholder="you@email.com" required />
                </div>
              </div>

              <div className="bt-pfield bt-pfield--full">
                <label className="bt-pfield__label"><FaLock /> Card Number</label>
                <input className="bt-pfield__input" type="text" placeholder="1234 5678 9012 3456" maxLength={19} required />
              </div>

              <div className="bt-payment__row">
                <div className="bt-pfield">
                  <label className="bt-pfield__label">Expiry</label>
                  <input className="bt-pfield__input" type="text" placeholder="MM / YY" maxLength={7} required />
                </div>
                <div className="bt-pfield">
                  <label className="bt-pfield__label">CVV</label>
                  <input className="bt-pfield__input" type="text" placeholder="•••" maxLength={4} required />
                </div>
              </div>

              <button type="submit" className="bt-payment__submit">
                <FaLock /> Pay €{total} Securely
              </button>

              <p className="bt-payment__disclaimer">
                <FaShieldAlt /> Your payment is encrypted and secure. Tickets will be emailed instantly.
              </p>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
