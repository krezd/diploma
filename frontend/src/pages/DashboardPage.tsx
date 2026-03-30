import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, CircularProgress, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, Button, Divider,
  LinearProgress, Tooltip, Tabs, Tab,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StorageIcon from '@mui/icons-material/Storage';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SendIcon from '@mui/icons-material/Send';
import MemoryIcon from '@mui/icons-material/Memory';
import LockIcon from '@mui/icons-material/Lock';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/services/api/jobsApi';
import apiClient from '@/services/api/client';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuthStore } from '@/stores/authStore';
import type { SlurmJobInfo, JobUsageStats } from '@/types/job.types';
import { ACTIVE_JOB_STATES } from '@/types/job.types';
import type { SlurmAssociationsResponse, SlurmAssociation } from '@/types/slurm-account.types';
import type { SlurmQosListResponse, SlurmQos } from '@/types/slurm-qos.types';

// ─── Утилиты ────────────────────────────────────────────────────────────────

const fmtSeconds = (sec: number): string => {
  if (!sec || isNaN(sec)) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м`;
  return `${Math.floor(sec)}с`;
};

const fmtUnixTs = (ts: number | undefined | null): string => {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
};

const getJobStateColor = (states: string[] | undefined): string => {
  const s = states?.[0];
  if (s === 'RUNNING') return '#22c55e';
  if (s === 'PENDING' || s === 'CONFIGURING') return '#f59e0b';
  if (s === 'COMPLETED') return '#3b82f6';
  if (['FAILED', 'NODE_FAIL', 'OUT_OF_MEMORY', 'TIMEOUT'].includes(s ?? '')) return '#ef4444';
  if (s === 'CANCELLED') return '#6b7280';
  return '#6b7280';
};

// ─── Утилиты для лимитов ──────────────────────────────────────────────────────

const fmtWallTime = (minutes?: number | null): string => {
  if (minutes == null) return '∞';
  if (minutes === -1) return '∞';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}ч ${m}м`;
  if (h > 0) return `${h}ч`;
  return `${m}м`;
};

const parseTresMemory = (val: string): string => {
  const match = val.match(/^(\d+(?:\.\d+)?)([MGTP]?)$/i);
  if (!match) return val;
  const num = parseFloat(match[1]);
  const unit = (match[2] || '').toUpperCase();
  if (unit === 'G') return `${num} ГБ`;
  if (unit === 'T') return `${num} ТБ`;
  return num >= 1024 ? `${(num / 1024).toFixed(0)} ГБ` : `${num} МБ`;
};

interface TresItem { label: string; value: string; }

const parseTresItems = (tres?: string | null): TresItem[] => {
  if (!tres) return [];
  return tres.split(',').flatMap((part) => {
    const eqIdx = part.indexOf('=');
    if (eqIdx < 0) return [];
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (val === '0' || val === 'N') return []; // пропускаем нулевые/не заданные
    if (key === 'cpu') return [{ label: 'CPU', value: val }];
    if (key === 'mem') return [{ label: 'Память', value: parseTresMemory(val) }];
    if (key === 'node') return [{ label: 'Узлы', value: val }];
    if (key === 'gres/gpu' || key === 'gpu') return [{ label: 'GPU', value: val }];
    if (key.startsWith('gres/')) return [{ label: key.slice(5).toUpperCase(), value: val }];
    return [{ label: key, value: val }];
  });
};

// ─── Строка лимита ────────────────────────────────────────────────────────────

const LimitRow = ({ label, value, infinite = false }: { label: string; value: string | number | null | undefined; infinite?: boolean }) => {
  if (value == null) return null;
  const display = String(value);
  const isInf = infinite || display === '∞' || display === '-1';
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.35 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="caption" sx={{ fontWeight: 600, color: isInf ? '#4ade80' : 'text.primary' }}>
        {isInf ? '∞' : display}
      </Typography>
    </Box>
  );
};

const TresSection = ({ label, tres }: { label: string; tres?: string | null }) => {
  const items = parseTresItems(tres);
  if (items.length === 0) return null;
  return (
    <>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.75, mb: 0.35, fontStyle: 'italic' }}>
        {label}:
      </Typography>
      {items.map(({ label: l, value: v }) => (
        <Box key={l} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.35, pl: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{l}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{v}</Typography>
        </Box>
      ))}
    </>
  );
};

