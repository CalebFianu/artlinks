import { Route, Routes } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import CollectionsPage from './pages/CollectionsPage';
import FeaturedPage from './pages/FeaturedPage';
import DailyPage from './pages/DailyPage';
import PublicProfilePage from './pages/PublicProfilePage';

export default function App() {
  return (
    <Routes>
      {/* Landing — redirects to /dashboard if already logged in */}
      <Route path="/" element={<LandingPage />} />

      {/* Protected app routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/featured" element={<FeaturedPage />} />
        <Route path="/daily" element={<DailyPage />} />
      </Route>

      {/* Public profile — no auth required; must come after named routes */}
      <Route path="/:username" element={<PublicProfilePage />} />
    </Routes>
  );
}
