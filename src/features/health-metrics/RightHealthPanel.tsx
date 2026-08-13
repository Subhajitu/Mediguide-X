import React from 'react';
import { Card } from '../../shared/ui/Card';
import { Icon } from '../../shared/ui/Icon';
import { mockHealthMetrics, mockUpcomingEvents } from '../../services/mockData';
import avatar from '../../assets/avatar.jpg';
import './RightHealthPanel.css';

export const RightHealthPanel: React.FC = () => {
  return (
    <aside className="right-panel">
      <div className="right-panel-scrollable">
        
        {/* Health Overview */}
        <section className="panel-section">
          <div className="section-header">
            <h3 className="section-title">Health Overview</h3>
            <span className="section-link">View All</span>
          </div>
          
          <div className="metrics-list">
            <Card className="metric-card">
              <div className="metric-icon-bg bg-red">
                <Icon name="heart-rate" size={20} className="text-red" />
              </div>
              <div className="metric-content">
                <div className="metric-label">Heart Rate</div>
                <div className="metric-value">
                  {mockHealthMetrics.heartRate.value} <span className="metric-unit">{mockHealthMetrics.heartRate.unit}</span>
                </div>
                <div className="metric-status status-normal">{mockHealthMetrics.heartRate.status}</div>
              </div>
              <div className="metric-chart">
                <svg viewBox="0 0 40 20" className="mini-chart chart-red">
                  <path d="M0,10 L10,10 L15,2 L20,18 L25,10 L40,10" fill="none" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
            </Card>

            <Card className="metric-card">
              <div className="metric-icon-bg bg-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue">
                  <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path>
                </svg>
              </div>
              <div className="metric-content">
                <div className="metric-label">Blood Pressure</div>
                <div className="metric-value">
                  {mockHealthMetrics.bloodPressure.value} <span className="metric-unit">{mockHealthMetrics.bloodPressure.unit}</span>
                </div>
                <div className="metric-status status-normal">{mockHealthMetrics.bloodPressure.status}</div>
              </div>
              <div className="metric-chart">
                <svg viewBox="0 0 40 20" className="mini-chart chart-blue">
                  <path d="M0,15 L10,12 L15,16 L20,8 L25,14 L30,5 L40,10" fill="none" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
            </Card>

            <Card className="metric-card">
              <div className="metric-icon-bg bg-green">
                <Icon name="health-score" size={20} className="text-green" />
              </div>
              <div className="metric-content">
                <div className="metric-label">Health Score</div>
                <div className="metric-value">
                  {mockHealthMetrics.healthScore.value} <span className="metric-unit">/ {mockHealthMetrics.healthScore.max}</span>
                </div>
                <div className="metric-status status-good">{mockHealthMetrics.healthScore.status}</div>
              </div>
              <div className="metric-chart flex items-center justify-center">
                <div className="score-ring"></div>
              </div>
            </Card>
          </div>
        </section>

        {/* Upcoming */}
        <section className="panel-section">
          <div className="section-header">
            <h3 className="section-title">Upcoming</h3>
            <span className="section-link">View All</span>
          </div>
          
          <div className="upcoming-list">
            {mockUpcomingEvents.map(event => (
              <div key={event.id} className="upcoming-item">
                <div className="upcoming-icon">
                  <Icon name={event.type === 'lab' ? 'calendar' : 'symptom'} size={18} />
                </div>
                <div className="upcoming-content">
                  <div className="upcoming-subtitle">{event.subtitle}</div>
                  <div className="upcoming-title">{event.title}</div>
                  <div className="upcoming-datetime">
                    {event.date} • {event.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="panel-section">
          <h3 className="section-title mb-4">Quick Actions</h3>
          <div className="quick-action-btns">
            <button className="qa-btn">
              <div className="qa-icon-wrapper"><Icon name="add-record" size={20} /></div>
              <span>Add Record</span>
            </button>
            <button className="qa-btn">
              <div className="qa-icon-wrapper"><Icon name="bell" size={20} /></div>
              <span>Reminders</span>
            </button>
            <button className="qa-btn">
              <div className="qa-icon-wrapper"><Icon name="shield" size={20} /></div>
              <span>Insurance</span>
            </button>
            <button className="qa-btn btn-emergency">
              <div className="qa-icon-wrapper emergency-wrapper">
                <Icon name="cross" size={20} className="text-error" />
              </div>
              <span className="text-error">Emergency</span>
            </button>
          </div>
        </section>

        {/* Assistant Card */}
        <div className="assistant-card-wrapper">
          <Card variant="glass" className="assistant-card">
            <div className="assistant-header">
              <span className="assistant-name">Mediguide Assistant</span>
              <span className="assistant-status"><span className="status-dot"></span>Online</span>
            </div>
            <p className="assistant-msg">I'm here to help you anytime.<br/>How can I assist you today?</p>
            <img src={avatar} alt="Assistant" className="assistant-avatar-img" />
          </Card>
        </div>

      </div>
    </aside>
  );
};
