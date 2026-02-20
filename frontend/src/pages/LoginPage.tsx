import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { authApi } from '@/services/api/authApi';
import { useAuthStore } from '@/stores/authStore';

type TabValue = 'login' | 'register';

const getErrorMessage = (err: unknown, isLogin: boolean): string => {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (isLogin) {
      if (status === 401 || status === 403) return 'Неверный логин или пароль';
    } else {
      if (status === 409) return 'Пользователь с таким именем уже существует';
      const msg = (err.response?.data as { message?: string })?.message;
      if (msg) return msg;
    }
    if (status && status >= 500) return 'Ошибка сервера, попробуйте позже';
  }
  if (!navigator.onLine) return 'Нет подключения к сети';
  return 'Не удалось подключиться к серверу';
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const setTokens = useAuthStore((state) => state.setTokens);

  const [tab, setTab] = useState<TabValue>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', name: '' });

  const handleTabChange = (_: React.SyntheticEvent, value: TabValue) => {
    setTab(value);
    setError(null);
  };

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) return;
    setLoading(true);
    setError(null);
    try {
      const tokens = await authApi.login(loginForm);
      setTokens(tokens.accessToken, tokens.refreshToken);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, true));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.username || !registerForm.password || !registerForm.name) return;
    setLoading(true);
    setError(null);
    try {
      const tokens = await authApi.register(registerForm);
      setTokens(tokens.accessToken, tokens.refreshToken);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, false));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        {/* Логотип */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, justifyContent: 'center' }}>
          <TerminalIcon sx={{ color: 'primary.main', fontSize: 34 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
            HPC Portal
          </Typography>
        </Box>

        <Card sx={{ bgcolor: 'background.paper', border: '1px solid #2d3748' }}>
          <CardContent sx={{ p: 0 }}>
            <Tabs
              value={tab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                borderBottom: '1px solid #2d3748',
                '& .MuiTab-root': { fontWeight: 500, fontSize: 14, py: 1.5 },
              }}
            >
              <Tab value="login" label="Вход" />
              <Tab value="register" label="Регистрация" />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {tab === 'login' ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Имя пользователя"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
                    fullWidth
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                  <TextField
                    label="Пароль"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                    fullWidth
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleLogin}
                    disabled={loading || !loginForm.username || !loginForm.password}
                    sx={{ mt: 0.5 }}
                  >
                    {loading ? <CircularProgress size={22} color="inherit" /> : 'Войти'}
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Отображаемое имя"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))}
                    fullWidth
                    autoFocus
                  />
                  <TextField
                    label="Имя пользователя"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, username: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Пароль"
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))}
                    fullWidth
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleRegister}
                    disabled={
                      loading ||
                      !registerForm.username ||
                      !registerForm.password ||
                      !registerForm.name
                    }
                    sx={{ mt: 0.5 }}
                  >
                    {loading ? <CircularProgress size={22} color="inherit" /> : 'Создать аккаунт'}
                  </Button>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};