import { useState, useMemo } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { Plus, Check } from "lucide-react";
import { MemberAvatar } from "../MemberAvatar";

function providerLabel(member) {
  if (member.provider) return member.provider;
  if (member.email?.includes("gmail") || member.email?.includes("google")) return "Google";
  return "Email";
}

export function MembersTab() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Member");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const { currentOrganization, currentUser, members, subscription, addMember, removeMember, updateMember } = useAppStore();
  const memberList = useMemo(() => members || [], [members]);
  const maxSeats = subscription?.limits?.maxSeats ?? 2;
  const availableSeats = Math.max(0, maxSeats - memberList.length);

  const handleInvite = async () => {
    if (!email.trim() || !currentOrganization) return;
    setError("");
    setLoading(true);
    try {
      await addMember(currentOrganization.id, email.trim(), role);
      setEmail("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Failed to invite member.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!currentOrganization) return;
    try {
      await updateMember(currentOrganization.id, userId, newRole);
    } catch (err) {
      setError(err.message || "Failed to update role.");
    }
  };

  const handleRemove = async (userId) => {
    if (!currentOrganization || userId === currentUser?.id) return;
    try {
      await removeMember(currentOrganization.id, userId);
    } catch (err) {
      setError(err.message || "Failed to remove member.");
    }
  };

  return (
    <div className="workspace-tab-content">
      <div className="workspace-card">
        <div className="workspace-card-header">
          <h3 className="workspace-card-title">Invite a team member</h3>
          <p className="workspace-card-subtitle">
            Invite collaborators to join <strong>{currentOrganization?.name || "this workspace"}</strong> as a member.
          </p>
        </div>
        <div className="workspace-card-body">
          <div className="workspace-invite-row">
            <input
              className="settings-input"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
            />
            <select className="settings-select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
              <option value="Viewer">Viewer</option>
            </select>
            <button className="settings-btn-primary" onClick={handleInvite} disabled={loading || saved}>
              {saved ? <><Check size={14} /> Invited</> : <><Plus size={14} /> Invite</>}
            </button>
          </div>
          {error && <span className="create-project-error">{error}</span>}
        </div>
      </div>

      <div className="workspace-section-title">Team Members</div>
      <div className="workspace-card workspace-card-flat">
        <div className="workspace-card-body">
          <p className="workspace-members-summary">
            Workspace has {memberList.length} member{memberList.length === 1 ? "" : "s"}. Available seats: <strong>{availableSeats}</strong>.{" "}
            To get additional seats upgrade to a <a href="/settings/workspace/billing" className="workspace-link">Team plan</a>.
          </p>

          <table className="workspace-members-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Identity Provider</th>
                <th>Role</th>
                <th>Member Since</th>
                <th style={{ width: "1%" }} />
              </tr>
            </thead>
            <tbody>
              {memberList.map((member) => {
                const isSelf = member.userId === currentUser?.id;
                return (
                  <tr key={member.userId || member.email}>
                    <td>
                      <div className="workspace-member-cell">
                        <MemberAvatar email={member.email} size={28} />
                        <div className="workspace-member-info">
                          <div className="workspace-member-name">
                            {member.username || member.email.split("@")[0]}
                            {isSelf && " (You)"}
                          </div>
                          <div className="workspace-member-email">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{providerLabel(member)}</td>
                    <td>
                      <select
                        className="settings-select workspace-role-select"
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                        disabled={isSelf}
                      >
                        <option value="Owner">Owner</option>
                        <option value="Admin">Admin</option>
                        <option value="Member">Member</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    </td>
                    <td>
                      <div className="workspace-member-since">
                        {member.joinedAt
                          ? new Date(member.joinedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
                          : "—"}
                        <div className="workspace-member-activity">No recent activity</div>
                      </div>
                    </td>
                    <td>
                      {!isSelf && (
                        <button
                          type="button"
                          className="workspace-member-remove"
                          onClick={() => handleRemove(member.userId)}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
