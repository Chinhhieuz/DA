import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

interface AppViewRoutesProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
  homeElement: ReactNode;
  searchElement: ReactNode;
  profileElement: ReactNode;
  createElement: ReactNode;
  messagesElement: ReactNode;
  notificationsElement: ReactNode;
  settingsElement: ReactNode;
  adminElement: ReactNode;
  savedElement: ReactNode;
}

const RequireAuth = ({ isAuthenticated, children }: { isAuthenticated: boolean; children: ReactNode }) => {
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const RequireAdmin = ({ isAuthenticated, isAdmin, children }: { isAuthenticated: boolean; isAdmin: boolean; children: ReactNode }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export function AppViewRoutes({
  isAuthenticated,
  isAdmin,
  homeElement,
  searchElement,
  profileElement,
  createElement,
  messagesElement,
  notificationsElement,
  settingsElement,
  adminElement,
  savedElement
}: AppViewRoutesProps) {
  return (
    <Routes>
      <Route path="/" element={homeElement} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="/search" element={searchElement} />
      <Route path="/profile" element={<RequireAuth isAuthenticated={isAuthenticated}>{profileElement}</RequireAuth>} />
      <Route path="/profile/:userId" element={<RequireAuth isAuthenticated={isAuthenticated}>{profileElement}</RequireAuth>} />
      <Route path="/create" element={<RequireAuth isAuthenticated={isAuthenticated}>{createElement}</RequireAuth>} />
      <Route path="/messages" element={<RequireAuth isAuthenticated={isAuthenticated}>{messagesElement}</RequireAuth>} />
      <Route path="/notifications" element={<RequireAuth isAuthenticated={isAuthenticated}>{notificationsElement}</RequireAuth>} />
      <Route path="/settings" element={<RequireAuth isAuthenticated={isAuthenticated}>{settingsElement}</RequireAuth>} />
      <Route path="/saved" element={<RequireAuth isAuthenticated={isAuthenticated}>{savedElement}</RequireAuth>} />
      <Route path="/admin" element={<RequireAdmin isAuthenticated={isAuthenticated} isAdmin={isAdmin}>{adminElement}</RequireAdmin>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
