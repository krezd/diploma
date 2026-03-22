import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Tab,
  Tabs,
  InputAdornment,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SendIcon from '@mui/icons-material/Send';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CodeIcon from '@mui/icons-material/Code';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/services/api/jobsApi';
import { jobTemplateApi } from '@/services/api/jobTemplateApi';
import apiClient from '@/services/api/client';
import type { AxiosError } from 'axios';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuthStore } from '@/stores/authStore';
import type { BatchJobSubmitRequest } from '@/types/job.types';
import type { JobTemplate, JobTemplateRequest } from '@/types/job-template.types';
import type { SlurmAssociationsResponse } from '@/types/slurm-account.types';
import { filesApi } from '@/services/api/filesApi';
import type { FileInfo } from '@/types/files.types';

// ─── Хелпер: тултип с подсказкой ─────────────────────────────────────────────

const FieldHelp = ({ text }: { text: string }) => (
  <Tooltip title={text} placement="top" arrow>
    <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help', ml: 0.5, verticalAlign: 'middle' }} />
  </Tooltip>
);

// ─── Генератор preview скрипта ────────────────────────────────────────────────

function buildPreviewScript(params: BatchJobSubmitRequest): string {
  const lines: string[] = ['#!/bin/bash'];

  const add = (flag: string, value: string | number | boolean | undefined | null) => {
    if (value !== undefined && value !== null && value !== '' && value !== false) {
      lines.push(`#SBATCH ${flag}=${value}`);
    }
  };
  const addFlag = (flag: string, cond: boolean | undefined) => {
    if (cond) lines.push(`#SBATCH ${flag}`);
  };

  add('--job-name', params.name || 'my-job');
  add('--partition', params.partition);
  add('--account', params.account);
  add('--qos', params.qos);
  if (params.comment) lines.push(`#SBATCH --comment="${params.comment}"`);
  add('--nodes', params.nodes);
  add('--ntasks', params.ntasks);
  add('--ntasks-per-node', params.ntasks_per_node);
  add('--cpus-per-task', params.cpus_per_task);
  add('--time', params.time_limit_minutes);
  if (params.mem_mb_per_node) lines.push(`#SBATCH --mem=${params.mem_mb_per_node}M`);
  if (params.mem_mb_per_cpu) lines.push(`#SBATCH --mem-per-cpu=${params.mem_mb_per_cpu}M`);
  add('--gres', params.gres);
  add('--dependency', params.dependency);
  add('--array', params.array);
  add('--reservation', params.reservation);
  add('--constraint', params.constraints);
  addFlag('--exclusive', params.exclusive);
  add('--mail-user', params.mail_user);
  if (params.mail_type && params.mail_type.length > 0)
    lines.push(`#SBATCH --mail-type=${params.mail_type.join(',')}`);
  if (params.working_directory) add('--chdir', params.working_directory);
  lines.push('#SBATCH --output=<auto>/stdout.log');
  lines.push('#SBATCH --error=<auto>/stderr.log');
  lines.push('');
  lines.push(params.script_body || '# Ваши команды здесь');
  return lines.join('\n');
}

// ─── Файловый браузер ─────────────────────────────────────────────────────────

interface FileBrowserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  username: string;
  isAdmin: boolean;
  selectMode?: 'file' | 'dir';
}

