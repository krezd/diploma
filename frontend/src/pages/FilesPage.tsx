import { useState, useRef, useMemo, useEffect } from 'react';
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
  Checkbox,
  TableSortLabel,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
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

type FileSortField = 'fileName' | 'fileType' | 'fileSize' | 'lastModified';
type SortDir = 'asc' | 'desc';

// ─── Предпросмотр файлов ─────────────────────────────────────────────────────

const TEXT_EXTENSIONS = new Set([
  'txt', 'log', 'out', 'err',                          // plain / SLURM output
  'sh', 'bash', 'zsh',                                 // shell
  'py', 'r', 'jl',                                     // scripting
  'java', 'c', 'cpp', 'h', 'hpp', 'rs', 'go',          // compiled
  'js', 'ts', 'jsx', 'tsx', 'css', 'scss', 'html', 'htm',
  'json', 'yaml', 'yml', 'toml', 'xml', 'csv', 'tsv',
  'ini', 'conf', 'cfg', 'properties', 'env',
  'md', 'rst', 'sql',
  'f', 'f90', 'f95', 'for',                            // Fortran
  'slurm', 'sbatch',                                   // SLURM job scripts
]);

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp']);

const MAX_TEXT_BYTES  = 5  * 1024 * 1024; // 5 MB
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB

const getExt = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

type FileCategory = 'text' | 'image' | 'unsupported';

const getCategory = (name: string): FileCategory => {
  const ext = getExt(name);
  if (TEXT_EXTENSIONS.has(ext))  return 'text';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  return 'unsupported';
};

// ─── FileViewerDialog ─────────────────────────────────────────────────────────

interface FileViewerDialogProps {
  file: FileInfo;
  isAdmin: boolean;
  onClose: () => void;
  onDownload: (file: FileInfo) => void;
}

