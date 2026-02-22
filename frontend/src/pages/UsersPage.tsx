import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { usersApi } from '@/services/api/usersApi';
import { validateUsername } from '@/utils/validation';
import type {
  UserDto,
  AdminUserCreateRequest,
  AdminUserUpdateRequest,
} from '@/types/user.types';
import { useAuthStore } from '@/stores/authStore';

// ─── Диалог создания пользователя ────────────────────────────────────────────

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: AdminUserCreateRequest) => void;
  loading: boolean;
  error: string | null;
}

const CreateUserDialog = ({ open, onClose, onSave, loading, error }: CreateDialogProps) => {
  const [form, setForm] = useState<AdminUserCreateRequest>({
    username: '',
    password: '',
    name: '',
    role: 'REGULAR',
  });
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const handleClose = () => {
    setForm({ username: '', password: '', name: '', role: 'REGULAR' });
    setUsernameError(null);
    onClose();
  };

  const usernameInvalid = !!validateUsername(form.username);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1a2035', borderBottom: '1px solid #2d3748' }}>
        Создать пользователя
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#1a2035', pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        <TextField
          label="Отображаемое имя"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          fullWidth size="small" sx={{ mt: 1 }}
        />
        <TextField
          label="Имя пользователя (логин)"
          value={form.username}
          onChange={(e) => {
            const v = e.target.value;
            setForm((f) => ({ ...f, username: v }));
            setUsernameError(v ? validateUsername(v) : null);
          }}
          onBlur={() => form.username && setUsernameError(validateUsername(form.username))}
          error={!!usernameError}
          helperText={usernameError ?? '2–32 символа: строчные буквы, цифры, _ или -'}
          fullWidth size="small"
        />
        <TextField
          label="Пароль"
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          fullWidth size="small"
        />
        <FormControl size="small" fullWidth>
          <InputLabel>Роль</InputLabel>
          <Select
            value={form.role}
            label="Роль"
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'REGULAR' | 'ADMIN' }))}
          >
            <MenuItem value="REGULAR">Пользователь</MenuItem>
            <MenuItem value="ADMIN">Администратор</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#1a2035', borderTop: '1px solid #2d3748', px: 2, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading} sx={{ color: 'text.secondary' }}>Отмена</Button>
        <Button
          variant="contained"
          onClick={() => onSave(form)}
          disabled={loading || !form.username || !form.password || !form.name || usernameInvalid}
        >
          {loading ? <CircularProgress size={18} /> : 'Создать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Диалог редактирования пользователя ──────────────────────────────────────

interface EditDialogProps {
  user: UserDto | null;
  onClose: () => void;
  onSave: (username: string, data: AdminUserUpdateRequest) => void;
  loading: boolean;
  error: string | null;
}

const EditUserDialog = ({ user, onClose, onSave, loading, error }: EditDialogProps) => {
  const [form, setForm] = useState<AdminUserUpdateRequest>({
    name: user?.name ?? '',
    role: user?.role ?? 'REGULAR',
  });

  if (!user) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1a2035', borderBottom: '1px solid #2d3748' }}>
        Редактировать: {user.username}
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#1a2035', pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        <TextField
          label="Отображаемое имя"
          value={form.name ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          fullWidth size="small" sx={{ mt: 1 }}
        />
        <FormControl size="small" fullWidth>
          <InputLabel>Роль</InputLabel>
          <Select
            value={form.role ?? 'REGULAR'}
            label="Роль"
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'REGULAR' | 'ADMIN' }))}
          >
            <MenuItem value="REGULAR">Пользователь</MenuItem>
            <MenuItem value="ADMIN">Администратор</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Логин (изменить нельзя)"
          value={user.username}
          disabled
          fullWidth size="small"
        />
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#1a2035', borderTop: '1px solid #2d3748', px: 2, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: 'text.secondary' }}>Отмена</Button>
        <Button
          variant="contained"
          onClick={() => onSave(user.username, form)}
          disabled={loading}
        >
          {loading ? <CircularProgress size={18} /> : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Диалог подтверждения удаления ───────────────────────────────────────────

interface DeleteDialogProps {
  user: UserDto | null;
  onClose: () => void;
  onConfirm: (username: string) => void;
  loading: boolean;
}

const DeleteUserDialog = ({ user, onClose, onConfirm, loading }: DeleteDialogProps) => {
  if (!user) return null;
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1a2035', borderBottom: '1px solid #2d3748' }}>
        Удалить пользователя
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#1a2035', pt: 2 }}>
        <Alert severity="warning" sx={{ mt: 1 }}>
          Вы уверены, что хотите удалить пользователя <strong>{user.username}</strong>?
          Это действие удалит Linux-аккаунт и рабочую директорию.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#1a2035', borderTop: '1px solid #2d3748', px: 2, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: 'text.secondary' }}>Отмена</Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => onConfirm(user.username)}
          disabled={loading}
        >
          {loading ? <CircularProgress size={18} /> : 'Удалить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Главная страница ─────────────────────────────────────────────────────────

const getApiError = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data !== null && 'message' in data) {
      return String((data as { message: string }).message);
    }
    if (err.response?.status === 409) return 'Пользователь с таким логином уже существует';
  }
  return 'Произошла ошибка';
};

