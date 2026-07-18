import { useState, useEffect, useRef } from "react";
import { Bell, Check, X } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const {
    notifications,
    unreadNotifications,
    invitations,
    fetchNotifications,
    fetchInvitations,
    acceptInvitation,
    declineInvitation,
    markNotificationRead,
  } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications().catch(() => {});
    fetchInvitations().catch(() => {});
  }, [fetchNotifications, fetchInvitations]);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleAcceptInvitation = async (id) => {
    try {
      await acceptInvitation(id);
      setOpen(false);
      navigate("/app");
    } catch {}
  };

  const handleDeclineInvitation = async (id) => {
    try {
      await declineInvitation(id);
    } catch {}
  };

  const handleRead = async (id, link) => {
    try {
      await markNotificationRead(id);
      if (link) navigate(link);
      setOpen(false);
    } catch {}
  };

  const combined = [
    ...(invitations || []).map((inv) => ({
      id: `inv-${inv.id}`,
      type: "invitation",
      invitationId: inv.id,
      title: "Workspace invitation",
      detail: `You have been invited to join a workspace as ${inv.role}`,
      createdAt: inv.createdAt,
      read: false,
    })),
    ...(notifications || []),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="notification-bell" ref={ref}>
      <button className="topbar-icon-btn" aria-label="Notifications" onClick={() => setOpen(!open)}>
        <Bell className="h-4 w-4" />
        {unreadNotifications > 0 || (invitations || []).length > 0 ? <span className="topbar-badge" /> : null}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span>Notifications</span>
          </div>
          {combined.length === 0 ? (
            <div className="notification-empty">No notifications</div>
          ) : (
            <div className="notification-list">
              {combined.map((item) => (
                <div key={item.id} className={cn("notification-item", !item.read && "unread")}>
                  <div className="notification-content">
                    <div className="notification-title">{item.title}</div>
                    <div className="notification-detail">{item.detail}</div>
                  </div>
                  {item.type === "invitation" ? (
                    <div className="notification-actions">
                      <button className="notification-btn accept" onClick={() => handleAcceptInvitation(item.invitationId)}>
                        <Check size={12} />
                      </button>
                      <button className="notification-btn decline" onClick={() => handleDeclineInvitation(item.invitationId)}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button className="notification-btn accept" onClick={() => handleRead(item.id, item.link)}>
                      <Check size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
