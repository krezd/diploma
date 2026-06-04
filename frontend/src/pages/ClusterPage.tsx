import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clusterApi } from '@/services/api/clusterApi';
import { useAuthStore } from '@/stores/authStore';
import type { SlurmNode, SlurmTres, SlurmDbQos, SlurmClusterRec, UpdateNodeRequest } from '@/types/cluster.types';

// ─── Утилиты ────────────────────────────────────────────────────────────────

/** Парсит строку GRES узла и возвращает суммарное кол-во GPU (или null если нет). */
const parseGpuCount = (gres?: string): number | null => {
  if (!gres || gres === '(null)') return null;
  let total = 0;
  let found = false;
  for (const part of gres.split(',')) {
    // Форматы: "gpu:2", "gpu:a100:1", "gpu:a100:1(S:0)"
    const m = part.match(/^gpu(?::\w+)?:(\d+)/i);
    if (m) { total += parseInt(m[1], 10); found = true; }
  }
  return found ? total : null;
};

const formatMemory = (mb: number | undefined): string => {
  if (mb === undefined || mb === null) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
};

const getNodeStateColor = (
  state: string[] | undefined
): 'success' | 'warning' | 'error' | 'default' => {
  if (!state || state.length === 0) return 'default';
  const s = state.join(' ').toUpperCase();
  if (s.includes('DOWN')) return 'error';
  if (s.includes('DRAIN')) return 'warning';
  if (s.includes('ALLOCATED') || s.includes('MIXED')) return 'warning';
  if (s.includes('IDLE')) return 'success';
  return 'default';
};

const getNodeStateLabel = (state: string[] | undefined): string => {
  if (!state || state.length === 0) return 'UNKNOWN';
  return state.join('+');
};

const pct = (used: number | undefined, total: number | undefined): number => {
  if (!total || !used) return 0;
  return Math.min(100, Math.round((used / total) * 100));
};

// ─── Компоненты ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

const StatCard = ({ label, value, sub, color }: StatCardProps) => (
  <Paper
    sx={{
      p: 2.5,
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      height: '100%',
    }}
  >
    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>
      {label}
    </Typography>
    <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 700, color: color ?? 'text.primary' }}>
      {value}
    </Typography>
    {sub && (
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {sub}
      </Typography>
    )}
  </Paper>
);

// ─── Диалог управления узлом (только ADMIN) ───────────────────────────────

interface NodeActionDialogProps {
  node: SlurmNode | null;
  action: 'DRAIN' | 'RESUME' | 'DOWN' | null;
  onClose: () => void;
  onConfirm: (node: SlurmNode, req: UpdateNodeRequest) => void;
  loading: boolean;
}

