import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AuthorizedPage from './pages/AuthorizedPage';

interface AuthorizedPageProps {
  displayName: string;
  avatarUrl: string;
}

const ProtectedRoute = ({ children }: { children: ReactElement }): ReactElement => {
  const location = useLocation();
  const state = location.state as AuthorizedPageProps;

  const isAuthorized = typeof state?.displayName === 'string' && state.displayName.length > 0 &&
    typeof state?.avatarUrl === 'string' && state.avatarUrl.length > 0;

  if (!isAuthorized) {
    return <Navigate to="/" replace />
  }

  return children;
}

function App(): ReactElement {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/authorized" element={
          <ProtectedRoute>
            <AuthorizedPage />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
