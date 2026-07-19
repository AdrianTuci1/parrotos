import { stringToGradient } from "./utils";

export function MemberAvatar({ email, size = 24 }) {
  const initial = (email?.[0] || "?").toUpperCase();
  return (
    <div
      className="settings-scope-avatar"
      style={{
        background: stringToGradient(email),
        width: size,
        height: size,
        borderRadius: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.45,
        fontWeight: 600,
        color: "#fff",
      }}
    >
      {initial}
    </div>
  );
}
