import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, Tabs, Tab, CircularProgress, Alert, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Divider, TextField, TableSortLabel, TablePagination,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/services/api/jobsApi';
import { filesApi } from '@/services/api/filesApi';
import { useAuthStore } from '@/stores/authStore';
import type {
  SlurmJobInfo, SlurmJobsResponse, SlurmDbJob, JobState, SlurmNoVal,
  SlurmJobDescMsg, JobUsageStats,
} from '@/types/job.types';
import { ACTIVE_JOB_STATES } from '@/types/job.types';

// ─── Утилиты ────────────────────────────────────────────────────────────────

const fmtUnix = (ts: SlurmNoVal | undefined): string => {
  if (!ts?.set || !ts.number) return '—';
  return new Date(ts.number * 1000).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const fmtUnixRaw = (ts: number | undefined | null): string => {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const fmtMinutes = (u: SlurmNoVal | undefined): string => {
  if (!u?.set) return '—';
  if (u.infinite) return '∞';
  const m = u.number ?? 0;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}ч ${min}м` : `${min}м`;
};

const fmtSeconds = (sec: number | undefined): string => {
  if (sec === undefined || sec === null) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}ч ${m}м ${s}с`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
};

const fmtMem = (u: SlurmNoVal | undefined): string => {
  if (!u?.set || !u.number) return '—';
  const mb = u.number;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
};

const getJobStateColor = (
  states: JobState[] | undefined
): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  if (!states || states.length === 0) return 'default';
  const s = states[0];
  if (s === 'RUNNING') return 'success';
  if (['PENDING', 'CONFIGURING', 'COMPLETING'].includes(s)) return 'warning';
  if (s === 'COMPLETED') return 'info';
  if (['FAILED', 'NODE_FAIL', 'BOOT_FAIL', 'OUT_OF_MEMORY', 'TIMEOUT', 'DEADLINE', 'LAUNCH_FAILED'].includes(s)) return 'error';
  return 'default';
};

const isActiveState = (states: JobState[] | undefined): boolean =>
  (states ?? []).some((s) => ACTIVE_JOB_STATES.includes(s));

// Strip workspace prefix from absolute paths to get relative path for filesApi
const toRelativePath = (path: string | undefined): string | null => {
  if (!path) return null;
  const marker = '/diploma-app/';
  const idx = path.indexOf(marker);
  if (idx !== -1) return path.slice(idx + marker.length);
  if (!path.startsWith('/')) return path;
  return null;
};

// ─── StatCard ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) => (
  <Paper sx={{ p: 2.5, bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2, height: '100%' }}>
    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>
      {label}
    </Typography>
    <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 700, color: color ?? 'text.primary' }}>{value}</Typography>
    {sub && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{sub}</Typography>}
  </Paper>
);

// ─── InfoRow helper ──────────────────────────────────────────────────────────

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ display: 'flex', py: 0.75, borderBottom: '1px solid #2d374840' }}>
    <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 160, flexShrink: 0 }}>{label}</Typography>
    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{value ?? '—'}</Typography>
  </Box>
);

// ─── FileLink — кликабельная ссылка для скачивания файла ─────────────────────

const FileLink = ({ path, isAdmin }: { path: string | undefined; isAdmin: boolean }) => {
  const [loading, setLoading] = useState(false);
  if (!path) return <Typography variant="body2">—</Typography>;
  const rel = toRelativePath(path);

  const handleDownload = async () => {
    if (!rel) return;
    setLoading(true);
    try { await filesApi.downloadFile(rel, isAdmin); } catch { /* ignore */ }
    setLoading(false);
  };

  if (!rel) return <Typography variant="body2" sx={{ wordBreak: 'break-all', color: 'text.secondary' }}>{path}</Typography>;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, wordBreak: 'break-all' }}>
      <Typography variant="body2" sx={{ color: 'primary.main', cursor: 'pointer' }}
        onClick={() => void handleDownload()}>
        {path}
      </Typography>
      <Tooltip title="Скачать">
        <IconButton size="small" onClick={() => void handleDownload()} disabled={loading}
          sx={{ color: 'text.secondary', p: 0.25 }}>
          {loading ? <CircularProgress size={12} /> : <DownloadIcon sx={{ fontSize: 14 }} />}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

