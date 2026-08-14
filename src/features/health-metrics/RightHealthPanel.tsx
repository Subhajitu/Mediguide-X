import React, { useRef, useState } from 'react';
import axios from 'axios';
import { Card } from '../../shared/ui/Card';
import { Icon } from '../../shared/ui/Icon';
import avatar from '../../assets/avatar.jpg';
import { usePatient } from '../../context/PatientContext';
import { reportsApi } from '../../services/api/reportsApi';
import './RightHealthPanel.css';

export const RightHealthPanel: React.FC = () => {
  const { activeFamilyMember, reports, refreshReports } = usePatient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeFamilyMember) return;

    // Validate size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File must be under 10MB.");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Get presigned URL
      const data = await reportsApi.getUploadUrl({
        family_member_id: activeFamilyMember.id,
        title: file.name,
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
        record_type: 'lab_report',
        record_date: new Date().toISOString().split('T')[0]
      });

      // 2. Upload to S3 directly
      await axios.put(data.upload_url, file, {
        headers: { 'Content-Type': file.type }
      });

      // 3. Trigger Nova Pro extraction
      await reportsApi.triggerAnalysis(data.record_id);

      // 4. Refresh reports
      await refreshReports();
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload and analyze report.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <aside className="right-panel">
      <div className="right-panel-scrollable">
        
        {/* Health Overview */}
        <section className="panel-section">
          <div className="section-header">
            <h3 className="section-title">Health Overview</h3>
          </div>
          
          <div className="metrics-list">
            <Card className="metric-card">
              <div className="metric-icon-bg bg-blue">
                <Icon name="user" size={20} className="text-blue" />
              </div>
              <div className="metric-content">
                <div className="metric-label">Profile Status</div>
                <div className="metric-value">
                  {activeFamilyMember ? 'Active' : 'No Profile'}
                </div>
                <div className="metric-status status-good">
                  {activeFamilyMember ? activeFamilyMember.name : 'Select a member'}
                </div>
              </div>
            </Card>

            <Card className="metric-card">
              <div className="metric-icon-bg bg-red">
                <Icon name="heart-rate" size={20} className="text-red" />
              </div>
              <div className="metric-content">
                <div className="metric-label">Health Info</div>
                <div className="metric-value">
                  {activeFamilyMember?.blood_group || 'N/A'} <span className="metric-unit">Blood</span>
                </div>
                <div className="metric-status status-normal">
                  {(activeFamilyMember?.medical_conditions?.length || 0)} Conditions
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Medical Reports */}
        <section className="panel-section">
          <div className="section-header">
            <h3 className="section-title">Medical Reports</h3>
            <span className="section-link">View All</span>
          </div>
          
          <div className="upcoming-list">
            {reports.length === 0 ? (
              <p style={{fontSize: '13px', color: '#888'}}>No reports uploaded yet.</p>
            ) : (
              reports.map(report => (
                <div key={report.id} className="upcoming-item">
                  <div className="upcoming-icon">
                    <Icon name="report" size={18} />
                  </div>
                  <div className="upcoming-content" style={{flex: 1}}>
                    <div className="upcoming-subtitle">{report.record_date}</div>
                    <div className="upcoming-title">{report.title}</div>
                    {report.summary && <div style={{fontSize: '11px', color: '#888', marginTop: '4px'}}>{report.summary}</div>}
                  </div>
                  <a href={report.download_url} target="_blank" rel="noreferrer" style={{color: '#3b82f6', textDecoration: 'none'}}>View</a>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="panel-section">
          <h3 className="section-title mb-4">Quick Actions</h3>
          <div className="quick-action-btns">
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{display: 'none'}} 
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleUpload}
            />
            <button className="qa-btn" onClick={() => fileInputRef.current?.click()} disabled={isUploading || !activeFamilyMember}>
              <div className="qa-icon-wrapper"><Icon name="add-record" size={20} /></div>
              <span>{isUploading ? 'Uploading...' : 'Add Record'}</span>
            </button>
            <button className="qa-btn">
              <div className="qa-icon-wrapper"><Icon name="bell" size={20} /></div>
              <span>Reminders</span>
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
