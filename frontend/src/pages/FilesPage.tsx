import { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Breadcrumbs,
  Link,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  LinearProgress,
  ButtonGroup,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi } from '@/services/api/filesApi';
import { useAuthStore } from '@/stores/authStore';
import type { FileInfo } from '@/types/files.types';

// ─── Утилиты ────────────────────────────────────────────────────────────────

const formatFileSize = (size: number | null): string => {
  if (size === null) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const formatDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

interface Breadcrumb {
  label: string;
  path: string;
}

const getBreadcrumbs = (currentPath: string, username: string, isAdmin: boolean): Breadcrumb[] => {
  const parts = currentPath.split('/').filter(Boolean);

  if (!isAdmin) {
    const crumbs: Breadcrumb[] = [{ label: 'Мои файлы', path: username }];
    let builtPath = username;
    for (let i = 1; i < parts.length; i++) {
      builtPath = `${builtPath}/${parts[i]}`;
      crumbs.push({ label: parts[i], path: builtPath });
    }
    return crumbs;
  }

  const crumbs: Breadcrumb[] = [{ label: 'Корень', path: '' }];
  let builtPath = '';
  for (const part of parts) {
    builtPath = builtPath ? `${builtPath}/${part}` : part;
    crumbs.push({ label: part, path: builtPath });
  }
  return crumbs;
};

// ─── Компонент ──────────────────────────────────────────────────────────────

export const FilesPage = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const username = user?.username ?? '';

  const [currentPath, setCurrentPath] = useState<string>(isAdmin ? '' : username);
  const [dragOver, setDragOver] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<FileInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // ─── Запрос файлов ────────────────────────────────────────────────────────

  const { data: files = [], isLoading, isError } = useQuery({
    queryKey: ['files', currentPath, isAdmin],
    queryFn: () => filesApi.listFiles(currentPath, isAdmin),
    retry: 1,
  });

  const sortedFiles = [...files].sort((a, b) => {
    if (a.fileType === 'DIRECTORY' && b.fileType !== 'DIRECTORY') return -1;
    if (a.fileType !== 'DIRECTORY' && b.fileType === 'DIRECTORY') return 1;
    return a.fileName.localeCompare(b.fileName, 'ru');
  });

  // ─── Мутации ──────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (path: string) => filesApi.deleteItem(path, isAdmin),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['files'] });
      setDeleteConfirm(null);
      setNotification({ msg: 'Удалено', type: 'success' });
    },
    onError: () => setNotification({ msg: 'Ошибка при удалении', type: 'error' }),
  });

  const createFolderMutation = useMutation({
    mutationFn: (path: string) => filesApi.createDir(path, isAdmin),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['files'] });
      setCreateFolderOpen(false);
      setNewFolderName('');
      setNotification({ msg: 'Папка создана', type: 'success' });
    },
    onError: () => setNotification({ msg: 'Ошибка при создании папки', type: 'error' }),
  });

  // ─── Хэндлеры ─────────────────────────────────────────────────────────────

  const handleNavigate = (path: string) => setCurrentPath(path);

  const handleUpload = async (inputFiles: FileList | File[], withRelativePaths = false) => {
    const fileArray = Array.from(inputFiles) as File[];
    if (fileArray.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    // При загрузке папки передаём webkitRelativePath каждого файла
    const relativePaths = withRelativePaths
      ? fileArray.map((f) => f.webkitRelativePath ?? '')
      : undefined;

    try {
      await filesApi.uploadFiles(fileArray, currentPath, isAdmin, relativePaths, (pct) => {
        setUploadProgress(pct);
      });
      void queryClient.invalidateQueries({ queryKey: ['files'] });
      setNotification({ msg: `Загружено: ${fileArray.length} файл(ов)`, type: 'success' });
    } catch {
      setNotification({ msg: 'Ошибка при загрузке файлов', type: 'error' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const newPath = currentPath ? `${currentPath}/${trimmed}` : trimmed;
    createFolderMutation.mutate(newPath);
  };

  const handleDelete = () => {
    if (deleteConfirm) deleteMutation.mutate(deleteConfirm.filePath);
  };

  const handleDownload = async (item: FileInfo) => {
    try {
      if (item.fileType === 'DIRECTORY') {
        await filesApi.downloadZip(item.filePath, isAdmin);
      } else {
        await filesApi.downloadFile(item.filePath, isAdmin);
      }
    } catch {
      setNotification({ msg: 'Ошибка при скачивании', type: 'error' });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      void handleUpload(e.dataTransfer.files, false);
    }
  };

  const breadcrumbs = getBreadcrumbs(currentPath, username, isAdmin);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Файлы
      </Typography>

      <Paper sx={{ border: '1px solid #2d3748', borderRadius: 2 }}>
        {/* Шапка: breadcrumb + toolbar */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: '1px solid #2d3748',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
            {breadcrumbs.map((crumb, i) =>
              i < breadcrumbs.length - 1 ? (
                <Link
                  key={crumb.path}
                  component="button"
                  underline="hover"
                  color="text.secondary"
                  variant="body2"
                  onClick={() => handleNavigate(crumb.path)}
                  sx={{ cursor: 'pointer' }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <Typography key={crumb.path} variant="body2" color="text.primary" fontWeight={500}>
                  {crumb.label}
                </Typography>
              )
            )}
          </Breadcrumbs>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size="small"
              startIcon={<CreateNewFolderIcon fontSize="small" />}
              onClick={() => setCreateFolderOpen(true)}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              Новая папка
            </Button>

            {/* Кнопки загрузки */}
            <ButtonGroup size="small" variant="contained" disabled={uploading}>
              <Tooltip title="Загрузить файлы">
                <Button
                  startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <UploadFileIcon fontSize="small" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? `${uploadProgress}%` : 'Файлы'}
                </Button>
              </Tooltip>
              <Tooltip title="Загрузить папку">
                <Button
                  sx={{ px: 1 }}
                  onClick={() => folderInputRef.current?.click()}
                >
                  <DriveFolderUploadIcon fontSize="small" />
                </Button>
              </Tooltip>
            </ButtonGroup>

            {/* Hidden inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => { if (e.target.files) void handleUpload(e.target.files, false); }}
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              hidden
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {...({ webkitdirectory: 'true', directory: 'true' } as any)}
              onChange={(e) => { if (e.target.files) void handleUpload(e.target.files, true); }}
            />
          </Box>
        </Box>

        {/* Прогресс загрузки */}
        {uploading && (
          <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 2 }} />
        )}

        {/* Зона drag & drop */}
        <Box
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          sx={{ position: 'relative', minHeight: 240 }}
        >
          {dragOver && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: 'rgba(59, 130, 246, 0.08)',
                border: '2px dashed',
                borderColor: 'primary.main',
                borderRadius: 1,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                pointerEvents: 'none',
              }}
            >
              <UploadFileIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
              <Typography color="primary.main" fontWeight={500}>
                Перетащите файлы для загрузки
              </Typography>
            </Box>
          )}

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : isError ? (
            <Alert severity="error" sx={{ m: 2 }}>
              Ошибка при загрузке содержимого директории
            </Alert>
          ) : sortedFiles.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, color: 'text.secondary' }}>
              <FolderOpenIcon sx={{ fontSize: 52, mb: 1.5, opacity: 0.35 }} />
              <Typography variant="body2">Папка пустая</Typography>
              <Typography variant="caption" sx={{ mt: 0.5 }}>
                Загрузите файлы или создайте папку
              </Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 12 }}>
                    Название
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 12, width: 90 }}>
                    Тип
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 12, width: 100 }}>
                    Размер
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 12, width: 160 }}>
                    Изменён
                  </TableCell>
                  <TableCell sx={{ width: 80 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedFiles.map((item) => (
                  <TableRow key={item.filePath} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {item.fileType === 'DIRECTORY' ? (
                          <FolderIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                        ) : (
                          <InsertDriveFileIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        )}
                        {item.fileType === 'DIRECTORY' ? (
                          <Link
                            component="button"
                            underline="hover"
                            color="text.primary"
                            variant="body2"
                            onClick={() => handleNavigate(item.filePath)}
                            sx={{ cursor: 'pointer', fontWeight: 500 }}
                          >
                            {item.fileName}
                          </Link>
                        ) : (
                          <Typography variant="body2">{item.fileName}</Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={item.fileType === 'DIRECTORY' ? 'Папка' : 'Файл'}
                        variant="outlined"
                        sx={{ fontSize: 11, height: 20, borderColor: '#2d3748', color: 'text.secondary' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatFileSize(item.fileSize)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(item.lastModified)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 1 }}>
                      <Tooltip title={item.fileType === 'DIRECTORY' ? 'Скачать как ZIP' : 'Скачать'}>
                        <IconButton size="small" onClick={() => void handleDownload(item)}>
                          <DownloadIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm(item)}>
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      </Paper>

      {/* Диалог создания папки */}
      <Dialog
        open={createFolderOpen}
        onClose={() => { setCreateFolderOpen(false); setNewFolderName(''); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Новая папка</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Имя папки"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateFolderOpen(false); setNewFolderName(''); }}>
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim() || createFolderMutation.isPending}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Удалить {deleteConfirm?.fileType === 'DIRECTORY' ? 'папку' : 'файл'}?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            <strong>{deleteConfirm?.fileName}</strong> будет удалён
            {deleteConfirm?.fileType === 'DIRECTORY' ? ' вместе со всем содержимым' : ''}.
            Действие необратимо.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Отмена</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <CircularProgress size={18} color="inherit" /> : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Уведомления */}
      <Snackbar
        open={!!notification}
        autoHideDuration={3500}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={notification?.type} onClose={() => setNotification(null)} variant="filled" sx={{ minWidth: 240 }}>
          {notification?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};