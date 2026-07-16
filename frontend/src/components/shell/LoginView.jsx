import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import { apiClient } from "@/services/ApiClient";
import { cn } from "@/lib/utils";
import { GithubIcon } from "@/components/icons/github-icon";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { AuthDivider } from "@/components/auth-divider";
import { AtSignIcon, AlertCircle, LockIcon } from "lucide-react";
import "@/styles/login.css";
export function LoginView() {
  const { login, register, demoMode, toggleDemoMode, currentUser, fetchCurrentUser, fetchOrganizations, fetchNotifications } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle OAuth callback token
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      apiClient.setToken(token);

      // Decode JWT payload immediately so currentUser is set before navigate.
      // This prevents a race: navigate fires before fetchCurrentUser completes,
      // ProtectedRoute sees null → bounces back to /login (losing the token).
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        useAppStore.setState({
          currentUser: {
            id: payload.sub,
            email: payload.email,
            roles: payload.roles || [],
          },
        });
      } catch {
        // fallback – fetchCurrentUser will run anyway
      }

      (async () => {
        await fetchCurrentUser();
        await fetchOrganizations();
        await fetchNotifications();
        const state = useAppStore.getState();
        const orgSlug = state.currentOrganization?.slug || state.currentOrganization?.id;
        if (orgSlug && state.currentOrganization?.id !== '__empty__') {
          navigate(`/app/${orgSlug}/stats`, { replace: true });
        } else {
          navigate("/app/organizations", { replace: true });
        }
      })();
    }
  }, [searchParams, fetchCurrentUser, fetchOrganizations, fetchNotifications, navigate]);

  // Redirect if already logged in (only in production, not devMode)
  if (currentUser && !demoMode) {
    navigate("/app", { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ email, password, username });
      }
      const state = useAppStore.getState();
      const orgSlug = state.currentOrganization?.slug || state.currentOrganization?.id;
      if (orgSlug && state.currentOrganization?.id !== '__empty__') {
        navigate(`/app/${orgSlug}/stats`, { replace: true });
      } else {
        navigate("/app/organizations", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
    window.location.href = `${apiUrl}/auth/google?redirect=${encodeURIComponent("/app/home")}`;
  };

  const handleLogout = () => {
    const { logout } = useAppStore.getState();
    logout();
    window.location.reload();
  };

  return (
    <div className="login-wrapper">
      {/* Top logo */}
      <div className="login-top-logo">
        <a href="#">
          <Logo className="h-6" />
        </a>
      </div>

      {/* Middle card (transparent, no border, vertically centered) */}
      <div className="login-card fade-in slide-in-from-bottom-4 animate-in duration-600">
        <div className="login-header">
          <h1 className="login-title">
            {mode === "login" ? "Welcome Back!" : "Join Now!"}
          </h1>
          <p className="login-subtitle">
            {mode === "login"
              ? "Login to your Parrot account."
              : "Login or create your Parrot account."}
          </p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {mode === "register" && (
            <InputGroup>
              <InputGroupInput
                placeholder="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </InputGroup>
          )}

          <InputGroup>
            <InputGroupInput
              placeholder="your.email@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <InputGroupAddon align="inline-start">
              <AtSignIcon />
            </InputGroupAddon>
          </InputGroup>

          <InputGroup>
            <InputGroupInput
              placeholder="Min 8 characters"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <InputGroupAddon align="inline-start">
              <LockIcon size={16} />
            </InputGroupAddon>
          </InputGroup>

          <Button className="w-full mt-2" size="sm" type="submit" disabled={loading}>
            {loading
              ? (mode === "login" ? "Signing in..." : "Creating...")
              : (mode === "login" ? "Continue With Email" : "Create Account")}
          </Button>
        </form>

        <div className="login-divider-text">
          <span>OR CONTINUE WITH</span>
        </div>

        <div className="login-oauth-buttons">
          <Button
            className="w-full"
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleGoogleLogin}
          >
            <GoogleIcon data-icon="inline-start" />
            Google
          </Button>
        </div>

        <div className="login-footer">
          <button
            type="button"
            className="login-toggle-mode"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>

        {currentUser && (
          <div className="text-center mt-4">
            <button
              type="button"
              className="login-logout-btn"
              onClick={handleLogout}
            >
              Logout / Switch Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