// ─── Вкладка: личные лимиты ассоциации ───────────────────────────────────────

const UserAssocTab = ({ associations }: { associations: SlurmAssociation[] }) => {
  if (associations.length === 0) return (
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Нет данных</Typography>
  );
  return (
    <>
      {associations.map((assoc, i) => {
        const { limits, qos, default: defQos, account } = assoc;
        return (
          <Box key={`${account ?? ''}-${i}`} sx={{
            mb: 1.5, pb: 1.5,
            borderBottom: i < associations.length - 1 ? '1px solid #2d3748' : 'none',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', fontFamily: 'monospace' }}>
                {account ?? '—'}
              </Typography>
              {defQos?.qos && (
                <Chip label={`QOS: ${defQos.qos}`} size="small"
                  sx={{ fontSize: 10, height: 18, bgcolor: '#1e2844', color: '#60a5fa' }} />
              )}
            </Box>
            {(qos?.length ?? 0) > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.75 }}>
                {qos!.map((q) => (
                  <Chip key={q} label={q} size="small" variant="outlined"
                    sx={{ fontSize: 10, height: 18, borderColor: '#2d3748', color: 'text.secondary' }} />
                ))}
              </Box>
            )}
            {!limits ? (
              <Typography variant="caption" sx={{ color: '#4ade80' }}>Лимиты не установлены</Typography>
            ) : (
              <>
                <LimitRow label="Макс. заданий" value={limits.maxJobs ?? limits.grpJobs} />
                <LimitRow label="Макс. в очереди" value={limits.maxSubmitJobs ?? limits.grpSubmitJobs} />
                <LimitRow label="Макс. время" value={fmtWallTime(limits.maxWallMinutes ?? limits.grpWallMinutes)} />
                <TresSection label="На задание" tres={limits.maxTresPerJob} />
                <TresSection label="На узел" tres={limits.maxTresPerNode} />
                {limits.fairshare != null && limits.fairshare > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Fairshare</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#f59e0b' }}>
                      {limits.fairshare}
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
        );
      })}
    </>
  );
};

// ─── Вкладка: лимиты аккаунта ────────────────────────────────────────────────

const AccountAssocTab = ({ associations }: { associations: SlurmAssociation[] }) => {
  if (associations.length === 0) return (
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Нет данных</Typography>
  );
  return (
    <>
      {associations.map((assoc, i) => {
        const { limits, account, qos, default: defQos } = assoc;
        return (
          <Box key={`${account ?? ''}-${i}`} sx={{
            mb: 1.5, pb: 1.5,
            borderBottom: i < associations.length - 1 ? '1px solid #2d3748' : 'none',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', fontFamily: 'monospace' }}>
                {account ?? '—'}
              </Typography>
              {defQos?.qos && (
                <Chip label={`QOS: ${defQos.qos}`} size="small"
                  sx={{ fontSize: 10, height: 18, bgcolor: '#1e2844', color: '#60a5fa' }} />
              )}
            </Box>
            {(qos?.length ?? 0) > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.75 }}>
                {qos!.map((q) => (
                  <Chip key={q} label={q} size="small" variant="outlined"
                    sx={{ fontSize: 10, height: 18, borderColor: '#2d3748', color: 'text.secondary' }} />
                ))}
              </Box>
            )}
            {!limits ? (
              <Typography variant="caption" sx={{ color: '#4ade80' }}>Лимиты не установлены</Typography>
            ) : (
              <>
                <LimitRow label="Задания (группа)" value={limits.grpJobs} />
                <LimitRow label="В очереди (группа)" value={limits.grpSubmitJobs} />
                <LimitRow label="Wall-time (группа)" value={fmtWallTime(limits.grpWallMinutes)} />
                <TresSection label="Бюджет TRES" tres={limits.grpTres} />
                <TresSection label="TRES-минуты" tres={limits.grpTresMins} />
              </>
            )}
          </Box>
        );
      })}
    </>
  );
};

// ─── Вкладка: доступные QOS ───────────────────────────────────────────────────

const QosTab = ({ qosList, defaultQosNames }: { qosList: SlurmQos[]; defaultQosNames: Set<string> }) => {
  if (qosList.length === 0) return (
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Нет доступных QOS</Typography>
  );
  return (
    <>
      {qosList.map((qos, i) => (
        <Box key={qos.name} sx={{
          mb: 1.5, pb: 1.5,
          borderBottom: i < qosList.length - 1 ? '1px solid #2d3748' : 'none',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', fontFamily: 'monospace' }}>
              {qos.name}
            </Typography>
            {defaultQosNames.has(qos.name) && (
              <Chip label="default" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#1e3a1e', color: '#4ade80' }} />
            )}
            {qos.priority != null && qos.priority > 0 && (
              <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                p:{qos.priority}
              </Typography>
            )}
          </Box>
          {qos.description && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontStyle: 'italic' }}>
              {qos.description}
            </Typography>
          )}
          <LimitRow label="Задания/польз." value={qos.maxJobsPerUser} />
          <LimitRow label="В очереди/польз." value={qos.maxSubmitJobsPerUser} />
          <LimitRow label="Макс. время задания" value={fmtWallTime(qos.maxWallDurationPerJobMinutes)} />
          <TresSection label="На задание" tres={qos.maxTresPerJob} />
          <TresSection label="На узел" tres={qos.maxTresPerNode} />
          {qos.grpJobs != null && <LimitRow label="Задания (группа QOS)" value={qos.grpJobs} />}
          {qos.grpTres && <TresSection label="Бюджет QOS" tres={qos.grpTres} />}
        </Box>
      ))}
    </>
  );
};

