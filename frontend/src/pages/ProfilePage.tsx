import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LockIcon from '@mui/icons-material/Lock';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { usersApi } from '@/services/api/usersApi';
import type { ChangePasswordRequest } from '@/types/user.types';

const getApiError = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (typeof data === 'string') return data;
  }
  return 'Произошла ошибка';
};

export const ProfilePage = () => {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: usersApi.getMe,
  });

  // ── Форма редактирования имени ──────────────────────────────────────────
  const [name, setName] = useState('');

  useEffect(() => {
    if (profile) setName(profile.name ?? '');
  }, [profile]);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const nameMutation = useMutation({
    mutationFn: () => usersApi.updateMe({ name }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      setName(updated.name);
      setNameSuccess(true);
      setNameError(null);
      setTimeout(() => setNameSuccess(false), 3000);
    },
    onError: (err) => {
      setNameError(getApiError(err));
      setNameSuccess(false);
    },
  });

  // ── Форма смены пароля ────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState<ChangePasswordRequest>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const pwMutation = useMutation({
    mutationFn: () => usersApi.changePassword(pwForm),
    onSuccess: () => {
      setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setPwSuccess(true);
      setPwError(null);
      setTimeout(() => setPwSuccess(false), 3000);
    },
    onError: (err) => {
      setPwError(getApiError(err));
      setPwSuccess(false);
    },
  });

  const pwValid =
    pwForm.oldPassword.length > 0 &&
    pwForm.newPassword.length >= 6 &&
    pwForm.newPassword === pwForm.confirmPassword;

  return (
    <Box sx={{ p: 3, maxWidth: 560 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Профиль
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {profile && (
        <>
          {/* ── Информация о профиле ─────────────────────────────────────── */}
          <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2, p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
              <AccountCircleIcon sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Основная информация
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Логин
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                    {profile.username}
                  </Typography>
                  <Chip
                    label={profile.role === 'ADMIN' ? 'Администратор' : 'Пользователь'}
                    size="small"
                    color={profile.role === 'ADMIN' ? 'primary' : 'default'}
                    variant="outlined"
                    sx={{ fontSize: 11, height: 20 }}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Логин изменить нельзя
                </Typography>
              </Box>

              <Divider sx={{ borderColor: '#2d3748' }} />

              {nameSuccess && (
                <Alert severity="success" onClose={() => setNameSuccess(false)}>
                  Имя успешно обновлено
                </Alert>
              )}
              {nameError && (
                <Alert severity="error" onClose={() => setNameError(null)}>
                  {nameError}
                </Alert>
              )}

              <TextField
                label="Отображаемое имя"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameSuccess(false); }}
                fullWidth
                size="small"
              />

              <Button
                variant="contained"
                onClick={() => nameMutation.mutate()}
                disabled={nameMutation.isPending || !name.trim() || name === profile.name}
                sx={{ alignSelf: 'flex-start' }}
                size="small"
              >
                {nameMutation.isPending ? <CircularProgress size={18} /> : 'Сохранить имя'}
              </Button>
            </Box>
          </Paper>

          {/* ── Смена пароля ─────────────────────────────────────────────── */}
          <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2, p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
              <LockIcon sx={{ color: 'text.secondary' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Смена пароля
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {pwSuccess && (
                <Alert severity="success" onClose={() => setPwSuccess(false)}>
                  Пароль успешно изменён
                </Alert>
              )}
              {pwError && (
                <Alert severity="error" onClose={() => setPwError(null)}>
                  {pwError}
                </Alert>
              )}

              <TextField
                label="Текущий пароль"
                type="password"
                value={pwForm.oldPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, oldPassword: e.target.value }))}
                fullWidth size="small"
              />
              <TextField
                label="Новый пароль"
                type="password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                fullWidth size="small"
                helperText="Не менее 6 символов"
                error={pwForm.newPassword.length > 0 && pwForm.newPassword.length < 6}
              />
              <TextField
                label="Подтверждение нового пароля"
                type="password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                fullWidth size="small"
                error={
                  pwForm.confirmPassword.length > 0 &&
                  pwForm.newPassword !== pwForm.confirmPassword
                }
                helperText={
                  pwForm.confirmPassword.length > 0 && pwForm.newPassword !== pwForm.confirmPassword
                    ? 'Пароли не совпадают'
                    : ''
                }
              />

              <Button
                variant="contained"
                onClick={() => pwMutation.mutate()}
                disabled={pwMutation.isPending || !pwValid || pwForm.newPassword !== pwForm.confirmPassword}
                sx={{ alignSelf: 'flex-start' }}
                size="small"
              >
                {pwMutation.isPending ? <CircularProgress size={18} /> : 'Изменить пароль'}
              </Button>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};