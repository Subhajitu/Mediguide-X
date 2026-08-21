import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from '../shared/layouts/Sidebar';
import { TopNav } from '../shared/layouts/TopNav';
import { HeroSection } from '../features/ai-consultation/HeroSection';
import { ChatInput } from '../features/ai-consultation/ChatInput';
import { ChatView } from '../features/ai-consultation/ChatView';
import { RightHealthPanel } from '../features/health-metrics/RightHealthPanel';
import { MedicalReportsView } from '../features/health-metrics/MedicalReportsView';
import { MedicationsView } from '../features/medications/MedicationsView';
import { UserProfileView } from '../features/user/UserProfileView';
import { AuthModal } from '../shared/components/AuthModal';
import { FamilySelectorModal } from '../shared/components/FamilySelectorModal';
import { useAuth } from '../context/AuthContext';
import { usePatient } from '../context/PatientContext';
import { consultationApi } from '../services/api/consultationApi';
import type { Conversation, Message } from '../types';
import { Icon } from '../shared/ui/Icon';
import './App.css';

const App: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { activeFamilyMember, activeConsultationId, setConsultationId } = usePatient();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active tab from URL — no local state needed
  const activeTab = location.pathname === '/reports' ? 'reports'
                  : location.pathname === '/profile' ? 'profile'
                  : location.pathname === '/medication' ? 'medication'
                  : 'dashboard';

  const handleTabChange = (tabId: string) => {
    navigate(tabId === 'dashboard' ? '/' : `/${tabId}`);
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);

  // Load chat history when active family member changes
  useEffect(() => {
    if (activeFamilyMember) {
      consultationApi.getConsultations(activeFamilyMember.id)
        .then(data => setConversations(data))
        .catch(err => console.error("Failed to load chat history:", err));
    } else {
      setConversations([]);
    }
  }, [activeFamilyMember]);

  // We keep local state for the active conversation for immediate UI updates
  const activeConversation = conversations.find(c => c.id === activeConsultationId);
  const suggestions = activeConversation 
    ? activeConversation.messages[activeConversation.messages.length - 1]?.suggestions || []
    : [];

  const handleSelectConversation = (id: string | null) => {
    setIsTyping(false);
    setConsultationId(id);
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const handleSendMessage = async (text: string, documentS3Key?: string) => {
    const cleanText = text.trim();
    if ((!cleanText && !documentS3Key) || isTyping) return;

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (!activeFamilyMember) {
      alert("Please add or select a family member first.");
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: cleanText || 'Please analyze this document.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      documentS3Key: documentS3Key,
    };

    let targetId = activeConsultationId;
    let existingConversation = conversations.find(c => c.id === targetId);

    if (existingConversation && targetId) {
      setConversations(current =>
        current.map(c =>
          c.id === targetId ? { ...c, messages: [...c.messages, userMessage] } : c
        )
      );
    } else {
      targetId = `temp-${Date.now()}`;
      setConsultationId(targetId);
      const newConv: Conversation = {
        id: targetId,
        title: cleanText.length > 42 ? `${cleanText.slice(0, 42)}...` : cleanText,
        date: 'Today',
        messages: [userMessage],
      };
      setConversations(current => [newConv, ...current]);
    }

    setIsTyping(true);

    try {
      const response = await consultationApi.sendMessage(activeFamilyMember.id, {
        // If it's a temp ID, we pass null to create a new consultation in DB
        consultation_id: targetId?.startsWith('temp') ? null : targetId,
        message: cleanText || 'Please analyze this document.',
        document_s3_key: documentS3Key ?? null,
      });

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.ai_message,
        timestamp: new Date(response.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: response.suggestions,
      };

      // Update the temp ID with the real DB ID if necessary
      const realId = response.consultation_id;

      setConversations(current =>
        current.map(c => {
          if (c.id === targetId) {
            return {
              ...c,
              id: realId, // update to real ID
              messages: [...c.messages, aiMessage]
            };
          }
          return c;
        })
      );
      setConsultationId(realId);
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsTyping(false);
    }
  };

  if (authLoading) return <div style={{padding: '50px', textAlign: 'center', color: '#fff'}}>Loading Mediguide...</div>;

  return (
    <div className={`app-layout ${activeConsultationId ? 'conversation-state' : 'landing-state'}`}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        activeId={activeConsultationId}
        onSelectConversation={handleSelectConversation}
        conversations={conversations}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      
      <div className="main-content">
        <TopNav
          onAddFamily={() => setShowFamilyModal(true)}
          onLoginClick={() => setShowAuthModal(true)}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        
        <div className="content-scrollable flex">
           {/* Center Column */}
           <div className="center-column">
             <Routes>
               <Route path="/reports" element={<MedicalReportsView />} />
               <Route path="/profile" element={<UserProfileView />} />
               <Route path="/medication" element={<MedicationsView />} />
               <Route path="/" element={
                 <>
                   {!activeConsultationId ? (
                     <>
                       <HeroSection />
                       {/* 
                       <div className="main-padding">
                         <QuickActionCards />
                       </div>
                       */}
                       
                       {/* Disclaimer */}
                       <div className="disclaimer">
                         <div className="disclaimer-highlight">
                           <Icon name="shield" size={14} />
                           <span>Mediguide X provides AI-generated information for general guidance only.</span>
                         </div><br />
                         <span>It is not a substitute for professional medical advice, diagnosis or treatment.</span>
                       </div>
                     </>
                   ) : (
                     activeConversation && <ChatView conversation={activeConversation} isTyping={isTyping} />
                   )}
                 </>
               } />
               <Route path="*" element={<Navigate to="/" replace />} />
             </Routes>

             {location.pathname === '/' && (
               <div className={`chat-input-wrapper ${activeConsultationId ? 'chat-mode' : ''} ${!isSidebarOpen ? 'sidebar-closed' : ''}`}>
                 <ChatInput suggestions={suggestions} onSend={handleSendMessage} familyMemberId={activeFamilyMember?.id} />
               </div>
             )}
           </div>

           {/* Right Panel */}
           <RightHealthPanel />
        </div>
      </div>

      {!isAuthenticated && showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {isAuthenticated && showFamilyModal && <FamilySelectorModal onClose={() => setShowFamilyModal(false)} />}
    </div>
  );
};

export default App;