// ─── Карточка метрики ─────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

const MetricCard = ({ label, value, sub, color, icon, onClick }: MetricCardProps) => (
  <Paper
    onClick={onClick}
    sx={{
      p: 2.5, bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'border-color 0.15s, background-color 0.15s',
      '&:hover': onClick ? { borderColor: '#3b82f6', bgcolor: '#1e2844' } : undefined,
      height: '100%',
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 }}>
        {label}
      </Typography>
      <Box sx={{ color: color ?? 'text.secondary', opacity: 0.7 }}>{icon}</Box>
    </Box>
    <Typography variant="h4" sx={{ fontWeight: 700, color: color ?? 'text.primary', lineHeight: 1 }}>
      {value}
    </Typography>
    {sub && (
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
        {sub}
      </Typography>
    )}
  </Paper>
);

// ─── Статус узла ──────────────────────────────────────────────────────────────

interface NodeStatusBarProps {
  total: number;
  idle: number;
  allocated: number;
  down: number;
}

const NodeStatusBar = ({ total, idle, allocated, down }: NodeStatusBarProps) => {
  const other = Math.max(0, total - idle - allocated - down);
  if (total === 0) return null;
  return (
    <Box>
      <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', mb: 1 }}>
        <Tooltip title={`Используется: ${allocated}`}>
          <Box sx={{ width: `${(allocated / total) * 100}%`, bgcolor: '#22c55e' }} />
        </Tooltip>
        <Tooltip title={`Свободно: ${idle}`}>
          <Box sx={{ width: `${(idle / total) * 100}%`, bgcolor: '#3b82f6' }} />
        </Tooltip>
        <Tooltip title={`Недоступно: ${down}`}>
          <Box sx={{ width: `${(down / total) * 100}%`, bgcolor: '#ef4444' }} />
        </Tooltip>
        <Tooltip title={`Другое: ${other}`}>
          <Box sx={{ width: `${(other / total) * 100}%`, bgcolor: '#4a5568' }} />
        </Tooltip>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {[
          { label: 'Используется', count: allocated, color: '#22c55e' },
          { label: 'Свободно', count: idle, color: '#3b82f6' },
          { label: 'Недоступно', count: down, color: '#ef4444' },
        ].map(({ label, count, color }) => count > 0 ? (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}: <strong style={{ color }}>{count}</strong></Typography>
          </Box>
        ) : null)}
      </Box>
    </Box>
  );
};

// ─── DashboardPage ────────────────────────────────────────────────────────────