export const UsersPage = () => {
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserDto | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserDto | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: usersApi.getAll,
  });

  const { data: regSetting, isLoading: regLoading } = useQuery({
    queryKey: ['registration-setting'],
    queryFn: usersApi.getRegistrationSetting,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => { setCreateOpen(false); setMutationError(null); invalidate(); },
    onError: (err) => setMutationError(getApiError(err)),
  });

  const editMutation = useMutation({
    mutationFn: ({ username, data }: { username: string; data: AdminUserUpdateRequest }) =>
      usersApi.update(username, data),
    onSuccess: () => { setEditUser(null); setMutationError(null); invalidate(); },
    onError: (err) => setMutationError(getApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.remove,
    onSuccess: () => { setDeleteUser(null); invalidate(); },
  });

  const regMutation = useMutation({
    mutationFn: usersApi.setRegistrationSetting,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['registration-setting'] }),
  });

  const handleOpenEdit = (user: UserDto) => {
    setMutationError(null);
    setEditUser(user);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Пользователи
      </Typography>

      {/* Панель управления */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setMutationError(null); setCreateOpen(true); }}
          size="small"
        >
          Добавить пользователя
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {regLoading
            ? <CircularProgress size={18} />
            : (
              <Paper sx={{ px: 2, py: 1, bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={regSetting?.enabled ?? true}
                      onChange={(e) => regMutation.mutate(e.target.checked)}
                      disabled={regMutation.isPending}
                      color="primary"
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Публичная регистрация
                    </Typography>
                  }
                />
              </Paper>
            )
          }
          <Tooltip title="Обновить">
            <IconButton size="small" onClick={() => void refetch()} sx={{ color: 'text.secondary' }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Таблица пользователей */}
      {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Ошибка загрузки пользователей</Alert>}

      {!isLoading && !isError && (
        <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#151b2d', color: 'text.secondary', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 } }}>
                <TableCell>Пользователь</TableCell>
                <TableCell>Имя</TableCell>
                <TableCell>Роль</TableCell>
                <TableCell>Создан</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  sx={{ '& td': { borderColor: '#2d3748', py: 1 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                      {user.username}
                    </Typography>
                    {user.username === currentUser?.username && (
                      <Typography variant="caption" sx={{ color: 'primary.main' }}>(вы)</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {user.name || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role === 'ADMIN' ? 'Администратор' : 'Пользователь'}
                      size="small"
                      color={user.role === 'ADMIN' ? 'primary' : 'default'}
                      variant="outlined"
                      sx={{ fontSize: 11, height: 22 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {formatDate(user.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Редактировать">
                      <IconButton size="small" onClick={() => handleOpenEdit(user)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Удалить">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => setDeleteUser(user)}
                          disabled={user.username === currentUser?.username}
                          sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Пользователи не найдены
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Диалоги */}
      <CreateUserDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); setMutationError(null); }}
        onSave={(data) => createMutation.mutate(data)}
        loading={createMutation.isPending}
        error={createOpen ? mutationError : null}
      />

      <EditUserDialog
        user={editUser}
        onClose={() => { setEditUser(null); setMutationError(null); }}
        onSave={(username, data) => editMutation.mutate({ username, data })}
        loading={editMutation.isPending}
        error={editUser ? mutationError : null}
      />

      <DeleteUserDialog
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={(username) => deleteMutation.mutate(username)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
};