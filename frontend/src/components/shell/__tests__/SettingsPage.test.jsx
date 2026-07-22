import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SettingsPage } from '../SettingsPage';

// Mock components to simplify rendering and avoid store dependencies
vi.mock('../SettingsLayout', () => ({
  SettingsLayout: ({ children }) => <div data-testid="settings-layout">{children}</div>
}));
vi.mock('../ProfileSettingsView', () => ({ ProfileSettingsView: () => <div data-testid="profile-view" /> }));
vi.mock('../WorkspaceSettingsView', () => ({ WorkspaceSettingsView: () => <div data-testid="workspace-settings-view" /> }));
vi.mock('../NotificationSettingsView', () => ({ NotificationSettingsView: () => <div data-testid="notifications-view" /> }));
vi.mock('../OrganizationOrganizationsView', () => ({ OrganizationOrganizationsView: () => <div data-testid="organizations-view" /> }));

describe('SettingsPage Routing', () => {
  const renderWithRouter = (initialRoute) => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/settings/*" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('redirects /settings/workspace to /settings/workspace/management', () => {
    // The redirect uses absolute path /settings/workspace/management
    // Note: react-router-dom Navigate doesn't change the DOM by default in tests without history listener,
    // but we can verify it renders the target route if we have a mock route to catch it.
    
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/settings/workspace']}>
        <Routes>
          <Route path="/settings/*" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Because it redirects to /settings/workspace/management, and SettingsPage has 
    // <Route path="workspace/:tab" element={<WorkspaceSettingsView />} />
    // It should render WorkspaceSettingsView
    expect(getByTestId('workspace-settings-view')).toBeTruthy();
  });

  it('renders ProfileSettingsView on /settings/profile', () => {
    const { getByTestId } = renderWithRouter('/settings/profile');
    expect(getByTestId('profile-view')).toBeTruthy();
  });

  it('redirects unknown routes to /settings/profile', () => {
    const { getByTestId } = renderWithRouter('/settings/unknown-route-123');
    expect(getByTestId('profile-view')).toBeTruthy();
  });
});
