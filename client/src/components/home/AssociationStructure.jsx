import { FaStar, FaChessKing } from 'react-icons/fa';
import './AssociationStructure.css';

export default function AssociationStructure() {
  return (
    <section className="assoc-structure">
      <div className="assoc-structure__inner">
        <h2 className="assoc-structure__heading">Structure of the Association</h2>
        <div className="assoc-structure__underline" />

        <div className="assoc-structure__cards">
          <div className="assoc-card assoc-card--orange">
            <span className="assoc-card__icon assoc-card__icon--orange">
              <FaStar />
            </span>
            <p className="assoc-card__text">
              Honorary membership may be conferred upon individuals who have made an outstanding
              contribution to Indo-Dutch cultural cooperation.
            </p>
          </div>

          <div className="assoc-card assoc-card--green">
            <span className="assoc-card__icon assoc-card__icon--green">
              <FaChessKing />
            </span>
            <p className="assoc-card__text">
              The Association is managed by an Executive Board. The General Meeting consists of
              members. The Executive Board comprises the office bearers: President, Vice-President,
              Secretary and Treasurer.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
