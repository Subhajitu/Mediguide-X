import React, { useState } from 'react';
import { Sidebar } from '../shared/layouts/Sidebar';
import { TopNav } from '../shared/layouts/TopNav';
import { HeroSection } from '../features/ai-consultation/HeroSection';
import { QuickActionCards } from '../features/ai-consultation/QuickActionCards';
import { ChatInput } from '../features/ai-consultation/ChatInput';
import { ChatView } from '../features/ai-consultation/ChatView';
import { RightHealthPanel } from '../features/health-metrics/RightHealthPanel';
import { mockConsultationHistory, type Conversation, type Message } from '../services/mockData';
import './App.css';

const buildLiveAiReply = (id: number, hasAskedFollowUp: boolean): Message => ({
  id: `live-ai-${id}`,
  sender: 'ai',
  text: hasAskedFollowUp
    ? "Thanks, that gives me enough context for general guidance. Based on what you shared, start with conservative care while watching for red flags.\n- Rest and hydrate steadily.\n- Track symptom timing, severity, and temperature if fever is present.\n- Avoid mixing medicines unless your clinician or pharmacist confirms it is safe.\n- Seek urgent care for breathing difficulty, chest pain, fainting, confusion, severe pain, or rapidly worsening symptoms.\nI can also prepare a concise doctor summary from this conversation."
    : "I understand. Before I suggest next steps, I need to ask a few safety questions.\n- How old are you?\n- When did this start and is it getting worse?\n- Any fever, breathing difficulty, chest pain, severe pain, fainting, or confusion?\n- Are you taking any medicines or managing a chronic condition?",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  suggestions: hasAskedFollowUp
    ? ['Create doctor summary', 'Show red flags', 'Home care checklist', 'What should I monitor?']
    : ['It started yesterday', 'No emergency symptoms', 'I take no regular medicines', 'I have a report to upload'],
});

const App: React.FC = () => {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>(mockConsultationHistory);
  const [isTyping, setIsTyping] = useState(false);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  
  const suggestions = activeConversation?.messages[activeConversation.messages.length - 1]?.suggestions || [];

  const handleSelectConversation = (id: string | null) => {
    setIsTyping(false);
    setActiveConversationId(id);
  };

  const handleSendMessage = (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) {
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: cleanText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const targetId = activeConversationId || 'live-consultation';
    const existingConversation = conversations.find(conversation => conversation.id === targetId);

    if (!activeConversationId) {
      setActiveConversationId(targetId);
    }

    if (existingConversation) {
      setConversations(current =>
        current.map(conversation =>
          conversation.id === targetId
            ? { ...conversation, messages: [...conversation.messages, userMessage] }
            : conversation
        )
      );
    } else {
      const liveConversation: Conversation = {
        id: targetId,
        title: cleanText.length > 42 ? `${cleanText.slice(0, 42)}...` : cleanText,
        date: 'Today',
        messages: [userMessage],
      };
      setConversations(current => [liveConversation, ...current]);
      setActiveConversationId(targetId);
    }

    setIsTyping(true);
    window.setTimeout(() => {
      setConversations(current =>
        current.map(conversation =>
          conversation.id === targetId
            ? {
                ...conversation,
                messages: [
                  ...conversation.messages,
                  buildLiveAiReply(
                    conversation.messages.length + 1,
                    conversation.messages.some(message => message.sender === 'ai')
                  )
                ]
              }
            : conversation
        )
      );
      setIsTyping(false);
    }, 950);
  };

  return (
    <div className={`app-layout ${activeConversationId ? 'conversation-state' : 'landing-state'}`}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        activeId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        conversations={conversations}
      />
      
      <div className="main-content">
        <TopNav />
        <div className="content-scrollable flex">
           
           {/* Center Column */}
           <div className="center-column">
             {!activeConversationId ? (
               <>
                 <HeroSection />
                 <div className="main-padding">
                   <QuickActionCards />
                 </div>
                 
                 {/* Disclaimer */}
                 <div className="disclaimer">
                   <span className="text-accent">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 14, height: 14, display: 'inline', marginRight: 4, verticalAlign: 'text-bottom'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                     Mediguide X provides AI-generated information for general guidance only.
                   </span><br />
                   It is not a substitute for professional medical advice, diagnosis or treatment.
                 </div>
               </>
             ) : (
               activeConversation && <ChatView conversation={activeConversation} isTyping={isTyping} />
             )}

             <div className={`chat-input-wrapper ${activeConversationId ? 'chat-mode' : ''} ${!isSidebarOpen ? 'sidebar-closed' : ''}`}>
               <ChatInput suggestions={suggestions} onSend={handleSendMessage} />
             </div>
           </div>

           {/* Right Panel */}
           <RightHealthPanel />

        </div>
      </div>
    </div>
  );
};

export default App;