const FileViewerDialog = ({ file, isAdmin, onClose, onDownload }: FileViewerDialogProps) => {
  const [text, setText]       = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const category = getCategory(file.fileName);

  useEffect(() => {
    setText(null);
    setBlobUrl(null);
    setError(null);

    if (category === 'unsupported') return;

    const size = file.fileSize;
    if (category === 'text' && size !== null && size > MAX_TEXT_BYTES) {
      setError(`Файл слишком большой (${formatFileSize(size)}) — предпросмотр недоступен.`);
      return;
    }
    if (category === 'image' && size !== null && size > MAX_IMAGE_BYTES) {
      setError(`Изображение слишком большое (${formatFileSize(size)}) — предпросмотр недоступен.`);
      return;
    }

    setLoading(true);

    if (category === 'text') {
      filesApi.readFileAsText(file.filePath, isAdmin)
        .then((t) => setText(t))
        .catch(() => setError('Не удалось загрузить содержимое файла'))
        .finally(() => setLoading(false));
    } else {
      filesApi.readFileAsBlob(file.filePath, isAdmin)
        .then((blob) => setBlobUrl(URL.createObjectURL(blob)))
        .catch(() => setError('Не удалось загрузить изображение'))
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.filePath]);

  // Освобождаем blob URL при закрытии / смене файла
  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', maxHeight: '92vh', display: 'flex', flexDirection: 'column' } }}
    >
      <DialogTitle
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid', borderBottomColor: 'divider', py: 1.5, px: 2, flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          {category === 'image'
            ? <ImageIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
            : <InsertDriveFileIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
          }
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {file.fileName}
          </Typography>
          {file.fileSize !== null && (
            <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
              ({formatFileSize(file.fileSize)})
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="Скачать">
            <IconButton size="small" onClick={() => onDownload(file)} sx={{ color: 'text.secondary' }}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="warning"
              action={
                <Button size="small" color="inherit" onClick={() => onDownload(file)}>
                  Скачать
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        )}

        {category === 'unsupported' && !loading && !error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="info"
              action={
                <Button size="small" color="inherit" onClick={() => onDownload(file)}>
                  Скачать
                </Button>
              }
            >
              Предпросмотр для этого типа файла недоступен.
            </Alert>
          </Box>
        )}

        {text !== null && (
          <Box
            component="pre"
            sx={{
              m: 0, p: 2,
              fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
              fontSize: 13,
              lineHeight: 1.65,
              overflow: 'auto',
              flex: 1,
              bgcolor: (t) => t.palette.mode === 'dark' ? '#0d1117' : '#f8fafc',
              color: 'text.primary',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {text}
          </Box>
        )}

        {blobUrl && (
          <Box sx={{ overflow: 'auto', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, bgcolor: (t) => t.palette.mode === 'dark' ? '#0d1117' : '#f8fafc' }}>
            <img
              src={blobUrl}
              alt={file.fileName}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
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
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<FileInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [sortField, setSortField] = useState<FileSortField>('fileName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // ─── Запрос файлов ────────────────────────────────────────────────────────

  const { data: files = [], isLoading, isError } = useQuery({
    queryKey: ['files', currentPath, isAdmin],
    queryFn: () => filesApi.listFiles(currentPath, isAdmin),
    retry: 1,
  });

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      if (sortField !== 'fileType') {
        if (a.fileType === 'DIRECTORY' && b.fileType !== 'DIRECTORY') return -1;
        if (a.fileType !== 'DIRECTORY' && b.fileType === 'DIRECTORY') return 1;
      }

      let va: string | number;
      let vb: string | number;

      switch (sortField) {
        case 'fileType':
          va = a.fileType; vb = b.fileType; break;
        case 'fileSize':
          va = a.fileSize ?? -1; vb = b.fileSize ?? -1; break;
        case 'lastModified':
          va = a.lastModified; vb = b.lastModified; break;
        default:
          va = a.fileName.toLowerCase(); vb = b.fileName.toLowerCase();
      }

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [files, sortField, sortDir]);

  const handleSort = (field: FileSortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const allSelected = sortedFiles.length > 0 && selected.length === sortedFiles.length;
  const someSelected = selected.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) setSelected([]);
    else setSelected(sortedFiles.map((f) => f.filePath));
  };

  const handleSelectOne = (path: string) => {
    setSelected((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  // ─── Мутации ──────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (path: string) => filesApi.deleteItem(path, isAdmin),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['files'] });
      setSelected((prev) => prev.filter((p) => p !== deleteConfirm?.filePath));
      setDeleteConfirm(null);
      setNotification({ msg: 'Удалено', type: 'success' });
    },
    onError: () => setNotification({ msg: 'Ошибка при удалении', type: 'error' }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (paths: string[]) => filesApi.deleteItems(paths, isAdmin),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['files'] });
      setBulkDeleteOpen(false);
      setSelected([]);
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

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setSelected([]);
  };

  const handleUpload = async (inputFiles: FileList | File[], withRelativePaths = false) => {
    const fileArray = Array.from(inputFiles) as File[];
    if (fileArray.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

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

  const handleFileClick = (item: FileInfo) => {
    if (item.fileType === 'DIRECTORY') return;
    setViewerFile(item);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      void handleUpload(e.dataTransfer.files, false);
    }
  };

  const breadcrumbs = getBreadcrumbs(currentPath, username, isAdmin);

  const sortLabelProps = (field: FileSortField) => ({
    active: sortField === field,
    direction: sortField === field ? sortDir : 'asc' as const,
    onClick: () => handleSort(field),
    sx: {
      '& .MuiTableSortLabel-icon': { opacity: 0.4, color: 'text.secondary !important' },
      '&.Mui-active .MuiTableSortLabel-icon': { opacity: 1, color: 'primary.main !important' },
    },
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Файлы
      </Typography>

      <Paper sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        {/* Шапка: breadcrumb + toolbar */}
        <Box
          sx={{
            px: 2, py: 1.5,
            borderBottom: '1px solid', borderBottomColor: 'divider',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 1,
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
            {selected.length > 0 && (
              <Tooltip title={`Удалить выбранные (${selected.length})`}>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteSweepIcon fontSize="small" />}
                  onClick={() => setBulkDeleteOpen(true)}
                  sx={{ borderColor: 'error.main' }}
                >
                  Удалить ({selected.length})
                </Button>
              </Tooltip>
            )}

            <Button
              size="small"
              startIcon={<CreateNewFolderIcon fontSize="small" />}
              onClick={() => setCreateFolderOpen(true)}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              Новая папка
            </Button>

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
                <Button sx={{ px: 1 }} onClick={() => folderInputRef.current?.click()}>
                  <DriveFolderUploadIcon fontSize="small" />
                </Button>
              </Tooltip>
            </ButtonGroup>

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
                position: 'absolute', inset: 0,
                bgcolor: 'rgba(59, 130, 246, 0.08)',
                border: '2px dashed', borderColor: 'primary.main',
                borderRadius: 1, zIndex: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 1, pointerEvents: 'none',
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
                  <TableCell padding="checkbox" sx={{ pl: 1.5 }}>
                    <Checkbox
                      size="small"
                      indeterminate={someSelected}
                      checked={allSelected}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 12 }}>
                    <TableSortLabel {...sortLabelProps('fileName')}>Название</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 12, width: 90 }}>
                    <TableSortLabel {...sortLabelProps('fileType')}>Тип</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 12, width: 100 }}>
                    <TableSortLabel {...sortLabelProps('fileSize')}>Размер</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 12, width: 160 }}>
                    <TableSortLabel {...sortLabelProps('lastModified')}>Изменён</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ width: 80 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedFiles.map((item) => {
                  const isSelected = selected.includes(item.filePath);
                  const isFile = item.fileType !== 'DIRECTORY';
                  const canPreview = isFile && getCategory(item.fileName) !== 'unsupported';
                  return (
                    <TableRow
                      key={item.filePath}
                      hover
                      selected={isSelected}
                      sx={{ '&:last-child td': { borderBottom: 0 } }}
                    >
                      <TableCell padding="checkbox" sx={{ pl: 1.5 }}>
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onChange={() => handleSelectOne(item.filePath)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {isFile
                            ? <InsertDriveFileIcon sx={{ color: 'text.secondary', fontSize: 20, flexShrink: 0 }} />
                            : <FolderIcon sx={{ color: 'primary.main', fontSize: 20, flexShrink: 0 }} />
                          }
                          {!isFile ? (
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
                          ) : canPreview ? (
                            <Link
                              component="button"
                              underline="hover"
                              color="text.primary"
                              variant="body2"
                              onClick={() => handleFileClick(item)}
                              sx={{ cursor: 'pointer' }}
                            >
                              {item.fileName}
                            </Link>
                          ) : (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {item.fileName}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={isFile ? 'Файл' : 'Папка'}
                          variant="outlined"
                          sx={{ fontSize: 11, height: 20, borderColor: 'divider', color: 'text.secondary' }}
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
                        <Tooltip title={!isFile ? 'Скачать как ZIP' : 'Скачать'}>
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Box>
      </Paper>

      {/* Просмотр файла */}
      {viewerFile && (
        <FileViewerDialog
          file={viewerFile}
          isAdmin={isAdmin}
          onClose={() => setViewerFile(null)}
          onDownload={(f) => void handleDownload(f)}
        />
      )}

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

      {/* Диалог подтверждения удаления одного элемента */}
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

      {/* Диалог подтверждения массового удаления */}
      <Dialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Удалить выбранные элементы?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Будет удалено <strong>{selected.length}</strong> элемент(ов), включая вложенное содержимое папок.
            Действие необратимо.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => bulkDeleteMutation.mutate(selected)}
            disabled={bulkDeleteMutation.isPending}
          >
            {bulkDeleteMutation.isPending
              ? <CircularProgress size={18} color="inherit" />
              : `Удалить (${selected.length})`
            }
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