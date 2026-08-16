import React, { useState } from 'react';
import { usePatient } from '../../context/PatientContext';
import { Icon } from '../../shared/ui/Icon';
import { reportsApi } from '../../services/api/reportsApi';
import './MedicalReportsView.css';

export const MedicalReportsView: React.FC = () => {
  const { reports, activeFamilyMember, refreshReports } = usePatient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (recordId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(recordId);
    setError(null);
    try {
      await reportsApi.deleteRecord(recordId);
      await refreshReports();
    } catch {
      setError('Failed to delete record. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!activeFamilyMember) {
    return (
      <div className="reports-empty-state">
        <Icon name="report" size={48} className="text-secondary mb-4" />
        <h2>No Family Member Selected</h2>
        <p>Please select or add a family member to view their medical reports.</p>
      </div>
    );
  }

  return (
    <div className="medical-reports-view">
      <div className="reports-header">
        <h2>Medical Reports for {activeFamilyMember.name}</h2>
        <p>View and manage all uploaded documents, prescriptions, and lab reports.</p>
      </div>

      {error && <p className="reports-error" role="alert">{error}</p>}

      {reports.length === 0 ? (
        <div className="reports-empty-state">
          <Icon name="report" size={48} className="text-secondary mb-4" />
          <h3>No Reports Uploaded</h3>
          <p>Use the chat interface to attach and upload medical documents.</p>
        </div>
      ) : (
        <div className="reports-grid">
          {reports.map((report) => (
            <div key={report.id} className="report-card">
              <div className="report-icon-wrapper">
                <Icon 
                  name={report.record_type === 'lab_report' ? 'microscope' : report.record_type === 'prescription' ? 'pill' : 'report'} 
                  size={24} 
                  className="text-accent" 
                />
              </div>
              <div className="report-details">
                <h4 className="report-title">{report.title}</h4>
                <div className="report-meta">
                  <span className="report-date">{report.record_date}</span>
                  <span className="report-type">{report.record_type.replace('_', ' ')}</span>
                </div>
              </div>
              <div className="report-actions">
                <a
                  href={report.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="report-action-btn"
                  title="View Document"
                >
                  <Icon name="arrow-right" size={16} />
                  <span>View</span>
                </a>
                <button
                  className="report-action-btn report-action-btn--delete"
                  onClick={() => handleDelete(report.id, report.title)}
                  disabled={deletingId === report.id}
                  aria-label={`Delete ${report.title}`}
                  title="Delete record"
                >
                  <Icon name="cross" size={16} />
                  <span>{deletingId === report.id ? 'Deleting…' : 'Delete'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
