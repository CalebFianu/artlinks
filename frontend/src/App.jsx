import { Route, Routes } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import CollectionsPage from './pages/CollectionsPage';
import FeaturedPage from './pages/FeaturedPage';
import DailyPage from './pages/DailyPage';
import PublicProfilePage from './pages/PublicProfilePage';
import AccountPage from './pages/AccountPage';
import AdminPage from './pages/AdminPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

export default function App() {
  return (
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
        <Route path="/account" element={<AccountPage />} />
      </Route>

      {/* Admin-only routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Public profile — no auth required; must come after named routes */}
      <Route path="/:username" element={<PublicProfilePage />} />
    </Routes>
  );
}
