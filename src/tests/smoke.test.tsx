/**
 * Phase 2 Mobile Responsiveness — smoke tests
 *
 * Tests verify:
 * 1. Task 10: CSS custom properties are used in App.css (no hardcoded pixel positions)
 * 2. Task 11: Sidebar renders with correct open/closed classes; hamburger in TopNav
 * 3. Task 12: Modals use CSS classes and ARIA attributes; no inline styles on dialog
 * 4. Task 13: Notification badge (hardcoded "3") is absent from TopNav
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ── Mock image assets ──────────────────────────────────────────────────────
// Resolved relative to this test file (src/tests/) → src/assets/avatar.jpg
vi.mock('../assets/avatar.jpg', () => ({ default: 'avatar.jpg' }));

// ── Mock context modules ───────────────────────────────────────────────────
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { fullName: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

vi.mock('../context/PatientContext', () => ({
  usePatient: () => ({
    familyMembers: [],
    activeFamilyMember: null,
    activeConsultationId: null,
    selectFamilyMember: vi.fn(),
    addFamilyMember: vi.fn(),
    setConsultationId: vi.fn(),
    refreshReports: vi.fn(),
    reports: [],
  }),
}));

// ── Mock framer-motion to avoid animation issues in jsdom ──────────────────
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
      React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// ── Mock consultation API ──────────────────────────────────────────────────
vi.mock('../services/api/consultationApi', () => ({
  consultationApi: {
    generateCarePlan: vi.fn().mockResolvedValue({
      symptom_summary: 'Test summary',
      possible_causes: ['Cause 1'],
      recommended_actions: ['Action 1'],
      red_flags: [],
      questions_for_doctor: ['Q1'],
      disclaimer: 'Test disclaimer',
    }),
    getConsultations: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn(),
  },
}));

// ── Imports after mocks (Vitest hoists vi.mock calls automatically) ────────
import { TopNav } from '../shared/layouts/TopNav';
import { Sidebar } from '../shared/layouts/Sidebar';
import { FamilySelectorModal } from '../shared/components/FamilySelectorModal';
import { CarePlanModal } from '../features/ai-consultation/CarePlanModal';

// ── Helpers ────────────────────────────────────────────────────────────────
const noop = () => {};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Task 10 — CSS custom properties in App.css', () => {
  it('does not contain hardcoded pixel positions for chat-input-wrapper', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cssPath = path.resolve(__dirname, '../app/App.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    // Hardcoded pixel offsets must be absent from positioning rules
    expect(css).not.toMatch(/left:\s*280px/);
    expect(css).not.toMatch(/right:\s*360px/);

    // Layout tokens must be defined on .app-layout
    expect(css).toContain('--sidebar-width');
    expect(css).toContain('--sidebar-width-collapsed');
    expect(css).toContain('--right-panel-width');

    // The wrapper must reference these tokens for positioning
    expect(css).toContain('var(--sidebar-width)');
    expect(css).toContain('var(--right-panel-width)');
  });
});

describe('Task 11 — Sidebar open/closed state', () => {
  const defaultProps = {
    isOpen: true,
    onToggle: noop,
    activeId: null,
    onSelectConversation: noop,
    conversations: [],
    activeTab: 'dashboard',
    onTabChange: noop,
  };

  it('renders an <aside> landmark element', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('applies "open" class when isOpen=true', () => {
    const { container } = render(<Sidebar {...defaultProps} isOpen={true} />);
    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('open');
  });

  it('applies "closed" class when isOpen=false', () => {
    const { container } = render(<Sidebar {...defaultProps} isOpen={false} />);
    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('closed');
  });

  it('calls onToggle when the close button is clicked (open state)', () => {
    const mockToggle = vi.fn();
    render(<Sidebar {...defaultProps} isOpen={true} onToggle={mockToggle} />);
    fireEvent.click(screen.getByLabelText('Close sidebar'));
    expect(mockToggle).toHaveBeenCalledOnce();
  });

  it('calls onToggle when the open button is clicked (closed state)', () => {
    const mockToggle = vi.fn();
    render(<Sidebar {...defaultProps} isOpen={false} onToggle={mockToggle} />);
    fireEvent.click(screen.getByLabelText('Open sidebar'));
    expect(mockToggle).toHaveBeenCalledOnce();
  });
});

describe('Task 11 — TopNav hamburger button', () => {
  it('renders a hamburger button for mobile navigation', () => {
    render(
      <TopNav
        activeTab="dashboard"
        onTabChange={noop}
        onMenuClick={noop}
      />
    );
    expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
  });

  it('calls onMenuClick when the hamburger button is clicked', () => {
    const mockMenuClick = vi.fn();
    render(
      <TopNav
        activeTab="dashboard"
        onTabChange={noop}
        onMenuClick={mockMenuClick}
      />
    );
    fireEvent.click(screen.getByLabelText('Open navigation menu'));
    expect(mockMenuClick).toHaveBeenCalledOnce();
  });
});

describe('Task 12 — FamilySelectorModal ARIA and CSS', () => {
  it('renders with role=dialog and aria-modal="true"', () => {
    render(<FamilySelectorModal onClose={noop} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('has an accessible modal title', () => {
    render(<FamilySelectorModal onClose={noop} />);
    expect(screen.getByText('Add Family Member')).toBeInTheDocument();
  });

  it('dialog container has no inline style attribute', () => {
    const { container } = render(<FamilySelectorModal onClose={noop} />);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('style')).toBeFalsy();
  });

  it('calls onClose when the close button is clicked', () => {
    const mockClose = vi.fn();
    render(<FamilySelectorModal onClose={mockClose} />);
    fireEvent.click(screen.getByLabelText('Close dialog'));
    expect(mockClose).toHaveBeenCalledOnce();
  });

  it('shows a validation error when name is shorter than 2 characters', async () => {
    render(<FamilySelectorModal onClose={noop} />);
    const nameInput = screen.getByPlaceholderText('Full Name');
    fireEvent.change(nameInput, { target: { value: 'A' } });
    const form = screen.getByRole('dialog').querySelector('form')!;
    fireEvent.submit(form);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/at least 2 characters/i);
  });
});

describe('Task 12 — CarePlanModal ARIA and state', () => {
  it('renders with role=dialog and aria-modal="true"', async () => {
    render(<CarePlanModal consultationId="test-id-123" onClose={noop} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // Let the async useEffect settle to avoid act() warnings
    await screen.findByRole('dialog');
  });

  it('shows a loading message on initial render', async () => {
    render(<CarePlanModal consultationId="test-id-123" onClose={noop} />);
    expect(
      screen.getByText(/Generating personalized care plan/i)
    ).toBeInTheDocument();
    // Drain the async effect queue to suppress act() warnings
    await screen.findByRole('dialog');
  });

  it('shows an error message for a temp consultation ID', async () => {
    render(<CarePlanModal consultationId="temp-12345" onClose={noop} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Please send a message/i);
  });

  it('calls onClose when the close button is clicked', async () => {
    const mockClose = vi.fn();
    render(<CarePlanModal consultationId="test-id-123" onClose={mockClose} />);
    fireEvent.click(screen.getByLabelText('Close care plan'));
    expect(mockClose).toHaveBeenCalledOnce();
    // Drain async effect queue
    await screen.findByLabelText('Close care plan').catch(() => {});
  });
});

describe('Task 13 — Notification badge removed', () => {
  beforeEach(() => {
    render(
      <TopNav
        activeTab="dashboard"
        onTabChange={noop}
        onMenuClick={noop}
      />
    );
  });

  it('notification button is present and accessible', () => {
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });

  it('hardcoded badge count "3" is absent from the notification area', () => {
    // Task 13 removed the hardcoded <span>3</span> badge — it must not appear
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });
});


describe('Task 27 — Token refresh security', () => {
  it('refresh_token is stored in sessionStorage on login (never localStorage)', () => {
    const fs = require('fs');
    const path = require('path');
    const authContextPath = path.resolve(__dirname, '../context/AuthContext.tsx');
    const source = fs.readFileSync(authContextPath, 'utf-8');

    // refresh token must be stored in sessionStorage
    expect(source).toContain("sessionStorage.setItem('refreshToken'");

    // refresh token must NOT be stored in localStorage
    expect(source).not.toMatch(/localStorage\.setItem\(['"]refreshToken['"]/);
  });

  it('logout clears refresh token from sessionStorage', () => {
    const fs = require('fs');
    const path = require('path');
    const authContextPath = path.resolve(__dirname, '../context/AuthContext.tsx');
    const source = fs.readFileSync(authContextPath, 'utf-8');

    expect(source).toContain("sessionStorage.removeItem('refreshToken'");
  });

  it('client.ts 401 handler attempts refresh before logout', () => {
    const fs = require('fs');
    const path = require('path');
    const clientPath = path.resolve(__dirname, '../services/api/client.ts');
    const source = fs.readFileSync(clientPath, 'utf-8');

    // Must attempt refresh on 401
    expect(source).toContain('auth/refresh');
    expect(source).toContain('refreshToken');
    // Must have retry guard
    expect(source).toContain('_retry');
  });
});

describe('Task 28 — URL-based routing', () => {
  it('App.tsx imports useNavigate and useLocation from react-router-dom', () => {
    const fs = require('fs');
    const path = require('path');
    const appPath = path.resolve(__dirname, '../app/App.tsx');
    const source = fs.readFileSync(appPath, 'utf-8');

    expect(source).toContain('useNavigate');
    expect(source).toContain('useLocation');
    expect(source).toContain('react-router-dom');
  });

  it('main.tsx wraps the app in BrowserRouter', () => {
    const fs = require('fs');
    const path = require('path');
    const mainPath = path.resolve(__dirname, '../main.tsx');
    const source = fs.readFileSync(mainPath, 'utf-8');

    expect(source).toContain('BrowserRouter');
    expect(source).toContain('react-router-dom');
  });

  it('App.tsx has Routes and Route components', () => {
    const fs = require('fs');
    const path = require('path');
    const appPath = path.resolve(__dirname, '../app/App.tsx');
    const source = fs.readFileSync(appPath, 'utf-8');

    expect(source).toContain('<Routes>');
    expect(source).toContain('<Route');
    // Catch-all redirect must exist
    expect(source).toContain('Navigate');
  });

  it('TopNav nav links do not use href="#..." fragment anchors', () => {
    const fs = require('fs');
    const path = require('path');
    const topNavPath = path.resolve(__dirname, '../shared/layouts/TopNav.tsx');
    const source = fs.readFileSync(topNavPath, 'utf-8');

    // Fragment anchors like href="#dashboard" cause scroll issues with routing
    expect(source).not.toMatch(/href="#[a-z]/);
  });
});
