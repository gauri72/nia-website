import { FaStar, FaChessKing, FaUserTie, FaUsers } from 'react-icons/fa';
import './AboutStructure.css';

const BOARD = [
  { role: 'President',       desc: 'Leads the Association, chairs all meetings and represents NIA at official functions.' },
  { role: 'Vice-President',  desc: 'Supports the President and assumes full responsibilities in their absence.' },
  { role: 'Secretary',       desc: 'Manages correspondence, maintains records and coordinates all administrative matters.' },
  { role: 'Treasurer',       desc: 'Oversees finances, manages accounts and presents annual financial statements.' },
];

export default function AboutStructure() {
  return (
    <section className="au-struct">
      <div className="au-struct__inner">

        <div className="au-struct__header">
          <p className="au-struct__eyebrow">HOW WE ARE ORGANISED</p>
          <h2 className="au-struct__heading">Structure of the Association</h2>
          <div className="au-struct__underline" />
        </div>

        {/* Two highlight cards */}
        <div className="au-struct__highlight-row">
          <div className="au-struct__card au-struct__card--orange">
            <span className="au-struct__card-icon au-struct__card-icon--orange"><FaStar /></span>
            <div>
              <h3 className="au-struct__card-title">Honorary Membership</h3>
              <p className="au-struct__card-text">
                Honorary membership may be conferred upon individuals who have made an outstanding
                contribution to Indo-Dutch cultural cooperation. It is the highest distinction
                the Association can bestow, recognising exceptional service and dedication.
              </p>
            </div>
          </div>

          <div className="au-struct__card au-struct__card--green">
            <span className="au-struct__card-icon au-struct__card-icon--green"><FaChessKing /></span>
            <div>
              <h3 className="au-struct__card-title">Executive Board</h3>
              <p className="au-struct__card-text">
                The Association is managed by an Executive Board elected at the Annual General
                Meeting. The General Meeting consists of all members. The Executive Board is
                the governing body responsible for all decisions and the day-to-day running of
                the Association.
              </p>
            </div>
          </div>
        </div>

        {/* Board roles */}
        <div className="au-struct__roles-header">
          <FaUserTie className="au-struct__roles-icon" />
          <h3 className="au-struct__roles-title">Office Bearers</h3>
        </div>

        <div className="au-struct__roles-grid">
          {BOARD.map((b, i) => (
            <div key={i} className="au-role-card">
              <div className="au-role-card__num">{String(i + 1).padStart(2, '0')}</div>
              <div>
                <p className="au-role-card__role">{b.role}</p>
                <p className="au-role-card__desc">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
