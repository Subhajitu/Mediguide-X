import React from 'react';
import { Card } from '../../shared/ui/Card';
import { Icon } from '../../shared/ui/Icon';
import './QuickActionCards.css';

const actionCards = [
  { id: 1, title: 'Symptom Check', desc: 'Describe your symptoms and get AI guidance', icon: 'symptom' },
  { id: 2, title: 'Analyze Reports', desc: 'Upload lab reports, X-rays, or medical documents', icon: 'report' },
  { id: 3, title: 'Explain Prescription', desc: 'Understand your medicines, dosage and side effects', icon: 'prescription' },
  { id: 4, title: 'Medicine Finder', desc: 'Find medicines, compare prices & check availability near you', icon: 'pill' },
  { id: 5, title: 'Scan & Lab Booking', desc: 'Book diagnostic tests at nearby labs', icon: 'microscope' },
  { id: 6, title: 'Consult a Doctor', desc: 'Book appointments with specialists', icon: 'calendar' },
];

export const QuickActionCards: React.FC = () => {
  return (
    <div className="quick-actions-grid">
      {actionCards.map(card => (
        <Card key={card.id} variant="interactive" className="action-card">
          <div className="action-icon-wrapper">
            <Icon name={card.icon as any} size={28} className="text-accent" />
          </div>
          <h3 className="action-title">{card.title}</h3>
          <p className="action-desc">{card.desc}</p>
          <div className="action-arrow">
            <Icon name="arrow-right" size={16} className="text-accent" />
          </div>
        </Card>
      ))}
    </div>
  );
};
