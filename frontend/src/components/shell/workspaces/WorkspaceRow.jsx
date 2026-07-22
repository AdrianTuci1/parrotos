import { Copy, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkspaceAvatar({ id }) {
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return (
    <div
      className="workspace-avatar"
      style={{ backgroundColor: `hsl(${hue}, 70%, 50%)` }}
    />
  );
}

export function WorkspaceRow({ 
  org, 
  role, 
  copiedId, 
  leavingId, 
  onCopyId, 
  onManageMembers, 
  onLeave 
}) {
  return (
    <tr>
      <td>
        <div className="workspace-cell">
          <WorkspaceAvatar id={org.id} />
          <span className="workspace-name">{org.name}</span>
          {org.isDefault && (
            <span className="workspace-badge">personal</span>
          )}
        </div>
      </td>
      <td className="workspace-role">{role}</td>
      <td className="workspace-actions">
        <button
          className="workspace-action-btn"
          onClick={() => onCopyId(org.id)}
        >
          <Copy size={14} />
          {copiedId === org.id ? 'Copied' : 'Copy ID'}
        </button>
        {!org.isDefault && (
          <button
            className="workspace-action-btn"
            onClick={() => onManageMembers(org.id)}
          >
            <Users size={14} />
            Manage members
          </button>
        )}
        <button
          className={cn(
            'workspace-action-btn workspace-leave-btn',
            org.isDefault && 'disabled'
          )}
          disabled={org.isDefault || leavingId === org.id}
          onClick={() => onLeave(org)}
          title={org.isDefault ? 'Cannot leave default workspace' : 'Leave workspace'}
        >
          <LogOut size={14} />
          {leavingId === org.id ? 'Leaving...' : 'Leave'}
        </button>
      </td>
    </tr>
  );
}