const FileBrowser = ({ open, onClose, onSelect, username, isAdmin, selectMode = 'file' }: FileBrowserProps) => {
  const [currentPath, setCurrentPath] = useState(username);
  useEffect(() => { if (open) setCurrentPath(username); }, [open, username]);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['files-browser', currentPath],
    queryFn: () => filesApi.listFiles(currentPath, isAdmin),
    enabled: open,
  });

  const handleItem = async (item: FileInfo) => {
    if (item.fileType === 'DIRECTORY') {
      setCurrentPath(item.filePath);
    } else if (selectMode === 'file') {
      const text = await filesApi.readFileAsText(item.filePath, isAdmin);
      onSelect(text);
      onClose();
    }
  };

  const goUp = () => {
    const parts = currentPath.split('/');
    if (parts.length > 1) setCurrentPath(parts.slice(0, -1).join('/'));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: '#1a2035', border: '1px solid #2d3748' } }}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderOpenIcon fontSize="small" />
          {selectMode === 'dir' ? 'Выбрать рабочую директорию' : 'Выбрать файл скрипта'}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #2d3748', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
            /{currentPath}
          </Typography>
          {selectMode === 'dir' && (
            <Button size="small" variant="contained" onClick={() => { onSelect(currentPath); onClose(); }}>
              Выбрать эту папку
            </Button>
          )}
        </Box>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24} /></Box>
        ) : (
          <List dense sx={{ maxHeight: 360, overflowY: 'auto' }}>
            {currentPath !== username && (
              <ListItemButton onClick={goUp}>
                <ListItemText primary=".." primaryTypographyProps={{ sx: { fontFamily: 'monospace' } }} />
              </ListItemButton>
            )}
            {files.map((f) => (
              <ListItemButton key={f.filePath} onClick={() => handleItem(f)}
                disabled={selectMode === 'dir' && f.fileType !== 'DIRECTORY'}>
                <ListItemText
                  primary={f.fileName}
                  secondary={f.fileType === 'DIRECTORY' ? 'Папка' : `${f.fileSize ?? 0} байт`}
                  primaryTypographyProps={{
                    sx: { fontFamily: 'monospace', color: f.fileType === 'DIRECTORY' ? '#64b5f6' : 'text.primary' },
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Панель шаблонов ──────────────────────────────────────────────────────────

interface TemplatePanelProps {
  onApply: (template: JobTemplate) => void;
  currentParams: BatchJobSubmitRequest;
  mode: 'CONSTRUCTOR' | 'SCRIPT';
  username: string;
}

const TemplatePanel = ({ onApply, currentParams, mode, username }: TemplatePanelProps) => {
  const queryClient = useQueryClient();
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [savePublic, setSavePublic] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['job-templates'],
    queryFn: jobTemplateApi.getTemplates,
  });

  const createMutation = useMutation({
    mutationFn: (req: JobTemplateRequest) => jobTemplateApi.createTemplate(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-templates'] });
      setShowSaveForm(false);
      setSaveName('');
      setSaveDesc('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => jobTemplateApi.deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-templates'] }),
  });

  const handleSave = () => {
    createMutation.mutate({
      name: saveName,
      description: saveDesc || undefined,
      isPublic: savePublic,
      mode,
      jobDescJson: mode === 'CONSTRUCTOR' ? JSON.stringify(currentParams) : undefined,
      scriptTemplate: currentParams.script_body || undefined,
    });
  };

  const myTemplates = templates.filter((t) => t.username === username);
  const publicTemplates = templates.filter((t) => t.username !== username && t.isPublic);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Шаблоны
        </Typography>
        <Tooltip title="Сохранить текущие настройки как шаблон">
          <IconButton size="small" onClick={() => setShowSaveForm((v) => !v)}>
            <BookmarkIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {showSaveForm && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5, bgcolor: '#151b2d', borderRadius: 1 }}>
          <TextField size="small" label="Название шаблона" value={saveName} onChange={(e) => setSaveName(e.target.value)} />
          <TextField size="small" label="Описание" value={saveDesc} onChange={(e) => setSaveDesc(e.target.value)} />
          <FormControlLabel
            control={<Switch checked={savePublic} onChange={(e) => setSavePublic(e.target.checked)} size="small" />}
            label={<Typography variant="caption">Публичный</Typography>}
          />
          <Button size="small" variant="outlined" startIcon={<SaveIcon />}
            disabled={!saveName.trim() || createMutation.isPending} onClick={handleSave}>
            Сохранить
          </Button>
        </Box>
      )}

      {isLoading ? <CircularProgress size={20} sx={{ mx: 'auto' }} /> : (
        <>
          {myTemplates.length > 0 && (
            <>
              <Typography variant="caption" sx={{ color: 'text.secondary', px: 0.5 }}>Мои шаблоны</Typography>
              <List dense disablePadding>
                {myTemplates.map((t) => (
                  <ListItem key={t.id} disablePadding
                    secondaryAction={
                      <Tooltip title="Удалить">
                        <IconButton size="small" onClick={() => deleteMutation.mutate(t.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    }>
                    <ListItemButton dense onClick={() => onApply(t)}>
                      <ListItemText primary={t.name} secondary={t.description}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}
          {publicTemplates.length > 0 && (
            <>
              {myTemplates.length > 0 && <Divider sx={{ borderColor: '#2d3748' }} />}
              <Typography variant="caption" sx={{ color: 'text.secondary', px: 0.5 }}>Публичные</Typography>
              <List dense disablePadding>
                {publicTemplates.map((t) => (
                  <ListItem key={t.id} disablePadding>
                    <ListItemButton dense onClick={() => onApply(t)}>
                      <ListItemText primary={t.name} secondary={t.description}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}
          {templates.length === 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
              Нет сохранённых шаблонов
            </Typography>
          )}
        </>
      )}
    </Box>
  );
};

// ─── Диалог подтверждения ─────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  params: BatchJobSubmitRequest;
  mode: 'CONSTRUCTOR' | 'SCRIPT';
  loading: boolean;
}

const ConfirmDialog = ({ open, onClose, onConfirm, params, mode, loading }: ConfirmDialogProps) => {
  const script = mode === 'SCRIPT' ? (params.script_body ?? '') : buildPreviewScript(params);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: '#1a2035', border: '1px solid #2d3748' } }}>
      <DialogTitle>Подтверждение отправки задания</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>Проверьте параметры перед отправкой в SLURM.</Alert>
        {mode === 'CONSTRUCTOR' && (
          <Box sx={{ mb: 2 }}>
            {[
              ['Имя задания', params.name || '—'],
              ['Партиция', params.partition || '—'],
              ['Аккаунт', params.account || '—'],
              ['QoS', params.qos || '—'],
              ['Задач (ntasks)', String(params.ntasks ?? '—')],
              ['CPU на задачу', String(params.cpus_per_task ?? '—')],
              ['Лимит времени', params.time_limit_minutes ? `${params.time_limit_minutes} мин` : '—'],
              ['Память/узел', params.mem_mb_per_node ? `${params.mem_mb_per_node} MB` : '—'],
            ].map(([label, value]) => (
              <Box key={label} sx={{ display: 'flex', py: 0.5, borderBottom: '1px solid #2d374840' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 160, flexShrink: 0 }}>{label}</Typography>
                <Typography variant="body2">{value}</Typography>
              </Box>
            ))}
          </Box>
        )}
        <Box sx={{ bgcolor: '#151b2d', borderRadius: 1, p: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Итоговый скрипт:</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', mt: 0.5, fontSize: 12 }}>
            {script.slice(0, 600)}{script.length > 600 ? '\n...' : ''}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Отмена</Button>
        <Button variant="contained" startIcon={<SendIcon />} onClick={onConfirm} disabled={loading}>
          {loading ? <CircularProgress size={18} /> : 'Отправить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Главная страница ─────────────────────────────────────────────────────────


const DEFAULT_PARAMS: BatchJobSubmitRequest = { script_body: '#!/bin/bash\n\n# Ваши команды здесь\n' };

export const JobNewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const username = user?.username ?? '';

  const [mode, setMode] = useState<'CONSTRUCTOR' | 'SCRIPT'>('CONSTRUCTOR');
  const [params, setParams] = useState<BatchJobSubmitRequest>(DEFAULT_PARAMS);

  // UI
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);
  const [dirBrowserOpen, setDirBrowserOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const execFileRef = useRef<HTMLInputElement>(null);

  const [uploadedExecFile, setUploadedExecFile] = useState<string | null>(null);
  const [uploadingExec, setUploadingExec] = useState(false);
  const [uploadExecError, setUploadExecError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Применить шаблон из навигационного стейта
  useState(() => {
    const template = (location.state as { template?: JobTemplate } | null)?.template;
    if (template) {
      if (template.mode === 'SCRIPT') {
        setMode('SCRIPT');
        setParams((p) => ({ ...p, script_body: template.scriptTemplate ?? DEFAULT_PARAMS.script_body }));
      } else {
        setMode('CONSTRUCTOR');
        try {
          const parsed = JSON.parse(template.jobDescJson ?? '{}') as BatchJobSubmitRequest;
          setParams(parsed);
        } catch { /**/ }
      }
    }
  });

  // Ассоциации пользователя (аккаунты + QOS)
  const { data: assocData } = useQuery({
    queryKey: ['user-own-associations'],
    queryFn: () => apiClient.get<SlurmAssociationsResponse>(API_ENDPOINTS.SLURM.USER_ASSOCIATIONS).then((r) => r.data),
    enabled: !!username,
  });
  const userAssociations = assocData?.associations ?? [];
  const userAccounts = [...new Set(userAssociations.map((a) => a.account).filter((a): a is string => !!a))];
  const allowedQos = params.account
    ? (userAssociations.find((a) => a.account === params.account)?.qos ?? [])
    : [...new Set(userAssociations.flatMap((a) => a.qos ?? []))];

  // Партиции
  const { data: partitionsData } = useQuery({
    queryKey: ['partitions'],
    queryFn: () => apiClient.get<{ partitions: { name?: string }[] }>(API_ENDPOINTS.SLURM.PARTITIONS).then((r) => r.data),
  });
  const partitions = (partitionsData?.partitions ?? []).map((p) => p.name).filter((n): n is string => !!n);

  const set = <K extends keyof BatchJobSubmitRequest>(key: K, value: BatchJobSubmitRequest[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  const setNum = (key: keyof BatchJobSubmitRequest, val: string) => {
    const n = val === '' ? undefined : Number(val);
    setParams((prev) => ({ ...prev, [key]: n }));
  };

  // Preview скрипта
  const previewScript = useMemo(() => buildPreviewScript(params), [params]);

  // Загрузка скрипта с компьютера (только содержимое)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') set('script_body', ev.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Загрузка исполняемого файла в хранилище
  const handleExecFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingExec(true);
    setUploadExecError(null);
    try {
      await filesApi.uploadFiles([file], username, false);
      setUploadedExecFile(file.name);
      set('script_body', `#!/bin/bash\n\n./${file.name}`);
    } catch {
      setUploadExecError('Ошибка загрузки файла');
    } finally {
      setUploadingExec(false);
    }
    e.target.value = '';
  };

  const submitMutation = useMutation({
    mutationFn: () => jobsApi.submitJob(mode === 'SCRIPT' ? { ...params, raw_mode: true } : params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      navigate('/jobs', { state: { submitted: data?.job_id } });
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError<string | { message?: string }>;
      const data = axiosErr.response?.data;
      let msg = 'Ошибка при отправке задания';
      if (typeof data === 'string' && data) msg = data;
      else if (data && typeof data === 'object' && data.message) msg = data.message;
      setSubmitError(msg);
      setConfirmOpen(false);
    },
  });

  const applyTemplate = (template: JobTemplate) => {
    setUploadedExecFile(null);
    setUploadExecError(null);
    if (template.mode === 'SCRIPT') {
      setMode('SCRIPT');
      setParams((p) => ({ ...p, script_body: template.scriptTemplate ?? DEFAULT_PARAMS.script_body }));
    } else {
      setMode('CONSTRUCTOR');
      try {
        setParams(JSON.parse(template.jobDescJson ?? '{}') as BatchJobSubmitRequest);
      } catch { /**/ }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Заголовок */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/jobs')} sx={{ color: 'text.secondary' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Создание задания</Typography>
        <ToggleButtonGroup value={mode} exclusive size="small"
          onChange={(_, v) => { if (v) setMode(v); }} sx={{ ml: 'auto' }}>
          <ToggleButton value="CONSTRUCTOR">Конструктор</ToggleButton>
          <ToggleButton value="SCRIPT">Bash-скрипт</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>
      )}

      <Grid container spacing={2}>
        {/* Левая часть — форма + preview */}
        <Grid item xs={12} md={8}>
          {mode === 'CONSTRUCTOR' ? (
            <>
              {/* Вкладки: форма / preview */}
              <Box sx={{ borderBottom: 1, borderColor: '#2d3748', mb: 2 }}>
                <Tabs value={previewTab} onChange={(_, v) => setPreviewTab(v)}
                  sx={{ '& .MuiTab-root': { minHeight: 40 } }}>
                  <Tab label="Параметры" />
                  <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><CodeIcon fontSize="small" />Preview скрипта</Box>} />
                </Tabs>
              </Box>

              {previewTab === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

                  {/* Основные параметры */}
                  <Accordion defaultExpanded
                    sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Основные параметры</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField fullWidth size="small"
                            label={<>Имя задания <FieldHelp text="--job-name: отображается в squeue. До 64 символов." /></>}
                            placeholder="my-simulation"
                            value={params.name ?? ''}
                            onChange={(e) => set('name', e.target.value || undefined)} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Партиция <FieldHelp text="--partition: очередь/раздел кластера. Определяет приоритет и доступные ресурсы." /></InputLabel>
                            <Select value={params.partition ?? ''} label="Партиция"
                              onChange={(e) => set('partition', e.target.value || undefined)}>
                              <MenuItem value=""><em>Любая (по умолчанию)</em></MenuItem>
                              {partitions.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Аккаунт <FieldHelp text="--account: аккаунт для учёта ресурсов и биллинга. Влияет на доступные QoS и лимиты." /></InputLabel>
                            <Select value={params.account ?? ''} label="Аккаунт"
                              onChange={(e) => { set('account', e.target.value || undefined); set('qos', undefined); }}>
                              <MenuItem value=""><em>По умолчанию</em></MenuItem>
                              {userAccounts.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth size="small" disabled={allowedQos.length === 0}>
                            <InputLabel>QoS <FieldHelp text="--qos: Quality of Service. Задаёт приоритет и лимиты использования ресурсов." /></InputLabel>
                            <Select value={params.qos ?? ''} label="QoS"
                              onChange={(e) => set('qos', e.target.value || undefined)}>
                              <MenuItem value=""><em>По умолчанию</em></MenuItem>
                              {allowedQos.map((q) => <MenuItem key={q} value={q}>{q}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                          <TextField fullWidth size="small"
                            label={<>Комментарий <FieldHelp text="--comment: произвольный комментарий к заданию. Виден в базе slurmdbd." /></>}
                            value={params.comment ?? ''}
                            onChange={(e) => set('comment', e.target.value || undefined)} />
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>

                  {/* Ресурсы */}
                  <Accordion defaultExpanded
                    sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Ресурсы</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <TextField fullWidth size="small" type="number"
                            label={<>Узлов <FieldHelp text="--nodes: количество вычислительных узлов (серверов). Каждый узел — отдельная машина." /></>}
                            placeholder="1"
                            value={params.nodes ?? ''}
                            onChange={(e) => setNum('nodes', e.target.value)}
                            InputProps={{ inputProps: { min: 1 } }} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField fullWidth size="small" type="number"
                            label={<>Задач (ntasks) <FieldHelp text="--ntasks: общее число MPI-процессов/задач. Для OpenMP обычно 1." /></>}
                            placeholder="1"
                            value={params.ntasks ?? ''}
                            onChange={(e) => setNum('ntasks', e.target.value)}
                            InputProps={{ inputProps: { min: 1 } }} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField fullWidth size="small" type="number"
                            label={<>Задач на узел <FieldHelp text="--ntasks-per-node: число задач на каждый узел. ntasks = nodes × ntasks-per-node." /></>}
                            value={params.ntasks_per_node ?? ''}
                            onChange={(e) => setNum('ntasks_per_node', e.target.value)}
                            InputProps={{ inputProps: { min: 1 } }} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField fullWidth size="small" type="number"
                            label={<>CPU на задачу <FieldHelp text="--cpus-per-task: число CPU (потоков) для каждой задачи. Используйте для OpenMP: OMP_NUM_THREADS=$SLURM_CPUS_PER_TASK." /></>}
                            placeholder="1"
                            value={params.cpus_per_task ?? ''}
                            onChange={(e) => setNum('cpus_per_task', e.target.value)}
                            InputProps={{ inputProps: { min: 1 } }} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField fullWidth size="small" type="number"
                            label={<>Лимит времени (мин) <FieldHelp text="--time: максимальное время выполнения в минутах. По истечении задание будет завершено принудительно." /></>}
                            placeholder="60"
                            value={params.time_limit_minutes ?? ''}
                            onChange={(e) => setNum('time_limit_minutes', e.target.value)}
                            InputProps={{
                              inputProps: { min: 1 },
                              endAdornment: <InputAdornment position="end">мин</InputAdornment>,
                            }} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField fullWidth size="small" type="number"
                            label={<>Память/узел (MB) <FieldHelp text="--mem: RAM на один узел в МБ. 0 = вся доступная память. Не использовать совместно с --mem-per-cpu." /></>}
                            placeholder="4096"
                            value={params.mem_mb_per_node ?? ''}
                            onChange={(e) => setNum('mem_mb_per_node', e.target.value)}
                            InputProps={{
                              inputProps: { min: 0 },
                              endAdornment: <InputAdornment position="end">MB</InputAdornment>,
                            }} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField fullWidth size="small" type="number"
                            label={<>Память/CPU (MB) <FieldHelp text="--mem-per-cpu: RAM на одно ядро CPU в МБ. Альтернатива --mem. Не использовать совместно." /></>}
                            value={params.mem_mb_per_cpu ?? ''}
                            onChange={(e) => setNum('mem_mb_per_cpu', e.target.value)}
                            InputProps={{
                              inputProps: { min: 0 },
                              endAdornment: <InputAdornment position="end">MB</InputAdornment>,
                            }} />
                        </Grid>
                        <Grid item xs={12} sm={8}>
                          <TextField fullWidth size="small"
                            label={<>GRES (GPU и др.) <FieldHelp text="--gres: Generic Resources. Например: gpu:2 (любые 2 GPU), gpu:a100:1 (1 GPU типа A100)." /></>}
                            placeholder="gpu:2"
                            value={params.gres ?? ''}
                            onChange={(e) => set('gres', e.target.value || undefined)} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <FormControlLabel
                            control={
                              <Switch checked={!!params.exclusive}
                                onChange={(e) => set('exclusive', e.target.checked || undefined)} />
                            }
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2">Эксклюзивный</Typography>
                                <FieldHelp text="--exclusive: задание займёт узел полностью, не делясь с другими заданиями." />
                              </Box>
                            }
                          />
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>

                  {/* Планирование */}
                  <Accordion sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Планирование</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField fullWidth size="small"
                            label={<>Зависимости <FieldHelp text="--dependency: запустить только после завершения других заданий. Форматы: afterok:123, afterany:123,456, singleton." /></>}
                            placeholder="afterok:123"
                            value={params.dependency ?? ''}
                            onChange={(e) => set('dependency', e.target.value || undefined)} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField fullWidth size="small"
                            label={<>Array (массив задач) <FieldHelp text="--array: запустить несколько копий задания с разными индексами. Примеры: 0-15, 1,3,5-9, 0-15%4 (макс 4 одновременно)." /></>}
                            placeholder="0-15 или 1,3,5%2"
                            value={params.array ?? ''}
                            onChange={(e) => set('array', e.target.value || undefined)} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField fullWidth size="small"
                            label={<>Резервация <FieldHelp text="--reservation: использовать предварительно зарезервированные ресурсы." /></>}
                            value={params.reservation ?? ''}
                            onChange={(e) => set('reservation', e.target.value || undefined)} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField fullWidth size="small"
                            label={<>Constraints (требования к узлам) <FieldHelp text='--constraint: выбрать узлы с определёнными характеристиками. Примеры: "infiniband", "gpu&ssd", "[rack1|rack2]".' /></>}
                            placeholder="infiniband"
                            value={params.constraints ?? ''}
                            onChange={(e) => set('constraints', e.target.value || undefined)} />
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>

                  {/* Исполнение */}
                  <Accordion defaultExpanded
                    sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Исполнение</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        {/* Рабочая директория */}
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Button variant="outlined" size="small" startIcon={<FolderOpenIcon />}
                              onClick={() => setDirBrowserOpen(true)}>
                              {params.working_directory ? 'Изменить директорию' : 'Рабочая директория'}
                            </Button>
                            {params.working_directory ? (
                              <Chip label={params.working_directory}
                                onDelete={() => set('working_directory', undefined)}
                                size="small" variant="outlined" />
                            ) : (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                По умолчанию — ваша домашняя директория в хранилище
                              </Typography>
                            )}
                          </Box>
                        </Grid>

                        {/* Загрузка исполняемого файла */}
                        <Grid item xs={12}>
                          <Divider sx={{ borderColor: '#2d3748', my: 0.5 }} />
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                            Загрузить исполняемый файл в хранилище
                          </Typography>
                          {uploadedExecFile ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip icon={<UploadFileIcon />} label={uploadedExecFile}
                                onDelete={() => { setUploadedExecFile(null); set('script_body', DEFAULT_PARAMS.script_body); }}
                                color="primary" variant="outlined" />
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>загружен в хранилище</Typography>
                            </Box>
                          ) : (
                            <Button variant="outlined" size="small"
                              startIcon={uploadingExec ? <CircularProgress size={14} /> : <UploadFileIcon />}
                              onClick={() => execFileRef.current?.click()} disabled={uploadingExec}>
                              Загрузить файл
                            </Button>
                          )}
                          {uploadExecError && <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>{uploadExecError}</Alert>}
                          <input ref={execFileRef} type="file" hidden onChange={handleExecFileUpload} />
                        </Grid>

                        {/* Скрипт */}
                        <Grid item xs={12}>
                          <Divider sx={{ borderColor: '#2d3748', my: 0.5 }} />
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              Команды для выполнения
                              <FieldHelp text="Тело задания без #SBATCH директив. Директивы генерируются автоматически из параметров выше. Переменные окружения: $SLURM_NTASKS, $SLURM_CPUS_PER_TASK, $SLURM_ARRAY_TASK_ID и др." />
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="Загрузить скрипт с компьютера">
                                <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ color: 'text.secondary' }}>
                                  <UploadFileIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Выбрать файл из хранилища">
                                <IconButton size="small" onClick={() => setFileBrowserOpen(true)} sx={{ color: 'text.secondary' }}>
                                  <FolderOpenIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                          <TextField fullWidth multiline rows={10} size="small"
                            inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
                            value={params.script_body}
                            onChange={(e) => set('script_body', e.target.value)} />
                        </Grid>

                        <Grid item xs={12}>
                          <Alert severity="info" sx={{ py: 0.5 }}>
                            Вывод (stdout/stderr) сохраняется автоматически в папку <strong>{'<имя_задания>'}/output/</strong> вашего хранилища.
                          </Alert>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              ) : (
                /* Preview скрипта */
                <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', p: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                    Итоговый batch-скрипт, который будет передан в sbatch:
                  </Typography>
                  <Box sx={{ bgcolor: '#0d1117', borderRadius: 1, p: 1.5, overflowX: 'auto' }}>
                    <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: 12, m: 0, color: '#e6edf3', whiteSpace: 'pre-wrap' }}>
                      {previewScript}
                    </Typography>
                  </Box>
                </Paper>
              )}
            </>
          ) : (
            /* Режим Bash-скрипт */
            <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Bash-скрипт (включая #SBATCH директивы)
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Загрузить файл с компьютера">
                    <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ color: 'text.secondary' }}>
                      <UploadFileIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Выбрать файл из хранилища">
                    <IconButton size="small" onClick={() => setFileBrowserOpen(true)} sx={{ color: 'text.secondary' }}>
                      <FolderOpenIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Alert severity="info" sx={{ py: 0.5, mb: 1 }}>
                В режиме скрипта директивы #SBATCH нужно добавить вручную. Добавьте хотя бы <code>--output</code> и <code>--error</code> для получения логов.
              </Alert>
              <TextField fullWidth multiline rows={24} size="small"
                inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
                value={params.script_body}
                onChange={(e) => set('script_body', e.target.value)} />
            </Paper>
          )}

          {/* Кнопка отправки */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button variant="contained" size="large" startIcon={<SendIcon />}
              onClick={() => setConfirmOpen(true)}>
              Отправить в SLURM
            </Button>
          </Box>
        </Grid>

        {/* Правая часть — шаблоны */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', p: 2, position: 'sticky', top: 80 }}>
            <TemplatePanel onApply={applyTemplate} currentParams={params} mode={mode} username={username} />
          </Paper>
        </Grid>
      </Grid>

      {/* Скрытые input */}
      <input ref={fileInputRef} type="file" accept=".sh,.bash,.txt,.py,.pl,.r,.R,*"
        style={{ display: 'none' }} onChange={handleFileUpload} />

      <FileBrowser open={fileBrowserOpen} onClose={() => setFileBrowserOpen(false)}
        onSelect={(text) => set('script_body', text)} username={username} isAdmin={isAdmin} selectMode="file" />

      <FileBrowser open={dirBrowserOpen} onClose={() => setDirBrowserOpen(false)}
        onSelect={(path) => set('working_directory', path)} username={username} isAdmin={isAdmin} selectMode="dir" />

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)}
        onConfirm={() => submitMutation.mutate()} params={params} mode={mode} loading={submitMutation.isPending} />
    </Box>
  );
};