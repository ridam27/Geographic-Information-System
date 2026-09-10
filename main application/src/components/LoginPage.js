import { useEffect, useState } from "react";
import { BrandMark, BrandWord } from "./BrandLogo";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, register, checkBootstrapStatus } = useAuth();
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Whether a master admin already exists. `null` = still checking.
  // Once true, self-registration is closed — sub-users are created from
  // the Admin Panel instead, each with only their assigned module.
  const [adminExists, setAdminExists] = useState(null);

  useEffect(() => {
    let cancelled = false;
    checkBootstrapStatus()
      .then((exists) => {
        if (!cancelled) setAdminExists(exists);
      })
      .catch(() => {
        if (!cancelled) setAdminExists(null);
      });
    return () => {
      cancelled = true;
    };
  }, [checkBootstrapStatus]);

  const canSelfRegister = adminExists === false;
  const isSignup = mode === "signup" && canSelfRegister;
  const nameValid = name.trim().length >= 2;
  const emailValid = /\S+@\S+\.\S+/.test(email);
  const passwordValid = isSignup
    ? password.length >= 8 && /[A-Z]/.test(password)
      && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)
    : password.length >= 1;
  const canSubmit = emailValid && passwordValid && (!isSignup || nameValid) && !submitting;

  function switchMode(nextMode) {
    if (nextMode === "signup" && !canSelfRegister) return;
    setMode(nextMode);
    setFormError(null);
    setShowPassword(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    try {
      if (isSignup) {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      setFormError(err.message || "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="authpage">
      <div className="authcard" role="main" aria-labelledby="authTitle">
        <div className="authcard__brand">
          <span className="sidebar__mark" aria-hidden="true">
            <BrandMark size={30} />
          </span>
          <div>
            <h1 id="authTitle" className="authcard__title brandword">
              <BrandWord />
            </h1>
            <p className="authcard__subtitle">Unified GIS Console - Master Sign-In</p>
          </div>
        </div>

        <p className="authcard__lead">
          {isSignup
            ? "Create the master admin account, then use the Admin Panel to add sub-users for each GIS module."
            : "Sign in with your account to access the GIS modules assigned to you."}
        </p>

        {canSelfRegister && (
          <div className="authcard__tabs" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={`authcard__tab ${!isSignup ? "authcard__tab--active" : ""}`}
              onClick={() => switchMode("signin")}
              role="tab"
              aria-selected={!isSignup}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`authcard__tab ${isSignup ? "authcard__tab--active" : ""}`}
              onClick={() => switchMode("signup")}
              role="tab"
              aria-selected={isSignup}
            >
              Create account
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {isSignup && (
            <div className="field">
              <label className="field__label" htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                className="field__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                aria-invalid={name.length > 0 && !nameValid}
                required
              />
              {name.length > 0 && !nameValid && (
                <span className="field__hint field__hint--error">Enter at least 2 characters.</span>
              )}
            </div>
          )}

          <div className="field">
            <label className="field__label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="field__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organization.gov"
              aria-invalid={email.length > 0 && !emailValid}
              required
            />
            {email.length > 0 && !emailValid && (
              <span className="field__hint field__hint--error">Enter a valid email address.</span>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="password">Password</label>
            <div className="field__inputWrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="field__input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                aria-invalid={password.length > 0 && !passwordValid}
                required
              />
              <button
                type="button"
                className="field__toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {isSignup && password.length > 0 && !passwordValid && (
              <span className="field__hint field__hint--error">Use 8+ characters with a capital letter, number and symbol.</span>
            )}
          </div>

          {formError && (
            <div className="authcard__error" role="alert">
              {formError}
            </div>
          )}

          <button type="submit" className="btn btn--primary btn--full" disabled={!canSubmit}>
            {submitting ? <span className="spinner spinner--btn" aria-hidden="true" /> : null}
            {submitting
              ? isSignup ? "Creating account..." : "Signing in..."
              : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="authcard__foot">
          {isSignup
            ? "This first account becomes the platform admin and gets access to every GIS module."
            : adminExists === false
              ? "No master account yet? Use Create account once, then come back here to sign in."
              : "Don't have an account? Ask your administrator to create one for you in the Admin Panel."}
        </p>
      </div>
    </div>
  );
}
