import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Avatar,
  Chip,
  Tabs,
  Tab,
  TextField,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
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

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ProfileDialog = ({ open, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: usersApi.getMe,
    enabled: open,
  });

  // ── Форма редактирования имени ─────────────────────────────────────────────
  const [name, setName] = useState('');
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setName(profile.name ?? '');
  }, [profile]);

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

  // ── Форма смены пароля ─────────────────────────────────────────────────────
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

  const handleClose = () => {
    setTab(0);
    setNameSuccess(false);
    setNameError(null);
    setPwSuccess(false);
    setPwError(null);
    setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      {/* ── Заголовок: аватар + имя + роль + вкладки ───────────────────────── */}
      <DialogTitle
        component="div"
        sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? '#151b2d' : '#f1f5f9', pb: 0, borderBottom: '1px solid', borderBottomColor: 'divider' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          {isLoading ? (
            <CircularProgress size={20} sx={{ mt: 0.5 }} />
          ) : profile ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.dark',
                  fontSize: 16,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {profile.username.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                  {profile.username}
                </Typography>
                <Chip
                  label={profile.role === 'ADMIN' ? 'Администратор' : 'Пользователь'}
                  size="small"
                  color={profile.role === 'ADMIN' ? 'primary' : 'default'}
                  variant="outlined"
                  sx={{ fontSize: 10, height: 18, mt: 0.25 }}
                />
              </Box>
            </Box>
          ) : null}

          <IconButton
            size="small"
            onClick={handleClose}
            sx={{ color: 'text.secondary', mt: -0.5, mr: -0.5, '&:hover': { color: 'text.primary' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          sx={{
            '& .MuiTab-root': { textTransform: 'none', fontSize: 13, minHeight: 40, py: 0 },
            '& .MuiTabs-indicator': { height: 2 },
          }}
        >
          <Tab label="Профиль" />
          <Tab label="Безопасность" />
        </Tabs>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: 'background.paper', pt: 2.5, pb: 3 }}>
        {/* ── Вкладка «Профиль» ──────────────────────────────────────────────── */}
        {tab === 0 && !isLoading && profile && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.6 }}
              >
                Логин
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', mt: 0.25, color: 'text.primary' }}
              >
                {profile.username}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Логин изменить нельзя
              </Typography>
            </Box>

            <Divider />

            {nameSuccess && (
              <Alert severity="success" sx={{ py: 0.5 }} onClose={() => setNameSuccess(false)}>
                Имя обновлено
              </Alert>
            )}
            {nameError && (
              <Alert severity="error" sx={{ py: 0.5 }} onClose={() => setNameError(null)}>
                {nameError}
              </Alert>
            )}

            <TextField
              label="Отображаемое имя"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameSuccess(false);
              }}
              fullWidth
              size="small"
            />

            <Button
              variant="contained"
              size="small"
              onClick={() => nameMutation.mutate()}
              disabled={nameMutation.isPending || !name.trim() || name === profile.name}
              sx={{ alignSelf: 'flex-start' }}
            >
              {nameMutation.isPending ? <CircularProgress size={16} /> : 'Сохранить'}
            </Button>
          </Box>
        )}

        {/* ── Вкладка «Безопасность» ─────────────────────────────────────────── */}
        {tab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {pwSuccess && (
              <Alert severity="success" sx={{ py: 0.5 }} onClose={() => setPwSuccess(false)}>
                Пароль изменён
              </Alert>
            )}
            {pwError && (
              <Alert severity="error" sx={{ py: 0.5 }} onClose={() => setPwError(null)}>
                {pwError}
              </Alert>
            )}

            <TextField
              label="Текущий пароль"
              type="password"
              value={pwForm.oldPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, oldPassword: e.target.value }))}
              fullWidth
              size="small"
              autoComplete="current-password"
            />
            <TextField
              label="Новый пароль"
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
              fullWidth
              size="small"
              helperText="Не менее 6 символов"
              error={pwForm.newPassword.length > 0 && pwForm.newPassword.length < 6}
              autoComplete="new-password"
            />
            <TextField
              label="Подтверждение пароля"
              type="password"
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              fullWidth
              size="small"
              error={
                pwForm.confirmPassword.length > 0 &&
                pwForm.newPassword !== pwForm.confirmPassword
              }
              helperText={
                pwForm.confirmPassword.length > 0 &&
                pwForm.newPassword !== pwForm.confirmPassword
                  ? 'Пароли не совпадают'
                  : ''
              }
              autoComplete="new-password"
            />

            <Button
              variant="contained"
              size="small"
              onClick={() => pwMutation.mutate()}
              disabled={pwMutation.isPending || !pwValid}
              sx={{ alignSelf: 'flex-start' }}
            >
              {pwMutation.isPending ? <CircularProgress size={16} /> : 'Изменить пароль'}
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};