export const DashboardPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const [limitsTab, setLimitsTab] = useState(0);

  // Активные задания
  const { data: jobsData, isLoading: jobsLoading, isError: jobsError } = useQuery({
    queryKey: ['dashboard-jobs'],
    queryFn: () => isAdmin ? jobsApi.getAllJobs() : jobsApi.getUserJobs(),
    staleTime: 30_000,
  });

  // Статистика использования (30 дней)
  const { data: usageData, isLoading: usageLoading } = useQuery<JobUsageStats>({
    queryKey: ['dashboard-usage', isAdmin],
    queryFn: () => isAdmin ? jobsApi.getJobUsageStats() : jobsApi.getUserJobUsageStats(),
    staleTime: 60_000,
  });

  // Ассоциации и лимиты текущего пользователя
  const { data: assocsData } = useQuery<SlurmAssociationsResponse>({
    queryKey: ['dashboard-user-associations'],
    queryFn: () => apiClient.get<SlurmAssociationsResponse>(API_ENDPOINTS.SLURM.USER_ASSOCIATIONS).then((r) => r.data),
    staleTime: 120_000,
  });

  // Лимиты аккаунтов пользователя (account-level ассоциации)
  const { data: accountAssocsData } = useQuery<SlurmAssociationsResponse>({
    queryKey: ['dashboard-account-associations'],
    queryFn: () => apiClient.get<SlurmAssociationsResponse>(API_ENDPOINTS.SLURM.USER_ACCOUNT_ASSOCIATIONS).then((r) => r.data),
    staleTime: 120_000,
  });

  // Детали QOS, доступных пользователю
  const { data: userQosData } = useQuery<SlurmQosListResponse>({
    queryKey: ['dashboard-user-qos'],
    queryFn: () => apiClient.get<SlurmQosListResponse>(API_ENDPOINTS.SLURM.USER_QOS).then((r) => r.data),
    staleTime: 120_000,
  });

  // Узлы (только если авторизован)
  const { data: nodesData } = useQuery({
    queryKey: ['dashboard-nodes'],
    queryFn: () => apiClient.get<{ nodes: { state?: string[] }[] }>(API_ENDPOINTS.SLURM.NODES).then((r) => r.data),
    staleTime: 30_000,
  });

  const userAssociations: SlurmAssociation[] = assocsData?.associations ?? [];
  const accountAssociations: SlurmAssociation[] = accountAssocsData?.associations ?? [];
  const userQosList: SlurmQos[] = userQosData?.qos ?? [];

  // Набор default QOS имён для всех ассоциаций пользователя
  const defaultQosNames = useMemo(() =>
    new Set(userAssociations.map((a) => a.default?.qos).filter(Boolean) as string[]),
    [userAssociations]
  );

  const hasLimitsData = userAssociations.length > 0 || accountAssociations.length > 0 || userQosList.length > 0;

  const jobs: SlurmJobInfo[] = jobsData?.jobs ?? [];

  // Метрики заданий
  const running = useMemo(() => jobs.filter((j) => j.job_state?.includes('RUNNING')).length, [jobs]);
  const pending = useMemo(() => jobs.filter((j) => j.job_state?.includes('PENDING')).length, [jobs]);
  const active = useMemo(() => jobs.filter((j) => (j.job_state ?? []).some((s) => ACTIVE_JOB_STATES.includes(s as never))).length, [jobs]);

  // Метрики узлов
  const nodeMetrics = useMemo(() => {
    const nodes = nodesData?.nodes ?? [];
    let idle = 0, allocated = 0, down = 0;
    for (const n of nodes) {
      const states = (n.state ?? []).map((s) => s.toLowerCase());
      if (states.includes('allocated') || states.includes('mixed')) allocated++;
      else if (states.includes('idle')) idle++;
      else if (states.includes('down') || states.includes('drain')) down++;
    }
    return { total: nodes.length, idle, allocated, down };
  }, [nodesData]);

  // Топ-5 активных заданий для таблицы
  const topJobs = useMemo(() =>
    jobs
      .filter((j) => (j.job_state ?? []).some((s) => ACTIVE_JOB_STATES.includes(s as never)))
      .slice(0, 8),
    [jobs]
  );

  // Статусы из статистики
  const statusEntries = useMemo(() =>
    Object.entries((usageData?.jobs_by_status ?? {}) as Record<string, number>)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6),
    [usageData]
  );

  const statusColors: Record<string, string> = {
    COMPLETED: '#22c55e', RUNNING: '#3b82f6', PENDING: '#f59e0b',
    FAILED: '#ef4444', CANCELLED: '#6b7280', TIMEOUT: '#f97316',
    NODE_FAIL: '#dc2626', OUT_OF_MEMORY: '#7c3aed',
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Заголовок */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {isAdmin ? 'Обзор кластера' : 'Мой дашборд'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Добро пожаловать, {user?.username}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<SendIcon />} onClick={() => navigate('/jobs/new')}>
          Создать задание
        </Button>
      </Box>

      {jobsError && <Alert severity="error" sx={{ mb: 2 }}>Ошибка загрузки данных кластера</Alert>}

      {/* Метрики заданий */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <MetricCard
            label="Активных заданий"
            value={jobsLoading ? '—' : active}
            sub={`${running} выполняется · ${pending} ожидает`}
            color="#3b82f6"
            icon={<WorkIcon />}
            onClick={() => navigate('/jobs')}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            label="Выполняется"
            value={jobsLoading ? '—' : running}
            color="#22c55e"
            icon={<PlayArrowIcon />}
            onClick={() => navigate('/jobs')}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            label="В очереди"
            value={jobsLoading ? '—' : pending}
            color="#f59e0b"
            icon={<HourglassEmptyIcon />}
            onClick={() => navigate('/jobs')}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            label="Узлов кластера"
            value={nodeMetrics.total || '—'}
            sub={nodeMetrics.total > 0 ? `${nodeMetrics.allocated} заняты · ${nodeMetrics.idle} свободны` : undefined}
            color="#8b5cf6"
            icon={<StorageIcon />}
            onClick={() => navigate('/cluster')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Левый блок */}
        <Grid item xs={12} lg={8}>

          {/* Активные задания */}
          <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2, mb: 2 }}>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2d3748' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Активные задания
              </Typography>
              <Button size="small" variant="text" onClick={() => navigate('/jobs')}
                sx={{ color: 'primary.main', fontSize: 12 }}>
                Все задания →
              </Button>
            </Box>
            {jobsLoading ? (
              <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
            ) : topJobs.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Нет активных заданий</Typography>
                <Button variant="outlined" size="small" sx={{ mt: 2 }} onClick={() => navigate('/jobs/new')}>
                  Создать задание
                </Button>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#151b2d', color: 'text.secondary', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, borderColor: '#2d3748' } }}>
                    <TableCell>ID</TableCell>
                    <TableCell>Имя</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Партиция</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Начало</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }} align="right">CPU</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topJobs.map((job) => (
                    <TableRow key={job.job_id} sx={{ '& td': { borderColor: '#2d3748', py: 0.75 } }}>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                          {job.job_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {job.name || '—'}
                        </Typography>
                        {isAdmin && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{job.user_name}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={(job.job_state?.[0] ?? '—')}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: 10, height: 20, color: getJobStateColor(job.job_state), borderColor: getJobStateColor(job.job_state) }}
                        />
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{job.partition || '—'}</Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {fmtUnixTs(job.start_time?.number)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }} align="right">
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {job.cpus?.number ?? '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>

          {/* Статусы из истории */}
          {!usageLoading && statusEntries.length > 0 && (
            <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2 }}>
              <Box sx={{ p: 2, borderBottom: '1px solid #2d3748' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Статистика за 30 дней
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  {[
                    { label: 'Всего заданий', value: usageData?.total_jobs ?? 0, icon: <WorkIcon sx={{ fontSize: 16 }} /> },
                    { label: 'CPU·ч', value: (usageData?.total_cpu_hours ?? 0).toFixed(1), icon: <MemoryIcon sx={{ fontSize: 16 }} /> },
                    { label: 'RAM·ГБ·ч', value: (usageData?.total_mem_gb_hours ?? 0).toFixed(1), icon: <StorageIcon sx={{ fontSize: 16 }} /> },
                    { label: 'Ср. ожидание', value: fmtSeconds(usageData?.avg_wait_time_seconds ?? 0), icon: <AccessTimeIcon sx={{ fontSize: 16 }} /> },
                  ].map(({ label, value, icon }) => (
                    <Grid item xs={6} sm={3} key={label}>
                      <Box sx={{ p: 1.5, bgcolor: '#151b2d', borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ color: 'text.secondary' }}>{icon}</Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1 }}>{value}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>{label}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ borderColor: '#2d3748', mb: 2 }} />

                {statusEntries.map(([status, count]) => (
                  <Box key={status} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusColors[status] ?? '#6b7280' }} />
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{status}</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
                        {count} ({usageData?.total_jobs ? ((count / usageData.total_jobs) * 100).toFixed(0) : 0}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={usageData?.total_jobs ? (count / usageData.total_jobs) * 100 : 0}
                      sx={{
                        height: 4, borderRadius: 2, bgcolor: '#2d3748',
                        '& .MuiLinearProgress-bar': { bgcolor: statusColors[status] ?? '#6b7280', borderRadius: 2 },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
        </Grid>

        {/* Правый блок */}
        <Grid item xs={12} lg={4}>
          {/* Состояние узлов */}
          <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2, mb: 2 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #2d3748' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Узлы кластера</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              {nodeMetrics.total === 0 ? (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Нет данных</Typography>
              ) : (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Всего узлов</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{nodeMetrics.total}</Typography>
                  </Box>
                  <NodeStatusBar {...nodeMetrics} />
                  <Divider sx={{ borderColor: '#2d3748', my: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Загрузка</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#22c55e' }}>
                      {nodeMetrics.total > 0 ? Math.round((nodeMetrics.allocated / nodeMetrics.total) * 100) : 0}%
                    </Typography>
                  </Box>
                </>
              )}
              <Button fullWidth variant="outlined" size="small" sx={{ mt: 2, borderColor: '#2d3748', color: 'text.secondary' }}
                onClick={() => navigate('/cluster')}>
                Подробнее →
              </Button>
            </Box>
          </Paper>

          {/* Ресурсные лимиты */}
          {hasLimitsData && (
            <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2, mb: 2 }}>
              <Box sx={{ px: 2, pt: 2, pb: 0, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #2d3748' }}>
                <LockIcon sx={{ fontSize: 15, color: 'text.secondary', mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Ресурсные лимиты</Typography>
              </Box>
              <Tabs
                value={limitsTab}
                onChange={(_, v: number) => setLimitsTab(v)}
                sx={{
                  minHeight: 36,
                  borderBottom: '1px solid #2d3748',
                  '& .MuiTab-root': { fontSize: 11, minHeight: 36, py: 0.5, textTransform: 'none', color: 'text.secondary' },
                  '& .Mui-selected': { color: 'primary.main' },
                  '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
                }}
              >
                <Tab label={`Личные${userAssociations.length > 0 ? ` (${userAssociations.length})` : ''}`} />
                <Tab label={`Аккаунт${accountAssociations.length > 0 ? ` (${accountAssociations.length})` : ''}`} />
                <Tab label={`QOS${userQosList.length > 0 ? ` (${userQosList.length})` : ''}`} />
              </Tabs>
              <Box sx={{ p: 2, maxHeight: 320, overflowY: 'auto' }}>
                {limitsTab === 0 && <UserAssocTab associations={userAssociations} />}
                {limitsTab === 1 && <AccountAssocTab associations={accountAssociations} />}
                {limitsTab === 2 && <QosTab qosList={userQosList} defaultQosNames={defaultQosNames} />}
              </Box>
            </Paper>
          )}

          {/* Быстрые действия */}
          <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2, mb: 2 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #2d3748' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Быстрые действия</Typography>
            </Box>
            <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { label: 'Создать задание', icon: <SendIcon fontSize="small" />, path: '/jobs/new', variant: 'contained' as const },
                { label: 'Шаблоны заданий', icon: <WorkIcon fontSize="small" />, path: '/jobs/templates', variant: 'outlined' as const },
                { label: 'Мои файлы', icon: <StorageIcon fontSize="small" />, path: '/files', variant: 'outlined' as const },
              ].map(({ label, icon, path, variant }) => (
                <Button key={label} variant={variant} size="small" startIcon={icon}
                  onClick={() => navigate(path)}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', borderColor: variant === 'outlined' ? '#2d3748' : undefined, color: variant === 'outlined' ? 'text.secondary' : undefined }}>
                  {label}
                </Button>
              ))}
            </Box>
          </Paper>

          {/* Ошибки и предупреждения */}
          {(usageData?.failed_with_non_zero_exit ?? 0) > 0 && (
            <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #ef444440', borderRadius: 2 }}>
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ErrorOutlineIcon sx={{ color: '#ef4444', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ color: '#ef4444' }}>Внимание</Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {usageData?.failed_with_non_zero_exit} заданий завершились с ненулевым кодом ошибки за последние 30 дней.
                </Typography>
                <Button size="small" variant="text" sx={{ color: '#ef4444', mt: 1, p: 0 }}
                  onClick={() => navigate('/jobs')}>
                  Посмотреть историю →
                </Button>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};