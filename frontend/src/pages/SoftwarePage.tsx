import { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, CircularProgress, Alert, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField, MenuItem, Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import SyncIcon from '@mui/icons-material/Sync';
import CodeIcon from '@mui/icons-material/Code';
import EditIcon from '@mui/icons-material/Edit';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { softwareApi } from '@/services/api/softwareApi';
import { useAuthStore } from '@/stores/authStore';
import type { SoftwarePackage, PackageStatus, RegisterSoftwareRequest, UpdateSoftwareRequest, ScanResult } from '@/types/software.types';

// ─── Константы ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PackageStatus, string> = {
  AVAILABLE: 'Доступно',
  DEPRECATED: 'Устарело',
  BROKEN: 'Неисправно',
  INSTALLING: 'Установка…',
};

const STATUS_COLORS: Record<PackageStatus, 'success' | 'warning' | 'error' | 'info'> = {
  AVAILABLE: 'success',
  DEPRECATED: 'warning',
  BROKEN: 'error',
  INSTALLING: 'info',
};

const TABLE_HEAD_SX = {
  '& th': {
    bgcolor: '#151b2d', color: 'text.secondary', fontSize: 12,
    fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.6,
  },
};
const TABLE_ROW_SX = {
  '& td': { borderColor: '#2d3748', py: 1 },
};

const CATEGORIES = ['interpreter', 'compiler', 'library', 'tool', 'mpi', 'math', 'other'];

// ─── ScanResultDialog ─────────────────────────────────────────────────────────

