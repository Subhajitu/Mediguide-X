import React from 'react';
import { HeroLogo } from '../../shared/ui/Logo';
import { Icon } from '../../shared/ui/Icon';
import './HeroSection.css';

export const HeroSection: React.FC = () => {
  const particles = Array.from({ length: 14 }, (_, index) => index + 1);

  return (
    <div className="hero-section">
      <div className="hero-bg-gradient"></div>
      <div className="hero-depth-ring hero-depth-ring-one"></div>
      <div className="hero-depth-ring hero-depth-ring-two"></div>

      <div className="hero-bg-elements">
        <div className="ecg-line ecg-line-primary"></div>
        <div className="ecg-line ecg-line-secondary"></div>

        {particles.map(particle => <span key={particle} className={`particle particle-${particle}`}></span>)}

        <Icon name="dna" size={42} className="floating-icon icon-dna animate-float" />
        <Icon name="heart" size={38} className="floating-icon icon-heart animate-float-slow" />
        <Icon name="stethoscope" size={50} className="floating-icon icon-steth animate-float" />
        <Icon name="shield" size={46} className="floating-icon icon-shield animate-float-slow" />
        <Icon name="cross" size={34} className="floating-icon icon-cross animate-float" />
      </div>

      <div className="hero-content">
        <HeroLogo className="animate-pulse-glow" style={{ marginBottom: '24px' }} />
        
        <h2 className="hero-title" style={{ marginBottom: '30px' }}>
          Welcome to Mediguide <span className="text-accent font-light">X</span>
        </h2>
        
        <div className="trust-indicator" style={{ marginBottom: '25px' }}>
          <Icon name="shield" size={16} style={{ color: '#059669' }} />
          <span>Your Health. Our Priority.</span>
        </div>

        <p className="hero-subtitle-text" style={{ marginBottom: '30px' }}>
          I'm here to understand your health, analyze reports, explain prescriptions, and guide you with trusted medical insights.
        </p>

      </div>
    </div>
  );
};
