import { useState, useEffect } from "react";
import { Save, Check } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import "@/styles/settings.css";

export function NotificationSettingsView() {
  const { currentUser, updateNotificationPreferences, fetchNotificationPreferences } = useAppStore();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prefs = currentUser?.notificationPreferences || {};
    setEmailEnabled(prefs.emailAlerts ?? true);
    setDigestEnabled(prefs.weeklyDigest ?? false);
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.notificationPreferences) {
      fetchNotificationPreferences().catch(() => {}).then((prefs) => {
        if (!cancelled && prefs) {
          setEmailEnabled(prefs.emailAlerts ?? true);
          setDigestEnabled(prefs.weeklyDigest ?? false);
        }
      });
    }
    return () => { cancelled = true; };
  }, [currentUser, fetchNotificationPreferences]);

  const handleSave = async () => {
    setError("");
    try {
      await updateNotificationPreferences({ emailAlerts: emailEnabled, weeklyDigest: digestEnabled });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Failed to save preferences.");
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-group-card">
        <label className="settings-checkbox-row">
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={(e) => setEmailEnabled(e.target.checked)}
          />
          <span>Email alerts for critical events</span>
        </label>
        <label className="settings-checkbox-row">
          <input
            type="checkbox"
            checked={digestEnabled}
            onChange={(e) => setDigestEnabled(e.target.checked)}
          />
          <span>Weekly digest summary</span>
        </label>
        {error && <span className="create-project-error">{error}</span>}
        <button onClick={handleSave} className="settings-btn-secondary" style={{ marginTop: 12 }} disabled={saved}>
          {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save preferences</>}
        </button>
      </div>
    </div>
  );
}
