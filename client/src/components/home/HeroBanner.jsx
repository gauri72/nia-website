import { useEffect, useRef } from 'react';
import heroBannerBG from '../../assets/home/HeroBannerBG.png';
import './HeroBanner.css';

export default function HeroBanner() {
  const imgRef = useRef(null);

  useEffect(() => {
    function handleScroll() {
      if (!imgRef.current) return;
      const scrollY = window.scrollY;
      imgRef.current.style.transform = `scale(1.08) translateY(${scrollY * 0.25}px)`;
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="hero">
      <div className="hero__img-wrap">
        <img
          ref={imgRef}
          src={heroBannerBG}
          alt="Netherlands India Association"
          className="hero__bg"
        />
      </div>
    </section>
  );
}
