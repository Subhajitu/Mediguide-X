import React, { useEffect, useRef, useState } from 'react';
import type { Conversation } from '../../types';
import { HeroLogo } from '../../shared/ui/Logo';
import { Icon } from '../../shared/ui/Icon';
import { CarePlanModal } from './CarePlanModal';
import './ChatView.css';

interface ChatViewProps {
  conversation: Conversation;
  isTyping?: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({ conversation, isTyping = false }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showCarePlan, setShowCarePlan] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation, isTyping]);

  const renderText = (text: string) => {
    const lines = text.split('\n');
    const nodes: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];

    const flushList = (key: string) => {
      if (listItems.length === 0) return;
      nodes.push(
        <ul key={key} className="message-list" style={{ marginLeft: '20px', marginBottom: '10px' }}>
          {listItems.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
        </ul>
      );
      listItems = [];
    };

    const parseInlineMarkdown = (line: string, index: number) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={`${index}-${i}`} style={{ color: 'var(--color-text-primary)' }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    lines.forEach((line, index) => {
      let cleanLine = line.trim();
      
      if (cleanLine.startsWith('#')) {
        cleanLine = cleanLine.replace(/^#+\s*/, '');
        flushList(`list-${index}`);
        nodes.push(<div key={`h4-${index}`} style={{ fontWeight: 600, marginTop: '12px', marginBottom: '6px' }}>{parseInlineMarkdown(cleanLine, index)}</div>);
        return;
      }

      if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
        const itemText = cleanLine.substring(2).trim();
        listItems.push(parseInlineMarkdown(itemText, index));
        return;
      }

      const numMatch = cleanLine.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        listItems.push(<span key={`span-${index}`}><strong>{numMatch[1]}.</strong> {parseInlineMarkdown(numMatch[2], index)}</span>);
        return;
      }

      flushList(`list-${index}`);
      if (cleanLine) {
        nodes.push(<p key={`p-${index}`} style={{ marginBottom: '8px', lineHeight: 1.5 }}>{parseInlineMarkdown(cleanLine, index)}</p>);
      }
    });
    flushList('list-final');

    return nodes;
  };

  return (
    <div className="chat-view" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="chat-header-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #eaeaea' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px' }}>{conversation.title}</h3>
          <span className="text-muted text-xs">{conversation.date}</span>
        </div>
        <button 
          onClick={() => setShowCarePlan(true)}
          style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
        >
          Generate AI Care Plan
        </button>
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

      {showCarePlan && <CarePlanModal consultationId={conversation.id} onClose={() => setShowCarePlan(false)} />}
    </div>
  );
};
