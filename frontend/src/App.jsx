import { useState, useEffect, useCallback } from 'react';
import { Route, Routes } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import RateLimitBanner from './components/RateLimitBanner';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import CollectionsPage from './pages/CollectionsPage';
import FeaturedPage from './pages/FeaturedPage';
import DailyPage from './pages/DailyPage';
import SocialsPage from './pages/SocialsPage';
import PublicProfilePage from './pages/PublicProfilePage';
import AccountPage from './pages/AccountPage';
import AdminPage from './pages/AdminPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

export default function App() {
  const [rateLimit, setRateLimit] = useState(null);

  useEffect(() => {
    const handler = (e) => setRateLimit({ retryAfter: e.detail?.retryAfter ?? null });
    window.addEventListener('artlinks:ratelimit', handler);
    return () => window.removeEventListener('artlinks:ratelimit', handler);
  }, []);

  const dismissRateLimit = useCallback(() => setRateLimit(null), []);

  return (
    <>
      {rateLimit && (
        <RateLimitBanner retryAfter={rateLimit.retryAfter} onDismiss={dismissRateLimit} />
      )}
      <Routes>
      {/* Landing — redirects to /dashboard if already logged in */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth — password reset (public) */}
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected app routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/featured" element={<FeaturedPage />} />
        <Route path="/daily" element={<DailyPage />} />
        <Route path="/socials" element={<SocialsPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>

      {/* Admin-only routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Public profile — no auth required; must come after named routes */}
      <Route path="/:username" element={<PublicProfilePage />} />
    </Routes>
    </>
  );
}
