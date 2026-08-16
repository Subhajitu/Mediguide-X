import React, { useRef, useState } from 'react';
import { Button } from '../../shared/ui/Button';
import { Icon } from '../../shared/ui/Icon';
import { useDocumentUpload } from '../../hooks/useDocumentUpload';
import './ChatInput.css';

interface ChatInputProps {
  suggestions?: string[];
  onSend: (message: string, documentS3Key?: string) => void;
  familyMemberId?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  suggestions = [],
  onSend,
  familyMemberId,
}) => {
  const [value, setValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    isUploading,
    error: uploadError,
    pendingS3Key,
    pendingFileName,
    clearPending,
    upload,
  } = useDocumentUpload();

  const submitMessage = (message: string) => {
    const cleanMessage = message.trim();
    if (!cleanMessage && !pendingS3Key) return;
    onSend(cleanMessage || 'Please analyze this document.', pendingS3Key ?? undefined);
    setValue('');
    clearPending();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitMessage(value);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!familyMemberId) return;
    await upload(file, familyMemberId);
    // Reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileInput = () => {
    if (!familyMemberId) return;
    fileInputRef.current?.click();
  };

  const canUpload = !!familyMemberId && !isUploading;
  const canSend = (value.trim().length > 0 || !!pendingS3Key) && !isUploading;

  return (
    <div className="chat-input-wrapper-inner">
      {suggestions.length > 0 && !pendingS3Key && (
        <div className="suggestion-chips" aria-label="Suggested replies">
          {suggestions.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              className="chip"
              onClick={() => submitMessage(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Pending attachment pill */}
      {pendingS3Key && pendingFileName && (
        <div className="attachment-pending" role="status" aria-label="Document attached">
          <Icon name="attach" size={14} />
          <span className="attachment-pending-name">{pendingFileName}</span>
          <button
            type="button"
            className="attachment-pending-remove"
            onClick={clearPending}
            aria-label="Remove attachment"
          >
            <Icon name="cross" size={12} />
          </button>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <p className="chat-upload-error" role="alert">{uploadError}</p>
      )}

      <form className="chat-input-container" onSubmit={handleSubmit}>
        <div className="chat-input-inner">
          {/* Hidden file input — controlled by visible buttons with aria-labels */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            aria-hidden="true"
            className="chat-file-input-hidden"
            onChange={handleFileChange}
          />

          <input
            type="text"
            className="chat-text-input"
            placeholder={
              pendingS3Key
                ? 'Add a message about this document (optional)…'
                : 'Ask me anything about your health...'
            }
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-label="Message Mediguide X"
          />

          <div className="chat-actions">
            <button
              className="chat-action-btn"
              type="button"
              title={canUpload ? 'Attach medical document' : 'Select a family member to attach files'}
              aria-label={
                canUpload
                  ? 'Attach medical report'
                  : 'Attach medical report — select a family member first'
              }
              onClick={triggerFileInput}
              disabled={!canUpload}
            >
              {isUploading ? (
                <span className="upload-spinner" aria-hidden="true" />
              ) : (
                <Icon name="attach" size={18} />
              )}
              <span className="chat-action-label">
                {isUploading ? 'Uploading…' : 'Attach File'}
              </span>
            </button>

            <button
              className="chat-action-btn"
              type="button"
              title="Use voice input"
              aria-label="Voice input"
            >
              <Icon name="mic" size={18} />
              <span className="chat-action-label">Voice Input</span>
            </button>

            <button
              className="chat-action-btn"
              type="button"
              title={canUpload ? 'Scan or upload image' : 'Select a family member to attach files'}
              aria-label={
                canUpload
                  ? 'Scan or image upload'
                  : 'Scan or image upload — select a family member first'
              }
              onClick={triggerFileInput}
              disabled={!canUpload}
            >
              <Icon name="scan" size={18} />
              <span className="chat-action-label">Scan / Image</span>
            </button>

            <Button
              variant="primary"
              size="icon"
              className="chat-send-btn"
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
            >
              <Icon name="send" size={20} />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