// ─── ActiveJobDialog ──────────────────────────────────────────────────────────

interface ActiveJobDialogProps {
  job: SlurmJobInfo | null;
  onClose: () => void;
  onCancel: (job: SlurmJobInfo) => void;
  onUpdate: (job: SlurmJobInfo) => void;
}

const ActiveJobDialog = ({ job, onClose, onCancel, onUpdate }: ActiveJobDialogProps) => {
  if (!job) return null;
  const active = isActiveState(job.job_state);

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: '#1a2035', border: '1px solid #2d3748' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #2d3748' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>#{job.job_id} — {job.name ?? '—'}</Typography>
          <Chip label={(job.job_state ?? []).join('+')} size="small"
            color={getJobStateColor(job.job_state)} variant="outlined"
            sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: 11 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {active && (
            <Tooltip title="Изменить задание">
              <IconButton onClick={() => onUpdate(job)} sx={{ color: 'text.secondary' }}>
                <EditIcon />
              </IconButton>
            </Tooltip>
          )}
          {active && (
            <Tooltip title="Отменить задание">
              <IconButton onClick={() => onCancel(job)} sx={{ color: 'text.secondary' }}>
                <CancelIcon />
              </IconButton>
            </Tooltip>
          )}
          <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, display: 'block', mb: 1 }}>
              Общее
            </Typography>
            <InfoRow label="Пользователь" value={job.user_name} />
            <InfoRow label="Аккаунт" value={job.account} />
            <InfoRow label="Партиция" value={job.partition} />
            <InfoRow label="QOS" value={job.qos} />
            <InfoRow label="Кластер" value={job.cluster} />
            <InfoRow label="Причина" value={job.state_reason} />
            <InfoRow label="Описание" value={job.state_description} />

            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, display: 'block', mt: 2, mb: 1 }}>
              Время
            </Typography>
            <InfoRow label="Отправлено" value={fmtUnix(job.submit_time)} />
            <InfoRow label="Начало" value={fmtUnix(job.start_time)} />
            <InfoRow label="Завершение" value={fmtUnix(job.end_time)} />
            <InfoRow label="Лимит времени" value={fmtMinutes(job.time_limit)} />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, display: 'block', mb: 1 }}>
              Ресурсы
            </Typography>
            <InfoRow label="CPU" value={job.cpus?.set ? job.cpus.number : '—'} />
            <InfoRow label="Узлов" value={job.node_count?.set ? job.node_count.number : '—'} />
            <InfoRow label="Задач" value={job.tasks?.set ? job.tasks.number : '—'} />
            <InfoRow label="Память / CPU" value={fmtMem(job.memory_per_cpu)} />
            <InfoRow label="Память / узел" value={fmtMem(job.memory_per_node)} />
            <InfoRow label="Узлы" value={job.nodes ?? job.scheduled_nodes} />
            <InfoRow label="TRES запрошено" value={job.tres_req_str} />
            <InfoRow label="TRES выделено" value={job.tres_alloc_str} />

            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, display: 'block', mt: 2, mb: 1 }}>
              Файлы
            </Typography>
            <Box sx={{ display: 'flex', py: 0.75, borderBottom: '1px solid #2d374840' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 160, flexShrink: 0 }}>Stdout</Typography>
              <FileLink path={job.standard_output} isAdmin={false} />
            </Box>
            <Box sx={{ display: 'flex', py: 0.75, borderBottom: '1px solid #2d374840' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 160, flexShrink: 0 }}>Stderr</Typography>
              <FileLink path={job.standard_error} isAdmin={false} />
            </Box>
            <InfoRow label="Команда" value={job.command} />
            <InfoRow label="Stdin" value={job.standard_input} />
          </Grid>

          {(job.exit_code || job.derived_exit_code) && (
            <Grid item xs={12}>
              <Divider sx={{ borderColor: '#2d3748', mb: 1.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, display: 'block', mb: 1 }}>
                Завершение
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <InfoRow label="Exit code" value={(job.exit_code?.status ?? []).join(', ')} />
                  <InfoRow label="Return code" value={job.exit_code?.return_code?.number?.toString()} />
                  {job.exit_code?.signal?.name && <InfoRow label="Сигнал" value={job.exit_code.signal.name} />}
                </Grid>
              </Grid>
            </Grid>
          )}

          {(job.dependency || job.features || job.comment) && (
            <Grid item xs={12}>
              <Divider sx={{ borderColor: '#2d3748', mb: 1.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, display: 'block', mb: 1 }}>
                Дополнительно
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <InfoRow label="Зависимость" value={job.dependency} />
                  <InfoRow label="Features" value={job.features} />
                  <InfoRow label="Комментарий" value={job.comment} />
                  <InfoRow label="Приоритет" value={job.priority?.number} />
                </Grid>
              </Grid>
            </Grid>
          )}
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

