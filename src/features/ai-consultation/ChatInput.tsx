import React, { useState } from 'react';
import { Button } from '../../shared/ui/Button';
import { Icon } from '../../shared/ui/Icon';
import './ChatInput.css';

interface ChatInputProps {
  suggestions?: string[];
  onSend: (message: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ suggestions = [], onSend }) => {
  const [value, setValue] = useState('');

  const submitMessage = (message: string) => {
    const cleanMessage = message.trim();
    if (!cleanMessage) {
      return;
    }
    onSend(cleanMessage);
    setValue('');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitMessage(value);
  };

  return (
    <div className="chat-input-wrapper-inner">
      {suggestions.length > 0 && (
        <div className="suggestion-chips" aria-label="Suggested replies">
          {suggestions.map((chip, idx) => (
            <button key={idx} type="button" className="chip" onClick={() => submitMessage(chip)}>
              {chip}
            </button>
          ))}
        </div>
      )}

      <form className="chat-input-container" onSubmit={handleSubmit}>
        <div className="chat-input-inner">
          <input 
            type="text" 
            className="chat-text-input" 
            placeholder="Ask me anything about your health..."
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-label="Message Mediguide X"
          />
          
          <div className="chat-actions">
            <button className="chat-action-btn" type="button" title="Attach medical report">
              <Icon name="attach" size={18} />
              <span className="chat-action-label">Attach File</span>
            </button>
            
            <button className="chat-action-btn" type="button" title="Use voice input">
              <Icon name="mic" size={18} />
              <span className="chat-action-label">Voice Input</span>
            </button>
            
            <button className="chat-action-btn" type="button" title="Scan prescription or lab image">
              <Icon name="scan" size={18} />
              <span className="chat-action-label">Scan / Image</span>
            </button>
            
            <Button variant="primary" size="icon" className="chat-send-btn" type="submit" disabled={!value.trim()} aria-label="Send message">
              <Icon name="send" size={20} />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
