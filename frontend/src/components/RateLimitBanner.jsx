import { useEffect, useRef } from 'react';

function formatRetry(seconds) {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.ceil(seconds / 60);
  return `${mins} minute${mins !== 1 ? 's' : ''}`;
}

export default function RateLimitBanner({ retryAfter, onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timerRef.current);
  }, [onDismiss]);

  const retry = formatRetry(retryAfter);

  return (
    <div className="rate-limit-banner" role="alert" aria-live="assertive">
      <div className="rate-limit-banner__inner">
        <span className="rate-limit-banner__icon">⏱</span>
        <div className="rate-limit-banner__text">
          <strong>Too many requests</strong>
          <span>
            {retry
              ? `Please wait ${retry} before trying again.`
              : 'Please slow down and try again in a moment.'}
          </span>
        </div>
        <button
          className="rate-limit-banner__close"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