const ScanResultDialog = ({ result, onClose }: {
  result: { added: number; restored: number; markedBroken: number } | null;
  onClose: () => void;
}) => {
  if (!result) return null;
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1a2035', borderBottom: '1px solid #2d3748' }}>
        Результат сканирования
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#1a2035', pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Новых пакетов</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>{result.added}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Восстановлено</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main' }}>{result.restored}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Помечено неисправными</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>{result.markedBroken}</Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#1a2035', borderTop: '1px solid #2d3748', px: 2, pb: 2 }}>
        <Button variant="contained" onClick={onClose}>Готово</Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── RegisterDialog ───────────────────────────────────────────────────────────

const RegisterDialog = ({ open, onClose, onSubmit, loading }: {
  open: boolean; onClose: () => void;
  onSubmit: (req: RegisterSoftwareRequest) => void; loading: boolean;
}) => {
  const [form, setForm] = useState<RegisterSoftwareRequest>({
    name: '', version: '', category: '', description: '', moduleContent: '',
  });

  const handleChange = (field: keyof RegisterSoftwareRequest) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const valid = form.name.trim() && form.version.trim();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: '#1a2035', border: '1px solid #2d3748' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid #2d3748' }}>Зарегистрировать ПО</DialogTitle>
      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <TextField label="Имя *" size="small" fullWidth value={form.name}
            onChange={handleChange('name')} placeholder="python" />
          <TextField label="Версия *" size="small" fullWidth value={form.version}
            onChange={handleChange('version')} placeholder="3.9.18" />
        </Box>
        <TextField label="Категория" size="small" select fullWidth value={form.category}
          onChange={handleChange('category')}>
          <MenuItem value=""><em>Не указана</em></MenuItem>
          {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField label="Описание" size="small" fullWidth value={form.description}
          onChange={handleChange('description')} multiline rows={2} />
        <Divider sx={{ borderColor: '#2d3748' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Modulefile (необязательно — если уже существует в /shared/software/modules/, оставьте пустым)
        </Typography>
        <TextField label="Содержимое modulefile" size="small" fullWidth value={form.moduleContent}
          onChange={handleChange('moduleContent')} multiline rows={6}
          inputProps={{ sx: { fontFamily: 'monospace', fontSize: 12 } }}
          placeholder={'#%Module1.0\nset root /shared/software/python/3.9.18\nprepend-path PATH $root/bin'} />
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid #2d3748', px: 2, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Отмена</Button>
        <Button variant="contained" disabled={!valid || loading}
          onClick={() => onSubmit(form)}>
          {loading ? <CircularProgress size={18} /> : 'Зарегистрировать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── UploadDialog ─────────────────────────────────────────────────────────────

const UploadDialog = ({ open, onClose, onSubmit, loading }: {
  open: boolean; onClose: () => void;
  onSubmit: (fd: FormData) => void; loading: boolean;
}) => {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [binaryPath, setBinaryPath] = useState('bin');
  const [libPath, setLibPath] = useState('lib');
  const [installScript, setInstallScript] = useState('');
  const [moduleContent, setModuleContent] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const valid = name.trim() && version.trim() && file;

  const handleSubmit = () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', name);
    fd.append('version', version);
    if (category) fd.append('category', category);
    if (description) fd.append('description', description);
    if (binaryPath) fd.append('binaryPath', binaryPath);
    if (libPath) fd.append('libPath', libPath);
    if (installScript.trim()) fd.append('installScript', installScript);
    if (moduleContent.trim()) fd.append('moduleContent', moduleContent);
    onSubmit(fd);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: '#1a2035', border: '1px solid #2d3748' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid #2d3748' }}>Загрузить ПО</DialogTitle>
      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <TextField label="Имя *" size="small" fullWidth value={name}
            onChange={(e) => setName(e.target.value)} placeholder="python" />
          <TextField label="Версия *" size="small" fullWidth value={version}
            onChange={(e) => setVersion(e.target.value)} placeholder="3.9.18" />
        </Box>
        <TextField label="Категория" size="small" select fullWidth value={category}
          onChange={(e) => setCategory(e.target.value)}>
          <MenuItem value=""><em>Не указана</em></MenuItem>
          {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField label="Описание" size="small" fullWidth value={description}
          onChange={(e) => setDescription(e.target.value)} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField label="Путь к бинарникам" size="small" fullWidth value={binaryPath}
            onChange={(e) => setBinaryPath(e.target.value)} placeholder="bin" />
          <TextField label="Путь к библиотекам" size="small" fullWidth value={libPath}
            onChange={(e) => setLibPath(e.target.value)} placeholder="lib" />
        </Box>
        <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}
          sx={{ borderColor: '#2d3748', color: 'text.secondary', justifyContent: 'flex-start' }}>
          {file ? file.name : 'Выбрать архив * (.zip, .tar.gz, .tar.bz2, .tar.xz)'}
          <input type="file" hidden accept=".zip,.tar.gz,.tgz,.tar.bz2,.tar.xz"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Button>
        {name && version && (
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: -1 }}>
            Будет распакован в /shared/software/{name}/{version}/
          </Typography>
        )}
        <Divider sx={{ borderColor: '#2d3748' }} />
        <TextField
          label="Пост-установочный скрипт (bash, необязательно)"
          size="small" fullWidth multiline rows={5}
          value={installScript} onChange={(e) => setInstallScript(e.target.value)}
          inputProps={{ sx: { fontFamily: 'monospace', fontSize: 12 } }}
          placeholder={'#!/bin/bash\n# Доступные переменные: $PACKAGE_DIR, $MODULES_DIR\nchmod +x $PACKAGE_DIR/bin/*'} />
        <TextField
          label="Пользовательский modulefile (необязательно — если пусто, генерируется автоматически)"
          size="small" fullWidth multiline rows={7}
          value={moduleContent} onChange={(e) => setModuleContent(e.target.value)}
          inputProps={{ sx: { fontFamily: 'monospace', fontSize: 12 } }}
          placeholder={'#%Module1.0\nset root /shared/software/python/3.9.18\nprepend-path PATH $root/bin'} />
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid #2d3748', px: 2, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Отмена</Button>
        <Button variant="contained" disabled={!valid || loading} onClick={handleSubmit}>
          {loading ? <CircularProgress size={18} /> : 'Загрузить и установить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── EditDialog ───────────────────────────────────────────────────────────────

const EditDialog = ({ pkg, onClose, onSubmit, loading }: {
  pkg: SoftwarePackage | null; onClose: () => void;
  onSubmit: (id: number, req: UpdateSoftwareRequest) => void; loading: boolean;
}) => {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [installedBy, setInstalledBy] = useState('');

  // Инициализируем поля при открытии
  const prevId = pkg?.id;
  if (pkg && pkg.id !== prevId) {
    setCategory(pkg.category ?? '');
    setDescription(pkg.description ?? '');
    setInstalledBy(pkg.installedBy ?? '');
  }

  if (!pkg) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: '#1a2035', border: '1px solid #2d3748' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid #2d3748' }}>
        Редактировать — {pkg.name}/{pkg.version}
      </DialogTitle>
      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2}}>
        <TextField label="Категория" size="small" select fullWidth
          defaultValue={pkg.category ?? ''}
          onChange={(e) => setCategory(e.target.value)} sx={{ mt: 1 }} >
          <MenuItem value=""><em>Не указана</em></MenuItem>
          {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField label="Описание" size="small" fullWidth multiline rows={3}
          defaultValue={pkg.description ?? ''}
          onChange={(e) => setDescription(e.target.value)} />
        <TextField label="Установил" size="small" fullWidth
          defaultValue={pkg.installedBy ?? ''}
          onChange={(e) => setInstalledBy(e.target.value)} />
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid #2d3748', px: 2, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Отмена</Button>
        <Button variant="contained" disabled={loading}
          onClick={() => onSubmit(pkg.id, {
            category: category || undefined,
            description: description || undefined,
            installedBy: installedBy || undefined,
          })}>
          {loading ? <CircularProgress size={18} /> : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── ModulefileDialog ─────────────────────────────────────────────────────────

const ModulefileDialog = ({ pkg, onClose }: { pkg: SoftwarePackage | null; onClose: () => void }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['modulefile', pkg?.id],
    queryFn: () => softwareApi.getModulefile(pkg!.id),
    enabled: !!pkg,
  });

  if (!pkg) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: '#1a2035', border: '1px solid #2d3748' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid #2d3748', display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Modulefile — {pkg.name}/{pkg.version}</Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <Box component="pre" sx={{
            m: 0, p: 2, bgcolor: '#0d1117', borderRadius: 1, overflow: 'auto',
            fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0',
            border: '1px solid #2d3748', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {data?.content || '— файл не найден —'}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid #2d3748', px: 2, pb: 2 }}>
        <Button onClick={onClose} variant="contained">Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── DeleteDialog ─────────────────────────────────────────────────────────────

const DeleteDialog = ({ pkg, onClose, onConfirm, loading }: {
  pkg: SoftwarePackage | null; onClose: () => void;
  onConfirm: (id: number, deleteFiles: boolean) => void; loading: boolean;
}) => {
  const [deleteFiles, setDeleteFiles] = useState(false);
  if (!pkg) return null;
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1a2035', borderBottom: '1px solid #2d3748' }}>
        Удалить {pkg.name}/{pkg.version}?
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#1a2035', pt: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Пакет будет удалён из базы данных.
        </Alert>
        <Button
          variant={deleteFiles ? 'contained' : 'outlined'} color="error" size="small"
          onClick={() => setDeleteFiles((v) => !v)}
          sx={{ fontSize: 12 }}>
          {deleteFiles ? '✓ Удалить файлы с диска' : 'Удалить файлы с диска'}
        </Button>
        {deleteFiles && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'error.main' }}>
            Директория {pkg.installPath} и modulefile будут удалены!
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#1a2035', borderTop: '1px solid #2d3748', px: 2, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Отмена</Button>
        <Button variant="contained" color="error" disabled={loading}
          onClick={() => onConfirm(pkg.id, deleteFiles)}>
          {loading ? <CircularProgress size={18} /> : 'Удалить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── SoftwarePage ─────────────────────────────────────────────────────────────

export const SoftwarePage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<PackageStatus | ''>('');

  const [scanResult, setScanResult] = useState<{ added: number; restored: number; markedBroken: number } | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editPkg, setEditPkg] = useState<SoftwarePackage | null>(null);
  const [modulefilePkg, setModulefilePkg] = useState<SoftwarePackage | null>(null);
  const [deletePkg, setDeletePkg] = useState<SoftwarePackage | null>(null);

  const queryKey = ['software'];
  const { data, isLoading, isError, refetch } = useQuery<SoftwarePackage[]>({
    queryKey,
    queryFn: () => softwareApi.getAll(),
  });

  const scanMutation = useMutation<ScanResult, Error>({
    mutationFn: () => softwareApi.scan(),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['software'] });
      setScanResult(result);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (req: RegisterSoftwareRequest) => softwareApi.register(req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['software'] });
      setRegisterOpen(false);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (fd: FormData) => softwareApi.upload(fd),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['software'] });
      setUploadOpen(false);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, req }: { id: number; req: UpdateSoftwareRequest }) =>
      softwareApi.updateMetadata(id, req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['software'] });
      setEditPkg(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, deleteFiles }: { id: number; deleteFiles: boolean }) =>
      softwareApi.delete(id, deleteFiles),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['software'] });
      setDeletePkg(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: PackageStatus }) =>
      softwareApi.updateStatus(id, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const packages = useMemo(() => {
    let result = data ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.version.toLowerCase().includes(q) ||
          (p.category ?? '').toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q),
      );
    }
    if (filterStatus) result = result.filter((p) => p.status === filterStatus);
    return result;
  }, [data, search, filterStatus]);

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error">Ошибка загрузки списка ПО</Alert>;

  return (
    <Box sx={{ p: 3 }}>
      {/* Заголовок */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Программное обеспечение</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Модули загружены из /shared/software/modules/ · {(data ?? []).length} пакетов
          </Typography>
        </Box>
        {isAdmin && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Сканировать папку модулей и обновить БД">
              <Button variant="outlined" startIcon={<SyncIcon />}
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending}
                sx={{ borderColor: '#2d3748', color: 'text.secondary' }}>
                {scanMutation.isPending ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                Сканировать
              </Button>
            </Tooltip>
            <Button variant="outlined" startIcon={<AddIcon />}
              onClick={() => setRegisterOpen(true)}
              sx={{ borderColor: '#2d3748', color: 'text.secondary' }}>
              Зарегистрировать
            </Button>
            <Button variant="contained" startIcon={<UploadFileIcon />}
              onClick={() => setUploadOpen(true)}>
              Загрузить ПО
            </Button>
          </Box>
        )}
      </Box>

      {/* Фильтры */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField size="small" placeholder="Поиск по имени, версии, категории…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 0.5, fontSize: 18 }} /> }}
          sx={{ flex: 1, maxWidth: 400 }} />
        <TextField size="small" select label="Статус" value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as PackageStatus | '')}
          sx={{ minWidth: 160 }}>
          <MenuItem value="">Все</MenuItem>
          {(Object.keys(STATUS_LABELS) as PackageStatus[]).map((s) => (
            <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>
          ))}
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Обновить">
          <IconButton size="small" onClick={() => void refetch()} sx={{ color: 'text.secondary' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Таблица */}
      <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={TABLE_HEAD_SX}>
              <TableCell>Имя</TableCell>
              <TableCell>Версия</TableCell>
              <TableCell>Категория</TableCell>
              <TableCell>Описание</TableCell>
              <TableCell>Статус</TableCell>
              {isAdmin && <TableCell>Установил</TableCell>}
              {isAdmin && <TableCell align="right">Действия</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {packages.map((pkg) => (
              <TableRow key={pkg.id} sx={TABLE_ROW_SX}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {pkg.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                    {pkg.version}
                  </Typography>
                </TableCell>
                <TableCell>
                  {pkg.category && (
                    <Chip label={pkg.category} size="small" variant="outlined"
                      sx={{ fontSize: 11, height: 20, color: 'text.secondary', borderColor: '#2d3748' }} />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {pkg.description ?? '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={STATUS_LABELS[pkg.status]}
                    size="small"
                    color={STATUS_COLORS[pkg.status]}
                    variant="outlined"
                    sx={{ fontSize: 11, height: 20 }}
                  />
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {pkg.installedBy ?? '—'}
                    </Typography>
                  </TableCell>
                )}
                {isAdmin && (
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="Редактировать метаданные">
                        <IconButton size="small" onClick={() => setEditPkg(pkg)}
                          sx={{ color: 'text.secondary', '&:hover': { color: 'info.main' } }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Просмотр modulefile">
                        <IconButton size="small" onClick={() => setModulefilePkg(pkg)}
                          sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                          <CodeIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {pkg.status === 'AVAILABLE' && (
                        <Tooltip title="Пометить устаревшим">
                          <IconButton size="small"
                            onClick={() => statusMutation.mutate({ id: pkg.id, status: 'DEPRECATED' })}
                            sx={{ color: 'text.secondary', '&:hover': { color: 'warning.main' } }}>
                            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700 }}>DEP</Typography>
                          </IconButton>
                        </Tooltip>
                      )}
                      {(pkg.status === 'DEPRECATED' || pkg.status === 'BROKEN') && (
                        <Tooltip title="Восстановить (Available)">
                          <IconButton size="small"
                            onClick={() => statusMutation.mutate({ id: pkg.id, status: 'AVAILABLE' })}
                            sx={{ color: 'text.secondary', '&:hover': { color: 'success.main' } }}>
                            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700 }}>OK</Typography>
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Удалить">
                        <IconButton size="small" onClick={() => setDeletePkg(pkg)}
                          sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {packages.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 5} align="center"
                  sx={{ py: 6, color: 'text.secondary' }}>
                  {search || filterStatus ? 'Ничего не найдено' : 'Нет зарегистрированного ПО. Нажмите «Сканировать» для обнаружения модулей.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Подсказка для пользователей */}
      {!isAdmin && packages.length > 0 && (
        <Alert severity="info" sx={{ mt: 2, bgcolor: '#1a2035', border: '1px solid #2d3748' }}>
          Для использования ПО в задании добавьте в скрипт: <code>module load &lt;имя&gt;/&lt;версия&gt;</code>
        </Alert>
      )}

      {/* Диалоги */}
      <ScanResultDialog result={scanResult} onClose={() => setScanResult(null)} />
      <RegisterDialog open={registerOpen} onClose={() => setRegisterOpen(false)}
        onSubmit={(req) => registerMutation.mutate(req)} loading={registerMutation.isPending} />
      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)}
        onSubmit={(fd) => uploadMutation.mutate(fd)} loading={uploadMutation.isPending} />
      <EditDialog pkg={editPkg} onClose={() => setEditPkg(null)}
        onSubmit={(id, req) => editMutation.mutate({ id, req })} loading={editMutation.isPending} />
      <ModulefileDialog pkg={modulefilePkg} onClose={() => setModulefilePkg(null)} />
      <DeleteDialog pkg={deletePkg} onClose={() => setDeletePkg(null)}
        onConfirm={(id, deleteFiles) => deleteMutation.mutate({ id, deleteFiles })}
        loading={deleteMutation.isPending} />
    </Box>
  );
};