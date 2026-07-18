import { useAppStore } from "@/stores/useAppStore";
import { useState, useEffect } from "react";
import { Save, Check } from "lucide-react";
import "@/styles/settings.css";

export function ProfileSettingsView() {
  const { currentUser, updateProfile } = useAppStore();
  const [username, setUsername] = useState(currentUser?.username || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setUsername(currentUser?.username || "");
    setEmail(currentUser?.email || "");
  }, [currentUser]);

  const handleSave = async () => {
    setError("");
    try {
      await updateProfile({ username: username.trim(), email: email.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Failed to save profile.");
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-group-card">
        <div className="settings-group-row" style={{ flexDirection: "column", alignItems: "stretch", gap: "14px" }}>
          <div className="settings-group-row-left">
            <span className="settings-row-title">Username</span>
            <input
              className="overlay-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />
          </div>
          <div className="settings-group-row-left">
            <span className="settings-row-title">Email</span>
            <input
              className="overlay-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
          </div>
          {error && <span className="create-project-error">{error}</span>}
          <button onClick={handleSave} className="settings-btn-secondary" disabled={saved}>
            {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save profile</>}
          </button>
        </div>
      </div>
    </div>
  );
}
