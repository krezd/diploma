import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { theme } from '@/theme/theme';
import { useAuthStore } from '@/stores/authStore';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { FilesPage } from '@/pages/FilesPage';
import { ClusterPage } from '@/pages/ClusterPage';
import { UsersPage } from '@/pages/UsersPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import type { AuthTokens } from '@/types/auth.types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

/**
 * При перезагрузке страницы accessToken теряется (хранится только в памяти).
 * AuthInitializer проверяет наличие refreshToken в sessionStorage и автоматически
 * получает новую пару токенов перед рендером защищённых маршрутов.
 */
const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    void (async () => {
      const state = useAuthStore.getState();
      if (state.refreshToken && !state.accessToken) {
        try {
          const { data } = await axios.post<AuthTokens>(
            '/api' + API_ENDPOINTS.AUTH.REFRESH,
            { refreshToken: state.refreshToken }
          );
          state.setTokens(data.accessToken, data.refreshToken);
        } catch {
          state.logout();
        }
      }
      setInitialized(true);
    })();
  }, []);

  if (!initialized) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthInitializer>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="files" element={<FilesPage />} />
                {/* Следующие этапы */}
                <Route path="jobs" element={<Navigate to="/" replace />} />
                <Route path="cluster" element={<ClusterPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthInitializer>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;