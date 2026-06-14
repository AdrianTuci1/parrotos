import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { findSectionById } from "@/components/app-shared";
import {
  Bell,
  Settings,
  HelpCircle,
  CheckCheck,
  Settings2,
  X,
  BookOpen,
  MessageSquare,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import "@/styles/header.css";

const notifications = [
  {
    id: 'n1',
    title: 'Pixtooth sync completed',
    detail: 'All 12 connectors synced successfully.',
    time: '2 min ago',
    read: false,
  },
  {
    id: 'n2',
    title: 'Octomus latency alert',
    detail: 'Warehouse jobs are running 34% slower than baseline.',
    time: '18 min ago',
    read: false,
  },
  {
    id: 'n3',
    title: 'New connector available',
    detail: 'Salesforce connector is now ready to configure.',
    time: '1h ago',
    read: true,
  },
  {
    id: 'n4',
    title: 'Staticlabs billing updated',
    detail: 'Plan changed from Growth to Scale.',
    time: '3h ago',
    read: true,
  },
];

export function AppHeader() {
  const { activeSection, activeScope, currentOrganization, currentWorkspace, currentUser } = useAppStore();
  const section = findSectionById(activeScope, activeSection);

  const [activeOverlay, setActiveOverlay] = useState(null); // 'account' | 'help' | null

  const [avatarUrl, setAvatarUrl] = useState(null);
  const [userProfile, setUserProfile] = useState({
    fullName: "Alex Parker",
    email: "alex@nexahub.io",
    provider: "Google", // 'Google' | 'Email'
  });

  // Sync profile with currentUser from backend
  useEffect(() => {
    if (currentUser) {
      setUserProfile({
        fullName: currentUser.username || currentUser.fullName || "Alex Parker",
        email: currentUser.email || "alex@nexahub.io",
        provider: currentUser.provider?.toLowerCase() === 'google' ? 'Google' : 'Email',
      });
      if (currentUser.picture) {
        setAvatarUrl(currentUser.picture);
      }
    }
  }, [currentUser]);

  const [accountSubView, setAccountSubView] = useState('profile'); // 'profile' | 'password'

  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarUrl(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // State for Account Settings
  const [accountForm, setAccountForm] = useState({
    fullName: "Alex Parker",
    email: "alex@nexahub.io",
    provider: "Google",
    currentPassword: "",
    newPassword: "",
  });

  // State for Help & Support ticket
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    message: "",
  });

  const handleOpenAccountSettings = () => {
    setAccountForm({
      fullName: userProfile.fullName,
      email: userProfile.email,
      provider: userProfile.provider,
      currentPassword: "",
      newPassword: "",
    });
    setAccountSubView('profile');
    setActiveOverlay('account');
  };

  const handleSaveAccount = (e) => {
    e.preventDefault();
    setUserProfile((prev) => ({
      ...prev,
      fullName: accountForm.fullName,
    }));
    alert("Account settings saved successfully!");
    setActiveOverlay(null);
  };

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!ticketForm.subject || !ticketForm.message) {
      alert("Please fill in all fields.");
      return;
    }
    alert(`Support ticket "${ticketForm.subject}" submitted successfully!`);
    setTicketForm({ subject: "", message: "" });
    setActiveOverlay(null);
  };

  let scopeLabel;
  let scopeEyebrow;
  if (activeScope === "project") {
    scopeLabel = currentWorkspace?.name || "Project";
    scopeEyebrow = "Project";
  } else {
    scopeLabel = currentOrganization?.name || "Organization";
    scopeEyebrow = "Organization";
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="header-left-side">
          <SidebarTrigger className="header-sidebar-trigger" />
          <div className="header-divider" />
          <div className="header-section-title">
            <div className="header-section-copy">
              <span className="header-section-text">
                {scopeLabel} · {section?.title || "Dashboard"}
              </span>
            </div>
          </div>
        </div>

        <div className="header-right-side">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="header-bell-btn">
                  <Bell size={18} />
                  {unreadCount > 0 && <span className="header-bell-badge" />}
                </button>
              }
            />
            <DropdownMenuContent
              side="bottom"
              align="end"
              sideOffset={8}
              className="header-dropdown-content"
            >
              <DropdownMenuGroup className="header-dropdown-label">
                <DropdownMenuItem className="header-dropdown-label-row" onClick={(e) => e.preventDefault()}>
                  <div className="header-dropdown-label-inner">
                    <span className="header-dropdown-label-text">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="header-dropdown-count">{unreadCount}</span>
                    )}
                  </div>
                  <button
                    className="header-dropdown-mark-read"
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              {notifications.map((n) => (
                <DropdownMenuItem key={n.id} className="header-notif-item" onClick={(e) => e.preventDefault()}>
                  <div className="header-notif-left">
                    {!n.read && <span className="header-notif-dot" />}
                    <div className="header-notif-copy">
                      <span className={`header-notif-title ${!n.read ? 'unread' : ''}`}>
                        {n.title}
                      </span>
                      <span className="header-notif-detail">{n.detail}</span>
                    </div>
                  </div>
                  <span className="header-notif-time">{n.time}</span>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator className="header-dropdown-separator" />

              <DropdownMenuItem className="header-dropdown-action">
                <Settings2 size={14} />
                Notification settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="header-avatar-wrapper">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="header-avatar-circle" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className="header-avatar-circle">{userProfile.fullName.charAt(0).toUpperCase()}</div>
                  )}
                </button>
              }
            />
            <DropdownMenuContent
              side="bottom"
              align="end"
              sideOffset={8}
              className="header-dropdown-content"
            >
              <DropdownMenuGroup className="header-dropdown-label">
                <DropdownMenuItem className="header-dropdown-label-row" onClick={(e) => e.preventDefault()}>
                  <div className="header-user-label">
                    <div className="header-user-avatar-sm" style={avatarUrl ? { background: 'transparent' } : undefined}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        userProfile.fullName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="header-user-name">{userProfile.fullName}</div>
                      <div className="header-user-email">{userProfile.email}</div>
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="header-dropdown-separator" />

              <DropdownMenuItem className="header-dropdown-action" onClick={handleOpenAccountSettings}>
                <Settings size={14} />
                Account settings
              </DropdownMenuItem>
              <DropdownMenuItem className="header-dropdown-action" onClick={() => setActiveOverlay('help')}>
                <HelpCircle size={14} />
                Help & support
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Account Settings Overlay */}
      {activeOverlay === 'account' && (
        <div className="overlay-backdrop" onClick={() => setActiveOverlay(null)}>
          <div className="overlay-modal is-wide" onClick={(e) => e.stopPropagation()}>
            <button className="overlay-close-btn" onClick={() => setActiveOverlay(null)}>
              <X size={18} />
            </button>
            
            {accountSubView === 'profile' ? (
              <>
                <div className="overlay-header">
                  <h3 className="overlay-title">
                    Account Settings
                  </h3>
                  <p className="overlay-description">
                    Update your personal information, profile photo, and security details.
                  </p>
                </div>
                <form onSubmit={handleSaveAccount} className="overlay-body">
                  {/* Profile Photo Uploader Section */}
                  <div className="overlay-avatar-section" style={{ marginBottom: '24px' }}>
                    <div className="overlay-avatar-preview" style={avatarUrl ? { background: 'transparent' } : undefined}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Preview" className="overlay-avatar-img" />
                      ) : (
                        accountForm.fullName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="overlay-avatar-actions">
                      <button type="button" className="overlay-avatar-btn" onClick={() => fileInputRef.current?.click()}>
                        Change photo
                      </button>
                      <span className="overlay-avatar-hint">JPG, PNG or GIF. Max size 800K.</span>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        style={{ display: 'none' }}
                        accept="image/*"
                      />
                    </div>
                  </div>

                  <div className="overlay-form-group">
                    <label className="overlay-form-label">Full Name</label>
                    <input
                      type="text"
                      className="overlay-input"
                      value={accountForm.fullName}
                      onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="overlay-form-group">
                    <label className="overlay-form-label">Email Address</label>
                    <input
                      type="email"
                      className="overlay-input"
                      value={accountForm.email}
                      disabled
                      style={{ opacity: 0.6, cursor: 'not-allowed' }}
                      required
                    />
                  </div>

                  <div className="overlay-form-group">
                    <label className="overlay-form-label">Linked Account</label>
                    <div className="overlay-connection-badge">
                      {accountForm.provider === 'Google' ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                          </svg>
                          <span style={{ fontSize: '13px' }}>Google Account</span>
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#8e918f' }}>
                            <rect width="20" height="16" x="2" y="4" rx="2"/>
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                          </svg>
                          <span style={{ fontSize: '13px' }}>Email & Password</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ width: '100%', height: '1px', backgroundColor: '#25282c', margin: '8px 0 16px' }} />

                  <div className="overlay-form-group">
                    <label className="overlay-form-label">Security</label>
                    <button
                      type="button"
                      className="overlay-avatar-btn"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}
                      onClick={() => setAccountSubView('password')}
                    >
                      Change password...
                    </button>
                  </div>
                  
                  <div className="overlay-footer">
                    <button type="button" className="overlay-cancel-btn" onClick={() => setActiveOverlay(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="overlay-ticket-submit-btn">
                      Save Changes
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="overlay-header">
                  <button
                    type="button"
                    className="overlay-avatar-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}
                    onClick={() => setAccountSubView('profile')}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <h3 className="overlay-title">
                    Change Password
                  </h3>
                  <p className="overlay-description">
                    Please enter your current password and choose a secure new password.
                  </p>
                </div>
                <form onSubmit={handleSaveAccount} className="overlay-body">
                  <div className="overlay-form-group">
                    <label className="overlay-form-label">Current Password</label>
                    <input
                      type="password"
                      className="overlay-input"
                      placeholder="••••••••"
                      value={accountForm.currentPassword}
                      onChange={(e) => setAccountForm({ ...accountForm, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="overlay-form-group">
                    <label className="overlay-form-label">New Password</label>
                    <input
                      type="password"
                      className="overlay-input"
                      placeholder="Minimum 8 characters"
                      value={accountForm.newPassword}
                      onChange={(e) => setAccountForm({ ...accountForm, newPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="overlay-form-group">
                    <label className="overlay-form-label">Confirm New Password</label>
                    <input
                      type="password"
                      className="overlay-input"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                  <div className="overlay-footer">
                    <button type="button" className="overlay-cancel-btn" onClick={() => setAccountSubView('profile')}>
                      Cancel
                    </button>
                    <button type="submit" className="overlay-ticket-submit-btn">
                      Update Password
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Help & Support Overlay */}
      {activeOverlay === 'help' && (
        <div className="overlay-backdrop" onClick={() => setActiveOverlay(null)}>
          <div className="overlay-modal" onClick={(e) => e.stopPropagation()}>
            <button className="overlay-close-btn" onClick={() => setActiveOverlay(null)}>
              <X size={18} />
            </button>
            <div className="overlay-header">
              <h3 className="overlay-title">
                Help & Support
              </h3>
              <p className="overlay-description">
                Browse popular resources or reach out to our engineering team.
              </p>
            </div>
            <div className="overlay-body">
              <div className="overlay-help-section">
                <h4 className="overlay-help-section-title">
                  <BookOpen size={14} style={{ color: "#a8c7fa" }} />
                  Documentation & Resources
                </h4>
                <a href="https://docs.nexahub.io" target="_blank" rel="noreferrer" className="overlay-help-link">
                  <span>Developer Documentation</span>
                  <ExternalLink size={12} />
                </a>
                <a href="https://docs.nexahub.io/guides" target="_blank" rel="noreferrer" className="overlay-help-link">
                  <span>Getting Started Guide</span>
                  <ExternalLink size={12} />
                </a>
                <a href="https://status.nexahub.io" target="_blank" rel="noreferrer" className="overlay-help-link">
                  <span>System Status</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              <div className="overlay-help-section" style={{ marginBottom: 0 }}>
                <h4 className="overlay-help-section-title">
                  <MessageSquare size={14} style={{ color: "#a8c7fa" }} />
                  Submit a Support Ticket
                </h4>
                <form onSubmit={handleSubmitTicket} style={{ marginTop: "12px" }}>
                  <div className="overlay-form-group">
                    <label className="overlay-form-label">Subject</label>
                    <input
                      type="text"
                      className="overlay-input"
                      placeholder="e.g. Stripe sync is failing"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                      required
                    />
                  </div>
                  <div className="overlay-form-group">
                    <label className="overlay-form-label">Message</label>
                    <textarea
                      className="overlay-input"
                      style={{ minHeight: "80px", resize: "vertical" }}
                      placeholder="Describe the issue you are experiencing..."
                      value={ticketForm.message}
                      onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                      required
                    />
                  </div>
                  <div className="overlay-footer" style={{ borderTop: "none", paddingTop: 0, marginTop: "16px" }}>
                    <button type="button" className="overlay-cancel-btn" onClick={() => setActiveOverlay(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="overlay-ticket-submit-btn">
                      Submit Ticket
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
