import { useAppStore } from "@/stores/useAppStore";
import { useState, useEffect, useRef } from "react";
import { Save, Check, Globe, HelpCircle, ChevronDown } from "lucide-react";
import { SectionHeader } from "@/components/shell/OrganizationSettingsView";
import "@/styles/settings.css";

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";
}

function getBrowserTimezoneLabel() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = new Date().getTimezoneOffset();
    const sign = offset <= 0 ? "+" : "-";
    const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
    const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    return `Browser Local Time (${time} · GMT${sign}${hours})`;
  } catch {
    return "Browser Local Time";
  }
}

const timezones = [
  { value: "browser", label: getBrowserTimezoneLabel() },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Europe/Bucharest", label: "Eastern European Time (EET)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Asia/Shanghai", label: "China Standard Time (CST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

export function ProfileSettingsView() {
  const { currentUser, updateProfile } = useAppStore();
  const [email, setEmail] = useState(currentUser?.email || "");
  const [editingEmail, setEditingEmail] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.picture || "");
  const [timezone, setTimezone] = useState(currentUser?.timezone || "browser");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    setEmail(currentUser?.email || "");
    setAvatarUrl(currentUser?.picture || "");
    setTimezone(currentUser?.timezone || "browser");
  }, [currentUser]);

  const handleEmailUpdate = async () => {
    setError("");
    try {
      await updateProfile({ email: email.trim() });
      setSaved(true);
      setEditingEmail(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Failed to update email.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === "string") {
        setAvatarUrl(dataUrl);
        updateProfile({ picture: dataUrl }).catch(() => {});
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTimezoneChange = async (value) => {
    setTimezone(value);
    try {
      await updateProfile({ timezone: value });
    } catch (err) {
      setError(err.message || "Failed to update timezone.");
    }
  };

  const connectedAccounts = currentUser?.connectedAccounts || [
    {
      provider: "Google",
      providerUsername: currentUser?.email || "",
      connected: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    },
  ];

  return (
    <div className="settings-page profile-page">
      <SectionHeader title="Profile" description="Manage your account profile." />

      <div className="settings-card profile-card">
        <div className="profile-card-header">
          <div className="profile-avatar" style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}>
            {!avatarUrl && <span className="profile-avatar-initials">{getInitials(currentUser?.username || currentUser?.email)}</span>}
          </div>
          <button className="settings-btn-secondary profile-upload-btn" onClick={() => fileInputRef.current?.click()}>
            Upload Photo
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="profile-file-input" onChange={handleFileChange} />
        </div>

        <div className="profile-email-row">
          <div className="profile-email-info">
            <span className="profile-email-label">Email</span>
            {editingEmail ? (
              <input
                className="settings-input profile-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                onKeyDown={(e) => { if (e.key === "Enter") handleEmailUpdate(); }}
              />
            ) : (
              <span className="profile-email-value">{currentUser?.email || "—"}</span>
            )}
          </div>
          {editingEmail ? (
            <div className="profile-email-actions">
              <button className="settings-btn-secondary" onClick={() => { setEditingEmail(false); setEmail(currentUser?.email || ""); }}>Cancel</button>
              <button className="settings-btn-primary" onClick={handleEmailUpdate} disabled={saved}>
                {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
              </button>
            </div>
          ) : (
            <button className="settings-btn-secondary" onClick={() => setEditingEmail(true)}>
              Update
            </button>
          )}
        </div>
      </div>

      <h2 className="profile-section-heading">Preferences</h2>
      <div className="settings-card profile-card">
        <div className="profile-timezone-row">
          <label className="profile-timezone-label">
            <span>Timezone</span>
            <HelpCircle size={14} className="profile-timezone-help" />
          </label>
          <div className="settings-custom-select-wrapper">
            <Globe size={14} className="profile-timezone-icon" />
            <select
              className="settings-custom-select profile-timezone-select"
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="settings-custom-select-icon" />
          </div>
        </div>
      </div>

      <h2 className="profile-section-heading">Connected Accounts</h2>
      <div className="settings-card profile-card">
        <table className="profile-connected-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Provider Username</th>
              <th>Connected</th>
            </tr>
          </thead>
          <tbody>
            {connectedAccounts.map((account, index) => (
              <tr key={index}>
                <td>{account.provider}</td>
                <td>{account.providerUsername}</td>
                <td>{account.connected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <span className="create-project-error">{error}</span>}
    </div>
  );
}
