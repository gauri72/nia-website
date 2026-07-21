import { useTranslation } from 'react-i18next';
import Navbar from '../components/home/Navbar';
import Footer from '../components/home/Footer';
import './PrivacyPolicyPage.css';

const SECTIONS = [
  'whoWeAre',
  'dataWeCollect',
  'howWeUseIt',
  'cookies',
  'thirdParties',
  'dataRetention',
  'yourRights',
  'changes',
  'contact',
];

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();

  return (
    <div className="privacy-page">
      <Navbar />
      <div className="privacy-page__inner">
        <h1 className="privacy-page__title">{t('privacyPolicy.title')}</h1>
        <p className="privacy-page__updated">{t('privacyPolicy.lastUpdated')}</p>
        <p className="privacy-page__intro">{t('privacyPolicy.intro')}</p>

        {SECTIONS.map((key) => (
          <section key={key} className="privacy-page__section">
            <h2>{t(`privacyPolicy.sections.${key}.heading`)}</h2>
            <p style={{ whiteSpace: 'pre-line' }}>{t(`privacyPolicy.sections.${key}.body`)}</p>
          </section>
        ))}
      </div>
      <Footer />
    </div>
  );
}