const NodeActionDialog = ({ node, action, onClose, onConfirm, loading }: NodeActionDialogProps) => {
  const [reason, setReason] = useState('');

  if (!node || !action) return null;

  const actionLabels: Record<string, string> = {
    DRAIN: 'Поставить в DRAIN',
    RESUME: 'Возобновить (RESUME)',
    DOWN: 'Перевести в DOWN',
  };

  const handleConfirm = () => {
    const req: UpdateNodeRequest = { state: [action] };
    if (action !== 'RESUME') req.reason = reason || `${action} via HPC Portal`;
    onConfirm(node, req);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderBottomColor: 'divider' }}>
        {actionLabels[action]}: {node.name}
      </DialogTitle>
      <DialogContent sx={{ bgcolor: 'background.paper', pt: 2 }}>
        {action !== 'RESUME' && (
          <TextField
            fullWidth
            label="Причина"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Укажите причину..."
            size="small"
            sx={{ mt: 1 }}
          />
        )}
        {action === 'RESUME' && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Узел будет возвращён в рабочее состояние и снова примет задания.
          </Typography>
        )}
        {action === 'DOWN' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Перевод узла в DOWN прекратит выполнение всех заданий на нём.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ bgcolor: 'background.paper', borderTop: '1px solid', borderTopColor: 'divider', px: 2, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: 'text.secondary' }}>
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={loading}
          color={action === 'DOWN' ? 'error' : action === 'DRAIN' ? 'warning' : 'success'}
        >
          {loading ? <CircularProgress size={18} /> : 'Подтвердить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Вкладка: Узлы ────────────────────────────────────────────────────────

interface NodesTabProps {
  isAdmin: boolean;
}

const NodesTab = ({ isAdmin }: NodesTabProps) => {
  const queryClient = useQueryClient();
  const [selectedNode, setSelectedNode] = useState<SlurmNode | null>(null);
  const [action, setAction] = useState<'DRAIN' | 'RESUME' | 'DOWN' | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cluster-nodes'],
    queryFn: clusterApi.getNodes,
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ name, req }: { name: string; req: UpdateNodeRequest }) =>
      clusterApi.updateNode(name, req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cluster-nodes'] });
      setSelectedNode(null);
      setAction(null);
    },
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error">Ошибка загрузки узлов</Alert>;

  const nodes = data?.nodes ?? [];
  const hasGpu = nodes.some((n) => parseGpuCount(n.gres) !== null);

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Tooltip title="Обновить">
          <IconButton size="small" onClick={() => void refetch()} sx={{ color: 'text.secondary' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: (t) => t.palette.mode === 'dark' ? '#151b2d' : '#f1f5f9', color: 'text.secondary', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 } }}>
              <TableCell>Узел</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Партиции</TableCell>
              <TableCell>CPU</TableCell>
              <TableCell>Память</TableCell>
              {hasGpu && <TableCell>GPU</TableCell>}
              {isAdmin && <TableCell align="right">Действия</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {nodes.map((node) => {
              const cpuUsed = node.alloc_cpus ?? 0;
              const cpuTotal = node.cpus ?? 0;
              const memUsed = node.alloc_memory ?? 0;
              const memTotal = node.real_memory ?? 0;
              const stateColor = getNodeStateColor(node.state);
              const isDrained = node.state?.some((s) => s.includes('DRAIN'));
              const isDown = node.state?.some((s) => s === 'DOWN');

              return (
                <TableRow
                  key={node.name}
                  sx={{ '& td': { borderColor: 'divider', py: 1 }, '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                      {node.name ?? '—'}
                    </Typography>
                    {node.reason && (
                      <Typography variant="caption" sx={{ color: 'warning.main', display: 'block' }}>
                        {node.reason}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getNodeStateLabel(node.state)}
                      size="small"
                      color={stateColor}
                      variant="outlined"
                      sx={{ fontSize: 11, height: 22, fontFamily: 'monospace' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {node.partitions?.join(', ') ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={pct(cpuUsed, cpuTotal)}
                        sx={{ flex: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: stateColor === 'success' ? 'primary.main' : stateColor === 'warning' ? 'warning.main' : 'error.main' } }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap', minWidth: 50 }}>
                        {cpuUsed}/{cpuTotal}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ minWidth: 160 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={pct(memUsed, memTotal)}
                        sx={{ flex: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: 'secondary.main' } }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap', minWidth: 90 }}>
                        {formatMemory(memUsed)}/{formatMemory(memTotal)}
                      </Typography>
                    </Box>
                  </TableCell>
                  {hasGpu && (() => {
                    const gpuTotal = parseGpuCount(node.gres);
                    const gpuUsed = parseGpuCount(node.gres_used);
                    return (
                      <TableCell sx={{ minWidth: 100 }}>
                        {gpuTotal !== null ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={pct(gpuUsed ?? 0, gpuTotal)}
                              sx={{ flex: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: 'warning.main' } }}
                            />
                            <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap', minWidth: 36 }}>
                              {gpuUsed ?? 0}/{gpuTotal}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>—</Typography>
                        )}
                      </TableCell>
                    );
                  })()}
                  {isAdmin && (
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        {!isDrained && !isDown && (
                          <Tooltip title="DRAIN">
                            <IconButton
                              size="small"
                              onClick={() => { setSelectedNode(node); setAction('DRAIN'); }}
                              sx={{ color: 'warning.main', '&:hover': { bgcolor: 'rgba(245,158,11,0.1)' } }}
                            >
                              <PauseCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(isDrained || isDown) && (
                          <Tooltip title="RESUME">
                            <IconButton
                              size="small"
                              onClick={() => { setSelectedNode(node); setAction('RESUME'); }}
                              sx={{ color: 'success.main', '&:hover': { bgcolor: 'rgba(34,197,94,0.1)' } }}
                            >
                              <PlayCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!isDown && (
                          <Tooltip title="DOWN">
                            <IconButton
                              size="small"
                              onClick={() => { setSelectedNode(node); setAction('DOWN'); }}
                              sx={{ color: 'error.main', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}
                            >
                              <HighlightOffIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {nodes.length === 0 && (
              <TableRow>
                <TableCell colSpan={(isAdmin ? 6 : 5) + (hasGpu ? 1 : 0)} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Узлы не найдены
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <NodeActionDialog
        node={selectedNode}
        action={action}
        onClose={() => { setSelectedNode(null); setAction(null); }}
        onConfirm={(node, req) => updateMutation.mutate({ name: node.name!, req })}
        loading={updateMutation.isPending}
      />
    </>
  );
};

// ─── Вкладка: Партиции ──────────────────────────────────────────────────────

const PartitionsTab = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cluster-partitions'],
    queryFn: clusterApi.getPartitions,
    refetchInterval: 60_000,
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error">Ошибка загрузки партиций</Alert>;

  const partitions = data?.partitions ?? [];

  const fmtTime = (u: { set?: boolean; infinite?: boolean; number?: number } | undefined): string => {
    if (!u || u.set === false) return '—';
    if (u.infinite) return '∞';
    const minutes = u.number;
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Tooltip title="Обновить">
          <IconButton size="small" onClick={() => void refetch()} sx={{ color: 'text.secondary' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Paper sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: (t) => t.palette.mode === 'dark' ? '#151b2d' : '#f1f5f9', color: 'text.secondary', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 } }}>
              <TableCell>Партиция</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Узлы</TableCell>
              <TableCell>CPU</TableCell>
              <TableCell>Память / CPU</TableCell>
              <TableCell>Лимит времени (default / max)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {partitions.map((p) => {
              const stateArr = p.partition?.state ?? [];
              const stateStr = stateArr.join('+') || 'UNKNOWN';
              const isUp = stateStr.toUpperCase().includes('UP');
              const memPerCpu = p.defaults?.memory_per_cpu;

              return (
                <TableRow
                  key={p.name}
                  sx={{ '& td': { borderColor: 'divider', py: 1 }, '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                      {p.name ?? '—'}
                    </Typography>
                    {p.alternate && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        alt: {p.alternate}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={stateStr}
                      size="small"
                      color={isUp ? 'success' : 'error'}
                      variant="outlined"
                      sx={{ fontSize: 11, height: 22 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {p.nodes?.total ?? '—'}
                    </Typography>
                    {p.nodes?.configured && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontFamily: 'monospace' }}>
                        {p.nodes.configured}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {p.cpus?.total ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {memPerCpu != null ? formatMemory(memPerCpu) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                      {fmtTime(p.defaults?.time)} / {fmtTime(p.maximums?.time)}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
            {partitions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Партиции не найдены
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
};

// ─── Вкладка: Диагностика (только ADMIN) ─────────────────────────────────

const DiagnosticsTab = () => {
  const { data: diagData, isLoading: diagLoading, isError: diagError, refetch: refetchDiag } = useQuery({
    queryKey: ['cluster-diag'],
    queryFn: clusterApi.getDiag,
    refetchInterval: 30_000,
  });

  const { data: pingData, isLoading: pingLoading, isError: pingError, refetch: refetchPing } = useQuery({
    queryKey: ['cluster-ping'],
    queryFn: clusterApi.getPing,
    refetchInterval: 15_000,
  });

  const stats = diagData?.statistics;

  return (
    <Box>
      {/* Ping-статус контроллеров */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 12 }}>
          Контроллеры SLURM
        </Typography>
        <Tooltip title="Обновить">
          <IconButton size="small" onClick={() => { void refetchDiag(); void refetchPing(); }} sx={{ color: 'text.secondary' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {pingLoading && <CircularProgress size={20} />}
      {pingError && <Alert severity="error" sx={{ mb: 2 }}>Ошибка проверки ping</Alert>}
      {pingData && (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
          {(pingData.pings ?? []).map((p, i) => (
            <Paper
              key={i}
              sx={{
                px: 2,
                py: 1.5,
                bgcolor: 'background.paper',
                border: `1px solid ${p.pinged === 'UP' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {p.pinged === 'UP'
                ? <CheckCircleOutlineIcon sx={{ color: 'success.main', fontSize: 18 }} />
                : <WarningAmberIcon sx={{ color: 'error.main', fontSize: 18 }} />}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>{p.hostname}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {p.mode} · {p.latency !== undefined ? `${p.latency} ms` : '—'}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Статистика планировщика */}
      <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 12, mb: 1.5 }}>
        Статистика планировщика
      </Typography>

      {diagLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}
      {diagError && <Alert severity="error">Ошибка загрузки диагностики</Alert>}
      {stats && (
        <Grid container spacing={2}>
          {[
            { label: 'Отправлено заданий', value: stats.jobs_submitted ?? 0 },
            { label: 'Запущено заданий', value: stats.jobs_started ?? 0 },
            { label: 'Завершено заданий', value: stats.jobs_completed ?? 0 },
            { label: 'Отменено заданий', value: stats.jobs_canceled ?? 0 },
            { label: 'Упало заданий', value: stats.jobs_failed ?? 0, color: (stats.jobs_failed ?? 0) > 0 ? '#ef4444' : undefined },
            { label: 'В ожидании', value: stats.jobs_pending ?? 0, color: (stats.jobs_pending ?? 0) > 0 ? '#f59e0b' : undefined },
            { label: 'Выполняется', value: stats.jobs_running ?? 0, color: (stats.jobs_running ?? 0) > 0 ? '#22c55e' : undefined },
            { label: 'Поток планировщика', value: stats.server_thread_count ?? 0 },
          ].map(({ label, value, color }) => (
            <Grid item xs={12} sm={6} md={3} key={label}>
              <StatCard label={label} value={value} color={color} />
            </Grid>
          ))}

          {(stats.schedule_cycle_last !== undefined || stats.schedule_cycle_mean !== undefined) && (
            <>
              <Grid item xs={12}>
                <Divider />
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 12, mt: 2, mb: 1.5 }}>
                  Цикл планирования
                </Typography>
              </Grid>
              {[
                { label: 'Последний цикл', value: `${stats.schedule_cycle_last ?? 0} мкс` },
                { label: 'Средний цикл', value: `${stats.schedule_cycle_mean ?? 0} мкс` },
                { label: 'Макс. цикл', value: `${stats.schedule_cycle_max ?? 0} мкс` },
                { label: 'Backfill активен', value: stats.bf_active ? 'Да' : 'Нет', color: stats.bf_active ? '#22c55e' : undefined },
              ].map(({ label, value, color }) => (
                <Grid item xs={12} sm={6} md={3} key={label}>
                  <StatCard label={label} value={value} color={color} />
                </Grid>
              ))}
            </>
          )}
        </Grid>
      )}
    </Box>
  );
};

// ─── Вкладка: Конфиг slurmdbd (только ADMIN) ────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <Typography
    variant="subtitle2"
    sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 12, mb: 1.5 }}
  >
    {title}
  </Typography>
);

const ConfigTab = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['slurm-db-config'],
    queryFn: clusterApi.getDbConfig,
    staleTime: 60_000,
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error">Ошибка загрузки конфигурации slurmdbd</Alert>;

  const clusters: SlurmClusterRec[] = data?.clusters ?? [];
  const tres: SlurmTres[] = data?.tres ?? [];
  const qos: SlurmDbQos[] = data?.qos ?? [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Tooltip title="Обновить">
          <IconButton size="small" onClick={() => void refetch()} sx={{ color: 'text.secondary' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Кластеры ────────────────────────────────────────────────────── */}
      <SectionHeader title="Кластеры" />
      <Paper sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: (t) => t.palette.mode === 'dark' ? '#151b2d' : '#f1f5f9', color: 'text.secondary', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 } }}>
              <TableCell>Имя</TableCell>
              <TableCell>Контроллер</TableCell>
              <TableCell>Версия RPC</TableCell>
              <TableCell>Плагин выбора</TableCell>
              <TableCell>Флаги</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clusters.map((c) => (
              <TableRow key={c.name} sx={{ '& td': { borderColor: 'divider', py: 1 }, '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                    {c.name ?? '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                    {c.controller?.host ? `${c.controller.host}:${c.controller.port ?? '6817'}` : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {c.rpc_version ?? '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {c.select_plugin ?? '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {(c.flags ?? []).map((f) => (
                      <Chip key={f} label={f} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                    ))}
                    {(c.flags ?? []).length === 0 && (
                      <Typography variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {clusters.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>Нет данных</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* ── TRES ────────────────────────────────────────────────────────── */}
      <SectionHeader title="Trackable Resources (TRES)" />
      <Paper sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: (t) => t.palette.mode === 'dark' ? '#151b2d' : '#f1f5f9', color: 'text.secondary', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 } }}>
              <TableCell>ID</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Имя</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tres.map((t, i) => (
              <TableRow key={i} sx={{ '& td': { borderColor: 'divider', py: 1 }, '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t.id ?? '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>{t.type ?? '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t.name || '—'}</Typography>
                </TableCell>
              </TableRow>
            ))}
            {tres.length === 0 && (
              <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>Нет данных</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* ── QOS ─────────────────────────────────────────────────────────── */}
      <SectionHeader title="Quality of Service (QOS)" />
      <Paper sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: (t) => t.palette.mode === 'dark' ? '#151b2d' : '#f1f5f9', color: 'text.secondary', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 } }}>
              <TableCell>ID</TableCell>
              <TableCell>Имя</TableCell>
              <TableCell>Описание</TableCell>
              <TableCell>Приоритет</TableCell>
              <TableCell>Флаги</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {qos.map((q) => (
              <TableRow key={q.id ?? q.name} sx={{ '& td': { borderColor: 'divider', py: 1 }, '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{q.id ?? '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>{q.name ?? '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{q.description || '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {q.priority?.set === false ? '—' : q.priority?.infinite ? '∞' : (q.priority?.number ?? '—')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {(q.flags ?? []).filter((f) => f !== 'NOT_SET').map((f) => (
                      <Chip key={f} label={f} size="small" variant="outlined" color="info" sx={{ fontSize: 10, height: 20 }} />
                    ))}
                    {(q.flags ?? []).filter((f) => f !== 'NOT_SET').length === 0 && (
                      <Typography variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {qos.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>Нет данных</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

// ─── Главная страница ────────────────────────────────────────────────────────

export const ClusterPage = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const [tab, setTab] = useState(0);

  const { data: nodesData, isLoading: nodesLoading } = useQuery({
    queryKey: ['cluster-nodes'],
    queryFn: clusterApi.getNodes,
    refetchInterval: 30_000,
  });

  // Агрегированная статистика
  const nodes = nodesData?.nodes ?? [];
  const totalCpus = nodes.reduce((s, n) => s + (n.cpus ?? 0), 0);
  const allocCpus = nodes.reduce((s, n) => s + (n.alloc_cpus ?? 0), 0);
  const totalMem = nodes.reduce((s, n) => s + (n.real_memory ?? 0), 0);
  const allocMem = nodes.reduce((s, n) => s + (n.alloc_memory ?? 0), 0);
  const idleNodes = nodes.filter((n) => n.state?.includes('idle') || n.state?.some((s) => s.toUpperCase() === 'IDLE')).length;
  const drainNodes = nodes.filter((n) => n.state?.some((s) => s.toUpperCase().includes('DRAIN'))).length;
  const downNodes = nodes.filter((n) => n.state?.some((s) => s.toUpperCase() === 'DOWN')).length;
  const totalGpu = nodes.reduce((s, n) => s + (parseGpuCount(n.gres) ?? 0), 0);
  const usedGpu = nodes.reduce((s, n) => s + (parseGpuCount(n.gres_used) ?? 0), 0);
  const hasClusterGpu = totalGpu > 0;

  const tabs = [
    { label: 'Узлы' },
    { label: 'Партиции' },
    ...(isAdmin ? [{ label: 'Диагностика' }, { label: 'Конфиг' }] : []),
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Заголовок */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Кластер
      </Typography>

      {/* Сводные карточки */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          {nodesLoading
            ? <Paper sx={{ p: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Paper>
            : <StatCard label="Узлов всего" value={nodes.length} sub={`Idle: ${idleNodes} · Drain: ${drainNodes} · Down: ${downNodes}`} />}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {nodesLoading
            ? <Paper sx={{ p: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Paper>
            : (
              <Paper sx={{ p: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>CPU</Typography>
                <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 700 }}>{allocCpus} <Typography component="span" variant="h6" sx={{ color: 'text.secondary', fontWeight: 400 }}>/ {totalCpus}</Typography></Typography>
                <LinearProgress variant="determinate" value={pct(allocCpus, totalCpus)} sx={{ mt: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' } }} />
              </Paper>
            )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {nodesLoading
            ? <Paper sx={{ p: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Paper>
            : (
              <Paper sx={{ p: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>Память</Typography>
                <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 700 }}>{formatMemory(allocMem)} <Typography component="span" variant="h6" sx={{ color: 'text.secondary', fontWeight: 400 }}>/ {formatMemory(totalMem)}</Typography></Typography>
                <LinearProgress variant="determinate" value={pct(allocMem, totalMem)} sx={{ mt: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: 'secondary.main' } }} />
              </Paper>
            )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {nodesLoading
            ? <Paper sx={{ p: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Paper>
            : <StatCard
                label="Загрузка CPU"
                value={`${pct(allocCpus, totalCpus)}%`}
                sub={`Свободно: ${totalCpus - allocCpus} ядер`}
                color={pct(allocCpus, totalCpus) > 80 ? '#f59e0b' : undefined}

              />}
        </Grid>
        {hasClusterGpu && (
          <Grid item xs={12} sm={6} md={3}>
            {nodesLoading
              ? <Paper sx={{ p: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Paper>
              : (
                <Paper sx={{ p: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>GPU</Typography>
                  <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 700, color: 'warning.main' }}>
                    {usedGpu} <Typography component="span" variant="h6" sx={{ color: 'text.secondary', fontWeight: 400 }}>/ {totalGpu}</Typography>
                  </Typography>
                  <LinearProgress variant="determinate" value={pct(usedGpu, totalGpu)} sx={{ mt: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: 'warning.main' } }} />
                </Paper>
              )}
          </Grid>
        )}
      </Grid>

      {/* Вкладки */}
      <Box sx={{ borderBottom: '1px solid', borderBottomColor: 'divider', mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          sx={{
            '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontSize: 14 },
            '& .Mui-selected': { color: 'primary.main' },
            '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
          }}
        >
          {tabs.map((t) => <Tab key={t.label} label={t.label} />)}
        </Tabs>
      </Box>

      {tab === 0 && <NodesTab isAdmin={isAdmin} />}
      {tab === 1 && <PartitionsTab />}
      {tab === 2 && isAdmin && <DiagnosticsTab />}
      {tab === 3 && isAdmin && <ConfigTab />}
    </Box>
  );
};