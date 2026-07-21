import { useTranslation } from 'react-i18next';
import { FaStar, FaChessKing } from 'react-icons/fa';
import './AssociationStructure.css';

export default function AssociationStructure() {
  const { t } = useTranslation();

  return (
    <section className="assoc-structure">
      <div className="assoc-structure__inner">
        <h2 className="assoc-structure__heading">{t('home.assocStructure.heading')}</h2>
        <div className="assoc-structure__underline" />

        <div className="assoc-structure__cards">
          <div className="assoc-card assoc-card--orange">
            <span className="assoc-card__icon assoc-card__icon--orange">
              <FaStar />
            </span>
            <p className="assoc-card__text">{t('home.assocStructure.card1')}</p>
          </div>

          <div className="assoc-card assoc-card--green">
            <span className="assoc-card__icon assoc-card__icon--green">
              <FaChessKing />
            </span>
            <p className="assoc-card__text">{t('home.assocStructure.card2')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
