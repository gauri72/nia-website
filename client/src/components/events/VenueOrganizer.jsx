import { FaMapMarkerAlt } from 'react-icons/fa';
import venueImage from '../../assets/events/VenueImage.png';
import venueLogo  from '../../assets/events/VenueLogo.png';
import './VenueOrganizer.css';

export default function VenueOrganizer() {
  return (
    <section className="venue-org">
      <div className="venue-org__inner">

        {/* ── Venue ── */}
        <div className="venue-org__venue">
          <div className="venue-org__venue-text">
            <h3 className="venue-org__heading">Venue</h3>
            <p className="venue-org__name">DE DUINPAN</p>
            <p className="venue-org__address">
              Sportlaan 34, 2191 XH De Zilk<br />
              Gemeente Noordwijk
            </p>
            <a href="https://maps.app.goo.gl/qSfRXG5iMBcR6exs8" target="_blank" rel="noopener noreferrer" className="venue-org__map-btn">
              <FaMapMarkerAlt /> VIEW ON MAP
            </a>
          </div>
          <div className="venue-org__img-wrap">
            <img src={venueImage} alt="De Duinpan venue" className="venue-org__img" />
          </div>
        </div>

        <div className="venue-org__divider" />

        {/* ── Organized By ── */}
        <div className="venue-org__organizer">
          <h3 className="venue-org__heading">Organized By</h3>
          <img src={venueLogo} alt="Netherlands India Association" className="venue-org__logo" />
          <p className="venue-org__org-desc">
            Celebrating 75 years of connection,<br />community and friendship.
          </p>
          <a href="/" className="venue-org__about-btn">ABOUT NIA</a>
        </div>

      </div>
    </section>
  );
}
