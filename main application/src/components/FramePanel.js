import { useEffect, useRef, useState } from "react";
import { IconExternal } from "./Icons";

// Render.com free-tier apps spin down after inactivity, so a cold start can
// take 30s+ to respond. We give it generous time before assuming the embed is
// actually blocked (e.g. by X-Frame-Options / frame-ancestors) rather than
// just slow waking up.
const BLOCK_TIMEOUT_MS = 20000;

export default function FramePanel({ module, src, ssoError, onRetry }) {
  const [status, setStatus] = useState("loading"); // loading | loaded | blocked
  const [reloadKey, setReloadKey] = useState(0);
  const timerRef = useRef(null);
  const effectiveSrc = src || module.url;

  useEffect(() => {
    if (ssoError) return;
    setStatus("loading");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStatus((s) => (s === "loaded" ? s : "blocked"));
    }, BLOCK_TIMEOUT_MS);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module.id, reloadKey, effectiveSrc, ssoError]);

  const handleLoad = () => {
    clearTimeout(timerRef.current);
    setStatus("loaded");
  };

  // For SSO-backed modules, the src we have is a one-time authorization
  // code — it's already been consumed by the load that just failed/timed
  // out, so simply remounting the same iframe with the same src always
  // fails with "Sign-in link expired or already used." Ask the parent for a
  // fresh code first; effectiveSrc changing once it arrives is what
  // actually remounts the iframe. Non-SSO modules have no code to burn, so
  // just force a reload directly.
  const handleRetry = () => {
    if (module.appId && onRetry) {
      onRetry();
    } else {
      setReloadKey((k) => k + 1);
    }
  };

  return (
    <div className="framepanel">
      {/* <div className="framepanel__bar">
        <div className="framepanel__info">
          <span className="framepanel__code">{module.code}</span>
          <span className="framepanel__name">{module.name}</span>
        </div>
        <div className="framepanel__actions">
          <button className="btn btn--ghost btn--sm" onClick={handleRetry} title="Reload module">
            <IconRefresh width={15} height={15} />
          </button>
          <a
            className="btn btn--ghost btn--sm"
            href={module.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in a new tab"
          >
            <IconExternal width={15} height={15} />
            <span>New tab</span>
          </a>
        </div>
      </div> */}

      <div className="framepanel__stage">
        {ssoError ? (
          <div className="framepanel__overlay">
            <p>Can't open {module.name}.</p>
            <p className="muted">{ssoError}</p>
          </div>
        ) : (
          <>
            {status !== "loaded" && (
              <div className="framepanel__overlay">
                {status === "loading" && (
                  <>
                    <span className="spinner" />
                    <p>Waking up {module.name}…</p>
                    <p className="muted">First load can be slow if the module has been idle.</p>
                  </>
                )}
                {status === "blocked" && (
                  <>
                    <p>{module.name} can't be embedded here.</p>
                    <p className="muted">
                      The app may restrict being shown inside another page. Open it directly instead.
                    </p>
                    <div className="framepanel__overlayActions">
                      <a className="btn btn--primary" href={effectiveSrc} target="_blank" rel="noopener noreferrer">
                        Open {module.name} <IconExternal width={14} height={14} />
                      </a>
                      <button className="btn btn--ghost" onClick={handleRetry}>
                        Try again
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            <iframe
              key={`${reloadKey}-${effectiveSrc}`}
              title={module.name}
              src={effectiveSrc}
              className="framepanel__iframe"
              onLoad={handleLoad}
              referrerPolicy="no-referrer-when-downgrade"
              allow="geolocation *; camera *; microphone *; fullscreen *; display-capture *"
            />
          </>
        )}
      </div>
    </div>
  );
}