// ─── HistoryJobDialog ─────────────────────────────────────────────────────────

interface HistoryJobDialogProps {
  job: SlurmDbJob | null;
  isAdmin: boolean;
  onClose: () => void;
}

const HistoryJobDialog = ({ job, onClose }: HistoryJobDialogProps) => {
  if (!job) return null;
  const states = job.state?.current ?? [];

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: '#1a2035', border: '1px solid #2d3748' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #2d3748' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>#{job.job_id} — {job.name ?? '—'}</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
            {states.map((s) => (
              <Chip key={s} label={s} size="small" color={getJobStateColor([s])} variant="outlined"
                sx={{ fontFamily: 'monospace', fontSize: 11 }} />
            ))}
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, display: 'block', mb: 1 }}>
              Общее
            </Typography>
            <InfoRow label="Пользователь" value={job.user} />
            <InfoRow label="Аккаунт" value={job.account} />
            <InfoRow label="Партиция" value={job.partition} />
            <InfoRow label="QOS" value={job.qos} />
            <InfoRow label="Кластер" value={job.cluster} />
            <InfoRow label="Узлы" value={job.nodes} />
            <InfoRow label="Командная строка" value={job.submit_line} />

            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, display: 'block', mt: 2, mb: 1 }}>
              Время
            </Typography>
            <InfoRow label="Отправлено" value={fmtUnixRaw(job.time?.submission)} />
            <InfoRow label="Начало" value={fmtUnixRaw(job.time?.start)} />
            <InfoRow label="Завершение" value={fmtUnixRaw(job.time?.end)} />
            <InfoRow label="Затрачено" value={fmtSeconds(job.time?.elapsed)} />
            <InfoRow label="Лимит" value={job.time?.limit?.infinite ? '∞' : job.time?.limit?.set ? fmtSeconds((job.time.limit.number ?? 0) * 60) : '—'} />
            <InfoRow label="CPU (система)" value={fmtSeconds(job.time?.system?.seconds)} />
            <InfoRow label="CPU (пользователь)" value={fmtSeconds(job.time?.user?.seconds)} />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, display: 'block', mb: 1 }}>
              Ресурсы
            </Typography>
            <InfoRow label="CPU" value={job.required?.CPUs} />
            <InfoRow label="Память / CPU" value={fmtMem(job.required?.memory_per_cpu)} />
            <InfoRow label="Память / узел" value={fmtMem(job.required?.memory_per_node)} />
            {job.tres?.allocated && <InfoRow label="TRES выделено" value={job.tres.allocated.map((t) => `${t.type}${t.name ? `/${t.name}` : ''}=${t.count}`).join(', ')} />}

            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, display: 'block', mt: 2, mb: 1 }}>
              Завершение
            </Typography>
            <InfoRow label="Exit code" value={(job.exit_code?.status ?? []).join(', ')} />
            <InfoRow label="Return code" value={job.exit_code?.return_code?.number?.toString()} />
            {job.exit_code?.signal?.name && <InfoRow label="Сигнал" value={job.exit_code.signal.name} />}
          </Grid>

          {(job.steps ?? []).length > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ borderColor: '#2d3748', mb: 1.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, display: 'block', mb: 1 }}>
                Шаги ({job.steps!.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {job.steps!.map((step, i) => (
                  <Paper key={i} sx={{ p: 1.5, bgcolor: '#151b2d', border: '1px solid #2d3748', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {step.step?.name ?? step.step?.id ?? `Step ${i}`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      Узлов: {step.nodes?.count ?? '—'} · Задач: {step.tasks?.count ?? '—'} · {fmtSeconds(step.time?.elapsed)}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

// ─── CancelDialog ─────────────────────────────────────────────────────────────

const CancelDialog = ({ job, onClose, onConfirm, loading }: {
  job: SlurmJobInfo | null; onClose: () => void; onConfirm: (id: number) => void; loading: boolean;
}) => {
  if (!job) return null;
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1a2035', borderBottom: '1px solid #2d3748' }}>
        Отмена задания #{job.job_id}
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#1a2035', pt: 2 }}>
        <Alert severity="warning" sx={{ mt: 1 }}>Задание «{job.name}» будет отменено. Это действие необратимо.</Alert>
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#1a2035', borderTop: '1px solid #2d3748', px: 2, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: 'text.secondary' }}>Отмена</Button>
        <Button variant="contained" color="error" disabled={loading}
          onClick={() => job.job_id !== undefined && onConfirm(job.job_id)}>
          {loading ? <CircularProgress size={18} /> : 'Подтвердить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── UpdateDialog ─────────────────────────────────────────────────────────────

const UpdateDialog = ({ job, onClose, onConfirm, loading }: {
  job: SlurmJobInfo | null; onClose: () => void; onConfirm: (id: number, req: SlurmJobDescMsg) => void; loading: boolean;
}) => {
  const [timeLimit, setTimeLimit] = useState('');
  const [nice, setNice] = useState('');

  if (!job) return null;

  const handleConfirm = () => {
    if (!job.job_id) return;
    const req: SlurmJobDescMsg = {};
    if (timeLimit) req.time_limit = { set: true, infinite: false, number: Number(timeLimit) };
    if (nice) req.nice = Number(nice);
    onConfirm(job.job_id, req);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1a2035', borderBottom: '1px solid #2d3748' }}>
        Обновление задания #{job.job_id}
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#1a2035', pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField label="Новый лимит времени (мин)" type="number" value={timeLimit}
          onChange={(e) => setTimeLimit(e.target.value)} size="small"
          placeholder={`Текущий: ${fmtMinutes(job.time_limit)}`} fullWidth sx={{ mt: 1 }} />
        <TextField label="Nice (приоритет, -10000..10000)" type="number" value={nice}
          onChange={(e) => setNice(e.target.value)} size="small"
          placeholder={`Текущий: ${job.priority?.number ?? '—'}`} fullWidth />
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#1a2035', borderTop: '1px solid #2d3748', px: 2, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: 'text.secondary' }}>Отмена</Button>
        <Button variant="contained" disabled={loading || (!timeLimit && !nice)} onClick={handleConfirm}>
          {loading ? <CircularProgress size={18} /> : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Table helpers ────────────────────────────────────────────────────────────

const TABLE_HEAD_SX = {
  '& th': { bgcolor: '#151b2d', color: 'text.secondary', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.6 },
};
const TABLE_ROW_SX = {
  '& td': { borderColor: '#2d3748', py: 1 },
  cursor: 'pointer',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
};

type SortDir = 'asc' | 'desc';

function useSortFilter() {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const sortLabel = (field: string) => (
    <TableSortLabel
      active={sortField === field}
      direction={sortField === field ? sortDir : 'asc'}
      onClick={() => handleSort(field)}
      sx={{
        '& .MuiTableSortLabel-icon': {
          opacity: 0.4,
          color: 'text.secondary !important',
        },
        '&.Mui-active .MuiTableSortLabel-icon': {
          opacity: 1,
          color: 'primary.main !important',
        },
      }}
    />
  );

  return { search, setSearch, sortField, sortDir, handleSort, sortLabel };
}

// ─── ActiveJobsTab ────────────────────────────────────────────────────────────

const ActiveJobsTab = ({ isAdmin }: { isAdmin: boolean }) => {
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<SlurmJobInfo | null>(null);
  const [cancelJob, setCancelJob] = useState<SlurmJobInfo | null>(null);
  const [updateJob, setUpdateJob] = useState<SlurmJobInfo | null>(null);
  const { search, setSearch, sortField, sortDir, sortLabel } = useSortFilter();

  const { data, isLoading, isError, refetch } = useQuery<SlurmJobsResponse>({
    queryKey: ['jobs-active', isAdmin],
    queryFn: () => isAdmin ? jobsApi.getAllJobs() : jobsApi.getUserJobs(),
    refetchInterval: 30_000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => jobsApi.cancelJob(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['jobs-active'] });
      setCancelJob(null); setSelectedJob(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: number; req: SlurmJobDescMsg }) => jobsApi.updateJob(id, req),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['jobs-active'] }); setUpdateJob(null); },
  });

  const allJobs = data?.jobs ?? [];

  const jobs = useMemo(() => {
    let result = allJobs;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((j) =>
        String(j.job_id ?? '').includes(q) ||
        (j.name ?? '').toLowerCase().includes(q) ||
        (j.user_name ?? '').toLowerCase().includes(q) ||
        (j.partition ?? '').toLowerCase().includes(q)
      );
    }
    if (sortField) {
      result = [...result].sort((a, b) => {
        let va: unknown;
        let vb: unknown;
        if (sortField === 'submit_time') {
          va = a.submit_time?.number ?? 0; vb = b.submit_time?.number ?? 0;
        } else if (sortField === 'time_limit') {
          va = a.time_limit?.number ?? 0; vb = b.time_limit?.number ?? 0;
        } else if (sortField === 'cpus') {
          va = a.cpus?.set ? (a.cpus.number ?? 0) : 0;
          vb = b.cpus?.set ? (b.cpus.number ?? 0) : 0;
        } else if (sortField === 'node_count') {
          va = a.node_count?.set ? (a.node_count.number ?? 0) : 0;
          vb = b.node_count?.set ? (b.node_count.number ?? 0) : 0;
        } else {
          va = (a as Record<string, unknown>)[sortField];
          vb = (b as Record<string, unknown>)[sortField];
        }
        if (va === undefined || va === null) return 1;
        if (vb === undefined || vb === null) return -1;
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [allJobs, search, sortField, sortDir]);

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error">Ошибка загрузки активных заданий</Alert>;

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField size="small" placeholder="Поиск по ID, имени, пользователю, партиции…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 0.5, fontSize: 18 }} /> }}
          sx={{ flex: 1, maxWidth: 480 }} />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Обновить">
          <IconButton size="small" onClick={() => void refetch()} sx={{ color: 'text.secondary' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={TABLE_HEAD_SX}>
              <TableCell>ID {sortLabel('job_id')}</TableCell>
              <TableCell>Имя {sortLabel('name')}</TableCell>
              {isAdmin && <TableCell>Пользователь {sortLabel('user_name')}</TableCell>}
              <TableCell>Статус {sortLabel('job_state')}</TableCell>
              <TableCell>Партиция {sortLabel('partition')}</TableCell>
              <TableCell>CPU {sortLabel('cpus')}</TableCell>
              <TableCell>Лимит {sortLabel('time_limit')}</TableCell>
              <TableCell>Отправлено {sortLabel('submit_time')}</TableCell>
              <TableCell>Узлы {sortLabel('node_count')}</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map((job) => {
              const active = isActiveState(job.job_state);
              return (
                <TableRow key={job.job_id} sx={TABLE_ROW_SX} onClick={() => setSelectedJob(job)}>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{job.job_id}</Typography></TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.name ?? '—'}</Typography></TableCell>
                  {isAdmin && <TableCell><Typography variant="body2" sx={{ color: 'text.secondary' }}>{job.user_name ?? '—'}</Typography></TableCell>}
                  <TableCell>
                    <Chip label={(job.job_state ?? []).join('+')} size="small" color={getJobStateColor(job.job_state)} variant="outlined"
                      sx={{ fontSize: 11, height: 22, fontFamily: 'monospace' }} />
                  </TableCell>
                  <TableCell><Typography variant="caption" sx={{ color: 'text.secondary' }}>{job.partition ?? '—'}</Typography></TableCell>
                  <TableCell><Typography variant="caption" sx={{ color: 'text.secondary' }}>{job.cpus?.set ? job.cpus.number : '—'}</Typography></TableCell>
                  <TableCell><Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{fmtMinutes(job.time_limit)}</Typography></TableCell>
                  <TableCell><Typography variant="caption" sx={{ color: 'text.secondary' }}>{fmtUnix(job.submit_time)}</Typography></TableCell>
                  <TableCell><Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{job.nodes ?? '—'}</Typography></TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      {active && (
                        <>
                          <Tooltip title="Изменить">
                            <IconButton size="small" onClick={() => setUpdateJob(job)} sx={{ color: 'text.secondary', '&:hover': { color: 'warning.main' } }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Отменить">
                            <IconButton size="small" onClick={() => setCancelJob(job)} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            {jobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 10 : 9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {search ? 'Ничего не найдено' : 'Активных заданий нет'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <ActiveJobDialog job={selectedJob} onClose={() => setSelectedJob(null)}
        onCancel={(j) => setCancelJob(j)} onUpdate={(j) => setUpdateJob(j)} />
      <CancelDialog job={cancelJob} onClose={() => setCancelJob(null)}
        onConfirm={(id) => cancelMutation.mutate(id)} loading={cancelMutation.isPending} />
      <UpdateDialog job={updateJob} onClose={() => setUpdateJob(null)}
        onConfirm={(id, req) => updateMutation.mutate({ id, req })} loading={updateMutation.isPending} />
    </>
  );
};

// ─── HistoryJobsTab ───────────────────────────────────────────────────────────

const HistoryJobsTab = ({ isAdmin }: { isAdmin: boolean }) => {
  const [selectedJob, setSelectedJob] = useState<SlurmDbJob | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [applied, setApplied] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const { search, setSearch, sortField, sortDir, sortLabel } = useSortFilter();

  const fetchFn = isAdmin
    ? () => jobsApi.getArchivedJobs({ start_time: applied.start || undefined, end_time: applied.end || undefined })
    : () => jobsApi.getUserArchivedJobs({ start_time: applied.start || undefined, end_time: applied.end || undefined });

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['jobs-history', isAdmin, applied], queryFn: fetchFn });

  const allJobs = data?.jobs ?? [];

  const jobs = useMemo(() => {
    let result = allJobs;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((j) =>
        String(j.job_id ?? '').includes(q) ||
        (j.name ?? '').toLowerCase().includes(q) ||
        (j.user ?? '').toLowerCase().includes(q) ||
        (j.partition ?? '').toLowerCase().includes(q)
      );
    }
    if (sortField) {
      result = [...result].sort((a, b) => {
        let va: unknown;
        let vb: unknown;
        if (sortField === 'elapsed') {
          va = a.time?.elapsed ?? 0; vb = b.time?.elapsed ?? 0;
        } else if (sortField === 'status') {
          va = (a.state?.current ?? [])[0] ?? ''; vb = (b.state?.current ?? [])[0] ?? '';
        } else if (sortField === 'required_cpus') {
          va = a.required?.CPUs ?? 0; vb = b.required?.CPUs ?? 0;
        } else if (sortField === 'start') {
          va = a.time?.start ?? 0; vb = b.time?.start ?? 0;
        } else if (sortField === 'end') {
          va = a.time?.end ?? 0; vb = b.time?.end ?? 0;
        } else {
          va = (a as Record<string, unknown>)[sortField];
          vb = (b as Record<string, unknown>)[sortField];
        }
        if (va === undefined || va === null) return 1;
        if (vb === undefined || vb === null) return -1;
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [allJobs, search, sortField, sortDir]);

  // Reset to first page when filter/sort changes
  const pagedJobs = jobs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error">Ошибка загрузки истории заданий</Alert>;

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Поиск по ID, имени, пользователю…"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 0.5, fontSize: 18 }} /> }}
          sx={{ minWidth: 280 }} />
        <TextField label="Начало" type="datetime-local" size="small" value={startTime}
          onChange={(e) => setStartTime(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 200 }} />
        <TextField label="Конец" type="datetime-local" size="small" value={endTime}
          onChange={(e) => setEndTime(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 200 }} />
        <Button variant="outlined" size="small"
          onClick={() => { setPage(0); setApplied({
            start: startTime ? String(new Date(startTime).getTime() / 1000 | 0) : '',
            end: endTime ? String(new Date(endTime).getTime() / 1000 | 0) : '',
          }); }}>
          Применить
        </Button>
        <Button size="small" sx={{ color: 'text.secondary' }}
          onClick={() => { setStartTime(''); setEndTime(''); setApplied({ start: '', end: '' }); setPage(0); }}>
          Сбросить
        </Button>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Обновить">
          <IconButton size="small" onClick={() => void refetch()} sx={{ color: 'text.secondary' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={TABLE_HEAD_SX}>
              <TableCell>ID {sortLabel('job_id')}</TableCell>
              <TableCell>Имя {sortLabel('name')}</TableCell>
              {isAdmin && <TableCell>Пользователь {sortLabel('user')}</TableCell>}
              <TableCell>Статус {sortLabel('status')}</TableCell>
              <TableCell>Партиция {sortLabel('partition')}</TableCell>
              <TableCell>CPU {sortLabel('required_cpus')}</TableCell>
              <TableCell>Затрачено {sortLabel('elapsed')}</TableCell>
              <TableCell>Начало {sortLabel('start')}</TableCell>
              <TableCell>Завершение {sortLabel('end')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedJobs.map((job, i) => {
              const states = job.state?.current ?? [];
              return (
                <TableRow key={job.job_id ?? i} sx={TABLE_ROW_SX} onClick={() => setSelectedJob(job)}>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{job.job_id}</Typography></TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.name ?? '—'}</Typography></TableCell>
                  {isAdmin && <TableCell><Typography variant="body2" sx={{ color: 'text.secondary' }}>{job.user ?? '—'}</Typography></TableCell>}
                  <TableCell>
                    <Chip label={states.join('+')} size="small" color={getJobStateColor(states)} variant="outlined"
                      sx={{ fontSize: 11, height: 22, fontFamily: 'monospace' }} />
                  </TableCell>
                  <TableCell><Typography variant="caption" sx={{ color: 'text.secondary' }}>{job.partition ?? '—'}</Typography></TableCell>
                  <TableCell><Typography variant="caption" sx={{ color: 'text.secondary' }}>{job.required?.CPUs ?? '—'}</Typography></TableCell>
                  <TableCell><Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{fmtSeconds(job.time?.elapsed)}</Typography></TableCell>
                  <TableCell><Typography variant="caption" sx={{ color: 'text.secondary' }}>{fmtUnixRaw(job.time?.start)}</Typography></TableCell>
                  <TableCell><Typography variant="caption" sx={{ color: 'text.secondary' }}>{fmtUnixRaw(job.time?.end)}</Typography></TableCell>
                </TableRow>
              );
            })}
            {jobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 9 : 8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {search ? 'Ничего не найдено' : 'История заданий пуста'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <TablePagination
        component="div"
        count={jobs.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Строк на странице:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
        sx={{ color: 'text.secondary', borderTop: '1px solid #2d3748' }}
      />

      <HistoryJobDialog job={selectedJob} isAdmin={isAdmin} onClose={() => setSelectedJob(null)} />
    </>
  );
};

// ─── UsageTab ─────────────────────────────────────────────────────────────────

const UsageTab = ({ isAdmin }: { isAdmin: boolean }) => {
  const { data, isLoading, isError, refetch } = useQuery<JobUsageStats>({
    queryKey: ['jobs-usage', isAdmin],
    queryFn: () => isAdmin ? jobsApi.getJobUsageStats() : jobsApi.getUserJobUsageStats(),
    staleTime: 60_000,
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error">Ошибка загрузки статистики</Alert>;
  if (!data) return null;

  const statusColors: Record<string, string> = {
    COMPLETED: '#22c55e', RUNNING: '#3b82f6', PENDING: '#f59e0b',
    FAILED: '#ef4444', CANCELLED: '#6b7280', TIMEOUT: '#f97316',
    NODE_FAIL: '#dc2626', OUT_OF_MEMORY: '#7c3aed',
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Tooltip title="Обновить">
          <IconButton size="small" onClick={() => void refetch()} sx={{ color: 'text.secondary' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Всего заданий', value: data.total_jobs },
          { label: 'CPU·часов', value: data.total_cpu_hours.toFixed(1), sub: `RAM·ГБ·ч: ${data.total_mem_gb_hours.toFixed(1)}` },
          { label: 'Среднее ожидание', value: fmtSeconds(Math.round(data.avg_wait_time_seconds)), sub: `Среднее время работы: ${fmtSeconds(Math.round(data.avg_elapsed_seconds))}` },
          { label: 'Ненулевой exit code', value: data.failed_with_non_zero_exit, color: data.failed_with_non_zero_exit > 0 ? '#ef4444' : undefined },
        ].map(({ label, value, sub, color }) => (
          <Grid item xs={12} sm={6} md={3} key={label}>
            <StatCard label={label} value={value} sub={sub} color={color} />
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 12, mb: 1.5 }}>
        Задания по статусам
      </Typography>
      <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={TABLE_HEAD_SX}>
              <TableCell>Статус</TableCell>
              <TableCell align="right">Количество</TableCell>
              <TableCell align="right">% от всего</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries((data.jobs_by_status ?? {}) as Record<string, number>)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <TableRow key={status} sx={{ '& td': { borderColor: '#2d3748', py: 1 } }}>
                  <TableCell>
                    <Chip label={status} size="small" variant="outlined"
                      sx={{ fontSize: 11, height: 22, fontFamily: 'monospace', color: statusColors[status] ?? 'text.secondary', borderColor: statusColors[status] ?? '#2d3748' }} />
                  </TableCell>
                  <TableCell align="right"><Typography variant="body2" sx={{ fontWeight: 600 }}>{count}</Typography></TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {data.total_jobs > 0 ? ((count / data.total_jobs) * 100).toFixed(1) : '0'}%
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            {Object.keys((data.jobs_by_status ?? {}) as Record<string, number>).length === 0 && (
              <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>Нет данных</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

// ─── JobsPage ─────────────────────────────────────────────────────────────────

export const JobsPage = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const [tab, setTab] = useState(0);
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {isAdmin ? 'Все задания' : 'Мои задания'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => navigate('/jobs/templates')}
            sx={{ color: 'text.secondary', borderColor: '#2d3748' }}>
            Шаблоны
          </Button>
          <Button variant="contained" startIcon={<SendIcon />} onClick={() => navigate('/jobs/new')}>
            Создать задание
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: '1px solid #2d3748', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontSize: 14 },
          '& .Mui-selected': { color: 'primary.main' },
          '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
        }}>
          {['Активные', 'История', 'Статистика'].map((t) => <Tab key={t} label={t} />)}
        </Tabs>
      </Box>

      {tab === 0 && <ActiveJobsTab isAdmin={isAdmin} />}
      {tab === 1 && <HistoryJobsTab isAdmin={isAdmin} />}
      {tab === 2 && <UsageTab isAdmin={isAdmin} />}
    </Box>
  );
};