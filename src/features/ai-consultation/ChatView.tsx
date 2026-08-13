import React, { useEffect, useRef } from 'react';
import type { Conversation } from '../../services/mockData';
import { HeroLogo } from '../../shared/ui/Logo';
import { Icon } from '../../shared/ui/Icon';
import './ChatView.css';

interface ChatViewProps {
  conversation: Conversation;
  isTyping?: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({ conversation, isTyping = false }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation, isTyping]);

  const renderText = (text: string) => {
    const lines = text.split('\n');
    const nodes: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = (key: string) => {
      if (listItems.length === 0) {
        return;
      }
      nodes.push(
        <ul key={key} className="message-list">
          {listItems.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
        </ul>
      );
      listItems = [];
    };

    lines.forEach((line, index) => {
      if (line.trim().startsWith('-')) {
        listItems.push(line.replace('-', '').trim());
        return;
      }
      flushList(`list-${index}`);
      if (line.trim()) {
        nodes.push(<p key={`p-${index}`}>{line}</p>);
      }
    });
    flushList('list-final');

    return nodes;
  };

  return (
    <div className="chat-view">
      <div className="chat-header-mobile">
        <h3>{conversation.title}</h3>
        <span className="text-muted text-xs">{conversation.date}</span>
      </div>
      
      <div className="chat-messages" ref={scrollRef}>
        <div className="chat-date-separator">
          <span>{conversation.date.split(',')[0]}</span>
        </div>

        {conversation.messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`message-row ${msg.sender === 'user' ? 'message-user' : 'message-ai'}`}
            style={{ animationDelay: `${Math.min(index * 45, 240)}ms` }}
          >
            {msg.sender === 'ai' && (
              <div className="message-avatar">
                <HeroLogo className="w-8 h-8 scale-50" />
              </div>
            )}
            
            <div className={`message-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="message-attachments">
                  {msg.attachments.map(attachment => (
                    <div key={attachment.name} className={`attachment-pill attachment-${attachment.type}`}>
                      <Icon name="attach" size={14} />
                      <div>
                        <span className="attachment-name">{attachment.name}</span>
                        <span className="attachment-meta">{attachment.meta}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="message-content">
                {renderText(msg.text)}
              </div>
              <div className="message-meta">
                <span className="message-time">{msg.timestamp}</span>
                {msg.sender === 'user' && <Icon name="shield" size={12} className="ml-1 opacity-50" />}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="message-row message-ai typing-indicator-row">
             <div className="message-avatar"><HeroLogo className="w-8 h-8 scale-50" /></div>
             <div className="message-bubble bubble-ai typing-bubble">
                <span className="typing-label">Mediguide X is reviewing context</span>
                <span className="dot"></span><span className="dot"></span><span className="dot"></span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
