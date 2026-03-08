import { useState, useMemo } from 'react';
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
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  OutlinedInput,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import TuneIcon from '@mui/icons-material/Tune';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { slurmQosApi } from '@/services/api/slurmQosApi';
import { slurmAccountApi } from '@/services/api/slurmAccountApi';
import TresBuilder from '@/components/common/TresBuilder';
import type {
  SlurmQos,
  SlurmTresItem,
  CreateQosRequest,
  SetAssociationQosRequest,
  SetAssociationLimitsRequest,
} from '@/types/slurm-qos.types';
import type { SlurmAssociation, AssocLimits } from '@/types/slurm-account.types';

// ─── Константы ───────────────────────────────────────────────────────────────

const QOS_FLAGS = [
  { value: 'DenyOnLimit',             label: 'DenyOnLimit — отказ при достижении лимита' },
  { value: 'EnforceUsageThreshold',   label: 'EnforceUsageThreshold — принудительный порог' },
  { value: 'NoDecay',                 label: 'NoDecay — без затухания приоритета' },
  { value: 'NoReserve',               label: 'NoReserve — без резервирования' },
  { value: 'OverPartQOS',             label: 'OverPartQOS — превышение лимитов раздела' },
  { value: 'PartitionMaxNodes',       label: 'PartitionMaxNodes — лимит узлов раздела' },
  { value: 'PartitionMinNodes',       label: 'PartitionMinNodes — мин. узлы раздела' },
  { value: 'PartitionTimeLimit',      label: 'PartitionTimeLimit — лимит времени раздела' },
  { value: 'Relative',               label: 'Relative — относительный fairshare' },
  { value: 'RequiresReservation',     label: 'RequiresReservation — только в резервации' },
  { value: 'UsageFactorSafe',         label: 'UsageFactorSafe — безопасный usagefactor' },
];

// ─── Утилиты ─────────────────────────────────────────────────────────────────

const fmtNum = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : v === -1 ? '∞' : String(v);

const fmtWall = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes === -1) return '∞';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}ч ${m}м`;
};

const getApiError = (e: unknown): string => {
  if (typeof e === 'object' && e !== null) {
    const ae = e as { response?: { data?: unknown } };
    if (ae.response?.data) {
      return typeof ae.response.data === 'string'
        ? ae.response.data
        : JSON.stringify(ae.response.data);
    }
  }
  return String(e);
};

const parseLong = (s: string): number | null =>
  s.trim() === '' ? null : isNaN(Number(s)) ? null : Number(s);

const parseStr = (s: string): string | undefined => (s.trim() === '' ? undefined : s.trim());

const parseFloat_ = (s: string): number | null =>
  s.trim() === '' ? null : isNaN(parseFloat(s)) ? null : parseFloat(s);

const parseInt_ = (s: string): number | null =>
  s.trim() === '' ? null : isNaN(parseInt(s)) ? null : parseInt(s);

/** Compact summary + full tooltip for association limits */
function buildLimitsParts(limits: AssocLimits): string[] {
  const parts: string[] = [];
  // Групповые — показываем первыми
  if (limits.grpJobs != null)        parts.push(`GrpJobs: ${fmtNum(limits.grpJobs)}`);
  if (limits.grpSubmitJobs != null)  parts.push(`GrpSubmit: ${fmtNum(limits.grpSubmitJobs)}`);
  if (limits.grpJobsAccrue != null)  parts.push(`GrpJobsAccrue: ${fmtNum(limits.grpJobsAccrue)}`);
  if (limits.grpWallMinutes != null) parts.push(`GrpWall: ${fmtWall(limits.grpWallMinutes)}`);
  if (limits.grpTres)                parts.push(`GrpTRES: ${limits.grpTres}`);
  if (limits.grpTresMins)            parts.push(`GrpTRESMins: ${limits.grpTresMins}`);
  if (limits.grpTresRunMins)         parts.push(`GrpTRESRun: ${limits.grpTresRunMins}`);
  // Индивидуальные
  if (limits.maxJobs != null)        parts.push(`MaxJobs: ${fmtNum(limits.maxJobs)}`);
  if (limits.maxSubmitJobs != null)  parts.push(`MaxSubmit: ${fmtNum(limits.maxSubmitJobs)}`);
  if (limits.maxJobsAccrue != null)  parts.push(`MaxJobsAccrue: ${fmtNum(limits.maxJobsAccrue)}`);
  if (limits.maxWallMinutes != null) parts.push(`MaxWall: ${fmtWall(limits.maxWallMinutes)}`);
  if (limits.maxTresPerJob)          parts.push(`MaxTRES/Job: ${limits.maxTresPerJob}`);
  if (limits.maxTresPerNode)         parts.push(`MaxTRES/Node: ${limits.maxTresPerNode}`);
  if (limits.maxTresMinsPerJob)      parts.push(`MaxTRESMins/Job: ${limits.maxTresMinsPerJob}`);
  // Прочее
  if (limits.fairshare != null && limits.fairshare > 0) parts.push(`FS: ${limits.fairshare}`);
  return parts;
}

// ─── Стили ───────────────────────────────────────────────────────────────────

const cellSx = { py: 0.75, px: 1.5, color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.08)' };
const rowHoverSx = { '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } };
const headSx = { bgcolor: '#0f172a', color: 'rgba(255,255,255,0.55)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1, px: 1.5, borderColor: 'rgba(255,255,255,0.08)' };
const paperSx = { bgcolor: '#1a2035', borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' };
const dialogSx = { '& .MuiDialog-paper': { bgcolor: '#1a2035', minWidth: 560, maxWidth: 780 } };
const accordionSx = { bgcolor: '#111827', border: '1px solid rgba(255,255,255,0.08)', '&:before': { display: 'none' }, mb: 1 };

// ─── QosFormState ────────────────────────────────────────────────────────────

interface QosFormState {
  name: string;
  description: string;
  priority: string;
  flags: string[];
  graceTime: string;
  usageFactor: string;
  usageThreshold: string;
  limitFactor: string;
  minPrioThreshold: string;
  // GRP
  grpJobs: string;
  grpJobsAccrue: string;
  grpSubmitJobs: string;
  grpWallMinutes: string;
  grpTres: string;
  grpTresMins: string;
  grpTresRunMins: string;
  // Per-user
  maxJobsPerUser: string;
  maxJobsAccruePerUser: string;
  maxSubmitJobsPerUser: string;
  maxTresPerUser: string;
  // Per-account
  maxJobsPerAccount: string;
  maxJobsAccruePerAccount: string;
  maxSubmitJobsPerAccount: string;
  maxTresPerAccount: string;
  // Per-job
  maxTresPerJob: string;
  maxTresPerNode: string;
  maxTresMinsPerJob: string;
  maxWallDurationPerJobMinutes: string;
  minTresPerJob: string;
}

const emptyQosForm = (): QosFormState => ({
  name: '', description: '', priority: '', flags: [],
  graceTime: '', usageFactor: '', usageThreshold: '', limitFactor: '', minPrioThreshold: '',
  grpJobs: '', grpJobsAccrue: '', grpSubmitJobs: '', grpWallMinutes: '',
  grpTres: '', grpTresMins: '', grpTresRunMins: '',
  maxJobsPerUser: '', maxJobsAccruePerUser: '', maxSubmitJobsPerUser: '', maxTresPerUser: '',
  maxJobsPerAccount: '', maxJobsAccruePerAccount: '', maxSubmitJobsPerAccount: '', maxTresPerAccount: '',
  maxTresPerJob: '', maxTresPerNode: '', maxTresMinsPerJob: '',
  maxWallDurationPerJobMinutes: '', minTresPerJob: '',
});

const qosToForm = (q: SlurmQos): QosFormState => ({
  name: q.name,
  description: q.description ?? '',
  priority: q.priority != null ? String(q.priority) : '',
  flags: q.flags ?? [],
  graceTime: q.graceTime != null ? String(q.graceTime) : '',
  usageFactor: q.usageFactor != null ? String(q.usageFactor) : '',
  usageThreshold: q.usageThreshold != null ? String(q.usageThreshold) : '',
  limitFactor: q.limitFactor != null ? String(q.limitFactor) : '',
  minPrioThreshold: q.minPrioThreshold != null ? String(q.minPrioThreshold) : '',
  grpJobs: q.grpJobs != null ? String(q.grpJobs) : '',
  grpJobsAccrue: q.grpJobsAccrue != null ? String(q.grpJobsAccrue) : '',
  grpSubmitJobs: q.grpSubmitJobs != null ? String(q.grpSubmitJobs) : '',
  grpWallMinutes: q.grpWallMinutes != null ? String(q.grpWallMinutes) : '',
  grpTres: q.grpTres ?? '',
  grpTresMins: q.grpTresMins ?? '',
  grpTresRunMins: q.grpTresRunMins ?? '',
  maxJobsPerUser: q.maxJobsPerUser != null ? String(q.maxJobsPerUser) : '',
  maxJobsAccruePerUser: q.maxJobsAccruePerUser != null ? String(q.maxJobsAccruePerUser) : '',
  maxSubmitJobsPerUser: q.maxSubmitJobsPerUser != null ? String(q.maxSubmitJobsPerUser) : '',
  maxTresPerUser: q.maxTresPerUser ?? '',
  maxJobsPerAccount: q.maxJobsPerAccount != null ? String(q.maxJobsPerAccount) : '',
  maxJobsAccruePerAccount: q.maxJobsAccruePerAccount != null ? String(q.maxJobsAccruePerAccount) : '',
  maxSubmitJobsPerAccount: q.maxSubmitJobsPerAccount != null ? String(q.maxSubmitJobsPerAccount) : '',
  maxTresPerAccount: q.maxTresPerAccount ?? '',
  maxTresPerJob: q.maxTresPerJob ?? '',
  maxTresPerNode: q.maxTresPerNode ?? '',
  maxTresMinsPerJob: q.maxTresMinsPerJob ?? '',
  maxWallDurationPerJobMinutes: q.maxWallDurationPerJobMinutes != null ? String(q.maxWallDurationPerJobMinutes) : '',
  minTresPerJob: q.minTresPerJob ?? '',
});

const formToRequest = (f: QosFormState): CreateQosRequest => ({
  name: f.name.trim(),
  description: parseStr(f.description),
  priority: parseLong(f.priority),
  flags: f.flags.length ? f.flags : undefined,
  graceTime: parseInt_(f.graceTime),
  usageFactor: parseFloat_(f.usageFactor),
  usageThreshold: parseFloat_(f.usageThreshold),
  limitFactor: parseFloat_(f.limitFactor),
  minPrioThreshold: parseLong(f.minPrioThreshold),
  grpJobs: parseLong(f.grpJobs),
  grpJobsAccrue: parseLong(f.grpJobsAccrue),
  grpSubmitJobs: parseLong(f.grpSubmitJobs),
  grpWallMinutes: parseLong(f.grpWallMinutes),
  grpTres: parseStr(f.grpTres),
  grpTresMins: parseStr(f.grpTresMins),
  grpTresRunMins: parseStr(f.grpTresRunMins),
  maxJobsPerUser: parseLong(f.maxJobsPerUser),
  maxJobsAccruePerUser: parseLong(f.maxJobsAccruePerUser),
  maxSubmitJobsPerUser: parseLong(f.maxSubmitJobsPerUser),
  maxTresPerUser: parseStr(f.maxTresPerUser),
  maxJobsPerAccount: parseLong(f.maxJobsPerAccount),
  maxJobsAccruePerAccount: parseLong(f.maxJobsAccruePerAccount),
  maxSubmitJobsPerAccount: parseLong(f.maxSubmitJobsPerAccount),
  maxTresPerAccount: parseStr(f.maxTresPerAccount),
  maxTresPerJob: parseStr(f.maxTresPerJob),
  maxTresPerNode: parseStr(f.maxTresPerNode),
  maxTresMinsPerJob: parseStr(f.maxTresMinsPerJob),
  maxWallDurationPerJobMinutes: parseLong(f.maxWallDurationPerJobMinutes),
  minTresPerJob: parseStr(f.minTresPerJob),
});

// ─── HelpDialog ──────────────────────────────────────────────────────────────

const PARAM_DOCS = [
  { section: 'Основные параметры' },
  { name: 'Приоритет (Priority)', desc: 'Числовой приоритет QOS. Задания с более высоким Priority получают ресурсы первыми. Диапазон: 0–2147483647.' },
  { name: 'Флаги (Flags)', desc: 'Набор флагов поведения: DenyOnLimit — отклонять задания при достижении лимита; NoDecay — не уменьшать fairshare со временем; OverPartQOS — разрешает превышать лимиты раздела.' },
  { name: 'GraceTime', desc: 'Время (сек.), которое задание может превышать лимиты QOS перед завершением. Используется только с DenyOnLimit.' },
  { name: 'UsageFactor', desc: 'Множитель потребления TRES для fairshare. 1.0 = стандарт, 2.0 = двойное использование, 0.5 = полная стоимость.' },
  { name: 'UsageThreshold', desc: 'Минимальный порог использования fairshare. Если fairshare < порога, задание не запускается (с EnforceUsageThreshold).' },
  { name: 'LimitFactor', desc: 'Множитель лимитов GrpTRES для этого QOS. Позволяет динамически изменять групповые лимиты.' },
  { name: 'MinPrioThreshold', desc: 'Минимальный порог приоритета задания для попадания в очередь с этим QOS.' },

  { section: 'Групповые лимиты (GRP*)' },
  { name: 'GrpJobs', desc: 'Максимальное количество одновременно выполняющихся заданий для всех пользователей этого QOS.' },
  { name: 'GrpJobsAccrue', desc: 'Максимальное количество заданий, накапливающих приоритет (accruing) одновременно в этом QOS.' },
  { name: 'GrpSubmitJobs', desc: 'Максимальное количество заданий в очереди + выполняющихся для всего QOS.' },
  { name: 'GrpWall', desc: 'Суммарное wall-время (в минутах) для всех заданий QOS. Обновляется при окончании задания.' },
  { name: 'GrpTRES', desc: 'Суммарный лимит TRES (ресурсов) для всех заданий QOS. Формат: cpu=100,gres/gpu=4,mem=200G.' },
  { name: 'GrpTRESMins', desc: 'Суммарный лимит TRES-минут для всех заданий QOS. После исчерпания новые задания не запускаются.' },
  { name: 'GrpTRESRunMins', desc: 'Лимит TRES-минут для одновременно выполняющихся заданий в QOS.' },

  { section: 'Лимиты на пользователя (MaxJobs/User)' },
  { name: 'MaxJobsPerUser', desc: 'Максимальное количество одновременно выполняющихся заданий на одного пользователя в этом QOS.' },
  { name: 'MaxJobsAccruePerUser', desc: 'Максимальное количество заданий, набирающих приоритет, на одного пользователя.' },
  { name: 'MaxSubmitJobsPerUser', desc: 'Максимальное количество заданий в очереди + выполняющихся на одного пользователя.' },
  { name: 'MaxTRESPerUser', desc: 'Максимальный суммарный TRES на одного пользователя в этом QOS.' },

  { section: 'Лимиты на аккаунт (MaxJobs/Account)' },
  { name: 'MaxJobsPerAccount', desc: 'Максимальное количество одновременно выполняющихся заданий на один аккаунт.' },
  { name: 'MaxJobsAccruePerAccount', desc: 'Максимальное количество заданий, набирающих приоритет, на один аккаунт.' },
  { name: 'MaxSubmitJobsPerAccount', desc: 'Максимальное количество заданий в очереди + выполняющихся на один аккаунт.' },
  { name: 'MaxTRESPerAccount', desc: 'Максимальный суммарный TRES на один аккаунт в этом QOS.' },

  { section: 'Лимиты на задание (Per-Job)' },
  { name: 'MaxWallDurationPerJob', desc: 'Максимальное время выполнения одного задания (в минутах). -1 = без ограничений.' },
  { name: 'MaxTRESPerJob', desc: 'Максимальный TRES, который может запросить одно задание. Например: cpu=32,mem=64G.' },
  { name: 'MaxTRESPerNode', desc: 'Максимальный TRES на узел для одного задания.' },
  { name: 'MaxTRESMinsPerJob', desc: 'Максимальное количество TRES-минут на одно задание (cpu×минуты, gpu×минуты и т.д.).' },
  { name: 'MinTRESPerJob', desc: 'Минимальный TRES, который задание обязано запросить. Задания с меньшими ресурсами отклоняются.' },

  { section: 'Личные лимиты ассоциации' },
  { name: 'Личные лимиты пользователя', desc: 'Устанавливаются через "Установить личные лимиты" для user-ассоциации (вкладка Пользователи). Действуют только для этого пользователя в данном аккаунте, не затрагивая других.' },
  { name: 'Fairshare', desc: 'Вес пользователя в fairshare-планировании. Большее значение → более высокий приоритет при прочих равных условиях.' },
];

function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} sx={{ '& .MuiDialog-paper': { bgcolor: '#1a2035', maxWidth: 680, width: '100%', maxHeight: '80vh' } }}>
      <DialogTitle sx={{ color: 'rgba(255,255,255,0.9)', pb: 1 }}>
        Справка по параметрам QOS
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Значение <strong>-1</strong> означает «без ограничений» (UNLIMITED).
          Пустое поле — параметр не изменяется.
          TRES формат: <code>cpu=100,gres/gpu=4,mem=200G</code>
        </Typography>
        <List dense disablePadding>
          {PARAM_DOCS.map((item, i) => {
            if ('section' in item && !('name' in item)) {
              return (
                <Box key={i} sx={{ mt: i > 0 ? 2 : 0, mb: 0.5 }}>
                  <Typography variant="subtitle2" color="primary.light" sx={{ fontWeight: 700 }}>
                    {item.section}
                  </Typography>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mt: 0.5 }} />
                </Box>
              );
            }
            const doc = item as { name: string; desc: string };
            return (
              <ListItem key={i} disableGutters sx={{ py: 0.5, alignItems: 'flex-start' }}>
                <ListItemText
                  primary={<Typography variant="body2" sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{doc.name}</Typography>}
                  secondary={<Typography variant="caption" color="text.secondary">{doc.desc}</Typography>}
                />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── QosFormSections ─────────────────────────────────────────────────────────

function QosFormSections({
  form,
  onChange,
  tresCatalog,
  isCreate,
}: {
  form: QosFormState;
  onChange: (patch: Partial<QosFormState>) => void;
  tresCatalog: SlurmTresItem[];
  isCreate?: boolean;
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  const tf = (label: string, field: keyof QosFormState, placeholder = '-1 = без лимита') => (
    <TextField
      label={label}
      value={form[field] as string}
      onChange={(e) => onChange({ [field]: e.target.value })}
      size="small"
      fullWidth
      placeholder={placeholder}
      InputLabelProps={{ shrink: true }}
    />
  );

  const tres = (field: keyof QosFormState, label: string, helperText?: string) => (
    <TresBuilder
      label={label}
      value={form[field] as string}
      onChange={(v) => onChange({ [field]: v })}
      availableTres={tresCatalog}
      helperText={helperText}
    />
  );

  return (
    <>
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Button size="small" startIcon={<HelpOutlineIcon />} onClick={() => setHelpOpen(true)}>
          Справка по параметрам
        </Button>
      </Box>

      {/* 1. Основные параметры */}
      <Accordion defaultExpanded sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Основные параметры</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {isCreate && (
              <Box sx={{ gridColumn: '1 / -1' }}>
                {tf('Имя QOS *', 'name', 'Латинские буквы, цифры, дефис')}
              </Box>
            )}
            <Box sx={{ gridColumn: '1 / -1' }}>
              {tf('Описание', 'description', '')}
            </Box>
            {tf('Приоритет', 'priority')}
            {tf('GraceTime (сек.)', 'graceTime', '0')}
            {tf('UsageFactor', 'usageFactor', '1.0')}
            {tf('UsageThreshold', 'usageThreshold', '0.0')}
            {tf('LimitFactor', 'limitFactor', '1.0')}
            {tf('MinPrioThreshold', 'minPrioThreshold')}
          </Box>

          <FormControl fullWidth size="small" sx={{ mt: 2 }}>
            <InputLabel>Флаги</InputLabel>
            <Select
              multiple
              value={form.flags}
              onChange={(e) => onChange({ flags: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
              input={<OutlinedInput label="Флаги" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((v) => <Chip key={v} label={v} size="small" />)}
                </Box>
              )}
            >
              {QOS_FLAGS.map((f) => (
                <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </AccordionDetails>
      </Accordion>

      {/* 2. Групповые лимиты */}
      <Accordion sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Групповые лимиты QOS (GRP*)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Суммарные лимиты для всех пользователей этого QOS
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {tf('GrpJobs', 'grpJobs')}
            {tf('GrpJobsAccrue', 'grpJobsAccrue')}
            {tf('GrpSubmitJobs', 'grpSubmitJobs')}
            {tf('GrpWall (мин.)', 'grpWallMinutes')}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {tres('grpTres', 'GrpTRES', 'Суммарный лимит ресурсов для всего QOS')}
            {tres('grpTresMins', 'GrpTRESMins', 'Суммарный лимит TRES-минут (cpu×мин, gpu×мин...)')}
            {tres('grpTresRunMins', 'GrpTRESRunMins', 'Лимит TRES-минут для одновременно выполняющихся заданий')}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 3. Лимиты на пользователя */}
      <Accordion sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Лимиты на пользователя (Max.../User)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Ограничения на каждого отдельного пользователя в рамках этого QOS
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {tf('MaxJobsPerUser', 'maxJobsPerUser')}
            {tf('MaxJobsAccruePerUser', 'maxJobsAccruePerUser')}
            {tf('MaxSubmitJobsPerUser', 'maxSubmitJobsPerUser')}
          </Box>
          <Box sx={{ mt: 2 }}>
            {tres('maxTresPerUser', 'MaxTRESPerUser', 'Максимальный суммарный TRES на одного пользователя')}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 4. Лимиты на аккаунт */}
      <Accordion sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Лимиты на аккаунт (Max.../Account)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Ограничения на каждый slurm-аккаунт в рамках этого QOS
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {tf('MaxJobsPerAccount', 'maxJobsPerAccount')}
            {tf('MaxJobsAccruePerAccount', 'maxJobsAccruePerAccount')}
            {tf('MaxSubmitJobsPerAccount', 'maxSubmitJobsPerAccount')}
          </Box>
          <Box sx={{ mt: 2 }}>
            {tres('maxTresPerAccount', 'MaxTRESPerAccount', 'Максимальный суммарный TRES на один аккаунт')}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 5. Лимиты на задание */}
      <Accordion sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Лимиты на задание (Per-Job)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            {tf('MaxWall (мин.)', 'maxWallDurationPerJobMinutes')}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tres('maxTresPerJob', 'MaxTRESPerJob', 'Максимальный TRES на одно задание (cpu=32,gres/gpu=2)')}
            {tres('maxTresPerNode', 'MaxTRESPerNode', 'Максимальный TRES на узел для одного задания')}
            {tres('maxTresMinsPerJob', 'MaxTRESMinsPerJob', 'Максимальные TRES-минуты на одно задание')}
            {tres('minTresPerJob', 'MinTRESPerJob', 'Минимальный TRES, который задание обязано запросить')}
          </Box>
        </AccordionDetails>
      </Accordion>
    </>
  );
}

// ─── CreateQosDialog ─────────────────────────────────────────────────────────

function CreateQosDialog({ onClose, tresCatalog }: { onClose: () => void; tresCatalog: SlurmTresItem[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<QosFormState>(emptyQosForm());
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => slurmQosApi.createQos(formToRequest(form)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['slurm-qos'] }); onClose(); },
    onError: (e) => setError(getApiError(e)),
  });

  return (
    <Dialog open onClose={onClose} sx={dialogSx}>
      <DialogTitle sx={{ color: 'rgba(255,255,255,0.9)' }}>Создать QOS</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        <QosFormSections
          form={form}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          tresCatalog={tresCatalog}
          isCreate
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button
          variant="contained"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.name.trim()}
        >
          {mutation.isPending ? <CircularProgress size={18} /> : 'Создать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── EditQosDialog ────────────────────────────────────────────────────────────

function EditQosDialog({ qos, onClose, tresCatalog }: { qos: SlurmQos; onClose: () => void; tresCatalog: SlurmTresItem[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<QosFormState>(() => qosToForm(qos));
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => slurmQosApi.modifyQos(qos.name, formToRequest(form)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['slurm-qos'] }); onClose(); },
    onError: (e) => setError(getApiError(e)),
  });

  return (
    <Dialog open onClose={onClose} sx={dialogSx}>
      <DialogTitle sx={{ color: 'rgba(255,255,255,0.9)' }}>Изменить QOS: {qos.name}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        <QosFormSections
          form={form}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          tresCatalog={tresCatalog}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={18} /> : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── DeleteQosDialog ──────────────────────────────────────────────────────────

function DeleteQosDialog({ qos, onClose }: { qos: SlurmQos; onClose: () => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => slurmQosApi.deleteQos(qos.name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['slurm-qos'] }); onClose(); },
    onError: (e) => setError(getApiError(e)),
  });

  return (
    <Dialog open onClose={onClose} sx={{ '& .MuiDialog-paper': { bgcolor: '#1a2035', minWidth: 400 } }}>
      <DialogTitle sx={{ color: 'rgba(255,255,255,0.9)' }}>Удалить QOS</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Alert severity="warning" sx={{ mb: 2 }}>
          Все задания, использующие QOS <strong>{qos.name}</strong>, потеряют доступ к нему.
        </Alert>
        <Typography color="text.secondary">
          Удалить QOS <strong style={{ color: '#fff' }}>{qos.name}</strong>?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button color="error" variant="contained" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={18} /> : 'Удалить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── SetAssocQosDialog ────────────────────────────────────────────────────────

function SetAssocQosDialog({
  assoc,
  availableQos,
  onClose,
}: {
  assoc: SlurmAssociation;
  availableQos: SlurmQos[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [selectedQos, setSelectedQos] = useState<string[]>(assoc.qos ?? []);
  const [defaultQos, setDefaultQos] = useState(assoc.default?.qos ?? '');
  const [error, setError] = useState('');

  const isAccountLevel = !assoc.user || assoc.user === '';

  const mutation = useMutation({
    mutationFn: () =>
      slurmQosApi.setAssociationQos({
        account: assoc.account,
        user: isAccountLevel ? undefined : assoc.user,
        qos: selectedQos,
        defaultQos: defaultQos || undefined,
      } as SetAssociationQosRequest),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['slurm-associations'] }); onClose(); },
    onError: (e) => setError(getApiError(e)),
  });

  const qosNames = availableQos.map((q) => q.name);

  return (
    <Dialog open onClose={onClose} sx={{ '& .MuiDialog-paper': { bgcolor: '#1a2035', minWidth: 480 } }}>
      <DialogTitle sx={{ color: 'rgba(255,255,255,0.9)' }}>
        Назначить QOS — {isAccountLevel ? `аккаунт ${assoc.account}` : `${assoc.user}@${assoc.account}`}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {isAccountLevel ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            QOS назначается всему аккаунту <strong>{assoc.account}</strong>.
            Пользователи смогут использовать эти QOS, если они разрешены также на уровне пользователя.
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            QOS назначается конкретному пользователю <strong>{assoc.user}</strong> в аккаунте <strong>{assoc.account}</strong>.
            Пользователь может использовать только QOS, разрешённые и на уровне аккаунта.
          </Alert>
        )}

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Разрешённые QOS</InputLabel>
          <Select
            multiple
            value={selectedQos}
            onChange={(e) => setSelectedQos(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value as string[])}
            input={<OutlinedInput label="Разрешённые QOS" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((v) => <Chip key={v} label={v} size="small" />)}
              </Box>
            )}
          >
            {qosNames.map((n) => (
              <MenuItem key={n} value={n}>{n}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Default QOS</InputLabel>
          <Select
            value={defaultQos}
            onChange={(e) => setDefaultQos(e.target.value)}
            label="Default QOS"
          >
            <MenuItem value="">(не задан)</MenuItem>
            {selectedQos.map((n) => (
              <MenuItem key={n} value={n}>{n}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={18} /> : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── SetAssocLimitsDialog ─────────────────────────────────────────────────────

interface AssocLimitsForm {
  maxJobs: string; maxJobsAccrue: string; maxSubmitJobs: string; maxWallMinutes: string;
  maxTresPerJob: string; maxTresPerNode: string; maxTresMinsPerJob: string;
  fairshare: string;
}

const emptyLimits = (): AssocLimitsForm => ({
  maxJobs: '', maxJobsAccrue: '', maxSubmitJobs: '', maxWallMinutes: '',
  maxTresPerJob: '', maxTresPerNode: '', maxTresMinsPerJob: '',
  fairshare: '',
});

function SetAssocLimitsDialog({
  assoc,
  onClose,
  tresCatalog,
}: {
  assoc: SlurmAssociation;
  onClose: () => void;
  tresCatalog: SlurmTresItem[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<AssocLimitsForm>(() => {
    const l = assoc.limits;
    if (!l) return emptyLimits();
    const str = (v: number | null | undefined) => (v != null ? String(v) : '');
    return {
      maxJobs:        str(l.maxJobs),
      maxJobsAccrue:  str(l.maxJobsAccrue),
      maxSubmitJobs:  str(l.maxSubmitJobs),
      maxWallMinutes: str(l.maxWallMinutes),
      maxTresPerJob:   l.maxTresPerJob ?? '',
      maxTresPerNode:  l.maxTresPerNode ?? '',
      maxTresMinsPerJob: l.maxTresMinsPerJob ?? '',
      fairshare: str(l.fairshare),
    };
  });
  const [error, setError] = useState('');

  const patch = (p: Partial<AssocLimitsForm>) => setForm((prev) => ({ ...prev, ...p }));

  const mutation = useMutation({
    mutationFn: () => {
      const req: SetAssociationLimitsRequest = {
        account: assoc.account ?? '',
        user: assoc.user,
        maxJobs: parseLong(form.maxJobs),
        maxJobsAccrue: parseLong(form.maxJobsAccrue),
        maxSubmitJobs: parseLong(form.maxSubmitJobs),
        maxWallMinutes: parseLong(form.maxWallMinutes),
        maxTresPerJob: parseStr(form.maxTresPerJob),
        maxTresPerNode: parseStr(form.maxTresPerNode),
        maxTresMinsPerJob: parseStr(form.maxTresMinsPerJob),
        fairshare: parseInt_(form.fairshare),
      };
      return slurmQosApi.setAssociationLimits(req);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['slurm-associations'] }); onClose(); },
    onError: (e) => setError(getApiError(e)),
  });

  const ltf = (label: string, field: keyof AssocLimitsForm) => (
    <TextField
      label={label}
      value={form[field]}
      onChange={(e) => patch({ [field]: e.target.value })}
      size="small"
      fullWidth
      placeholder="-1 = без лимита"
      InputLabelProps={{ shrink: true }}
    />
  );

  const ltres = (field: keyof AssocLimitsForm, label: string, helper?: string) => (
    <TresBuilder
      label={label}
      value={form[field]}
      onChange={(v) => patch({ [field]: v })}
      availableTres={tresCatalog}
      helperText={helper}
    />
  );

  return (
    <Dialog open onClose={onClose} sx={dialogSx}>
      <DialogTitle sx={{ color: 'rgba(255,255,255,0.9)' }}>
        Личные лимиты — {assoc.user}@{assoc.account}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Alert severity="info" sx={{ mb: 2 }}>
          Ограничения только для <strong>{assoc.user}</strong> в аккаунте <strong>{assoc.account}</strong>.
          Не влияют на других пользователей этого аккаунта.
        </Alert>

        {/* Индивидуальные лимиты */}
        <Accordion defaultExpanded sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Личные лимиты пользователя</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              {ltf('MaxJobs', 'maxJobs')}
              {ltf('MaxJobsAccrue', 'maxJobsAccrue')}
              {ltf('MaxSubmitJobs', 'maxSubmitJobs')}
              {ltf('MaxWall (мин.)', 'maxWallMinutes')}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {ltres('maxTresPerJob', 'MaxTRESPerJob', 'Максимальный TRES на одно задание')}
              {ltres('maxTresPerNode', 'MaxTRESPerNode', 'Максимальный TRES на узел')}
              {ltres('maxTresMinsPerJob', 'MaxTRESMinsPerJob', 'Максимальные TRES-минуты на задание')}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Прочее */}
        <Accordion sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Прочее</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {ltf('Fairshare', 'fairshare')}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Вес в fairshare-планировании. Большее значение → выше приоритет.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <CircularProgress size={18} /> : 'Применить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── QosTab (main) ────────────────────────────────────────────────────────────

export default function QosTab() {
  // Data queries
  const { data: qosData, isLoading: qosLoading, refetch: refetchQos } = useQuery({
    queryKey: ['slurm-qos'],
    queryFn: slurmQosApi.getQosList,
  });

  const { data: assocData, isLoading: assocLoading, refetch: refetchAssoc } = useQuery({
    queryKey: ['slurm-associations'],
    queryFn: () => slurmAccountApi.getAssociations(),
  });

  const { data: tresData } = useQuery({
    queryKey: ['slurm-tres'],
    queryFn: slurmQosApi.getTresList,
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  const tresCatalog: SlurmTresItem[] = tresData ?? [];
  const qosList = useMemo(() => qosData?.qos ?? [], [qosData]);
  const allAssociations = useMemo(() => assocData?.associations ?? [], [assocData]);

  // Association tabs: 0 = Аккаунты, 1 = Пользователи
  const [assocTab, setAssocTab] = useState(0);
  const accountAssociations = useMemo(
    () => allAssociations.filter((a) => !a.user || a.user === ''),
    [allAssociations]
  );
  const userAssociations = useMemo(
    () => allAssociations.filter((a) => a.user && a.user !== ''),
    [allAssociations]
  );

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editQos, setEditQos] = useState<SlurmQos | null>(null);
  const [deleteQos_, setDeleteQos] = useState<SlurmQos | null>(null);
  const [setQosAssoc, setSetQosAssoc] = useState<SlurmAssociation | null>(null);
  const [setLimitsAssoc, setSetLimitsAssoc] = useState<SlurmAssociation | null>(null);

  const displayedAssociations = assocTab === 0 ? accountAssociations : userAssociations;

  return (
    <Box>
      {/* ── QOS Table ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)' }}>
          Quality of Service (QOS)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Обновить">
            <IconButton size="small" onClick={() => refetchQos()} sx={{ color: 'rgba(255,255,255,0.6)' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Создать QOS
          </Button>
        </Box>
      </Box>

      <Paper sx={{ ...paperSx, mb: 4 }}>
        {qosLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                {['ID', 'Имя', 'Приоритет', 'Флаги', 'GrpTRES', 'MaxJobs/User', 'MaxWall/Job', 'Действия'].map((h) => (
                  <TableCell key={h} sx={headSx}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {qosList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ ...cellSx, py: 3, color: 'rgba(255,255,255,0.4)' }}>
                    QOS не найдены
                  </TableCell>
                </TableRow>
              ) : (
                qosList.map((q) => (
                  <TableRow key={q.name} sx={rowHoverSx}>
                    <TableCell sx={cellSx}>{q.id ?? '—'}</TableCell>
                    <TableCell sx={cellSx}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{q.name}</Typography>
                      {q.description && (
                        <Typography variant="caption" color="text.secondary">{q.description}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={cellSx}>{fmtNum(q.priority)}</TableCell>
                    <TableCell sx={cellSx}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(q.flags ?? []).slice(0, 3).map((f) => (
                          <Chip key={f} label={f} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                        ))}
                        {(q.flags?.length ?? 0) > 3 && (
                          <Chip label={`+${(q.flags?.length ?? 0) - 3}`} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={cellSx}>{q.grpTres || '—'}</TableCell>
                    <TableCell sx={cellSx}>{fmtNum(q.maxJobsPerUser)}</TableCell>
                    <TableCell sx={cellSx}>{fmtWall(q.maxWallDurationPerJobMinutes)}</TableCell>
                    <TableCell sx={cellSx}>
                      <Tooltip title="Изменить">
                        <IconButton size="small" onClick={() => setEditQos(q)} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton size="small" onClick={() => setDeleteQos(q)} sx={{ color: 'rgba(255,100,100,0.7)' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* ── Associations ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)' }}>
          Ассоциации
        </Typography>
        <Tooltip title="Обновить">
          <IconButton size="small" onClick={() => refetchAssoc()} sx={{ color: 'rgba(255,255,255,0.6)' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <Tabs
          value={assocTab}
          onChange={(_, v) => setAssocTab(v)}
          sx={{ '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', minHeight: 36, py: 0.5 }, '& .Mui-selected': { color: 'rgba(255,255,255,0.9)' } }}
        >
          <Tab label={`Аккаунты (${accountAssociations.length})`} />
          <Tab label={`Пользователи (${userAssociations.length})`} />
        </Tabs>
      </Box>

      {assocTab === 0 && (
        <Alert severity="info" variant="outlined" sx={{ mb: 1, borderColor: 'rgba(100,180,255,0.3)', color: 'rgba(255,255,255,0.7)' }}>
          Ассоциации аккаунтов определяют доступные QOS для всего аккаунта. Назначить QOS можно через кнопку <PlaylistAddCheckIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} />.
        </Alert>
      )}
      {assocTab === 1 && (
        <Alert severity="info" variant="outlined" sx={{ mb: 1, borderColor: 'rgba(100,255,180,0.3)', color: 'rgba(255,255,255,0.7)' }}>
          Личные лимиты пользователя устанавливаются через <TuneIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} /> — действуют только для конкретного пользователя в рамках аккаунта.
        </Alert>
      )}

      <Paper sx={paperSx}>
        {assocLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                {assocTab === 0
                  ? ['Аккаунт', 'QOS', 'Default QOS', 'Действия'].map((h) => (
                      <TableCell key={h} sx={headSx}>{h}</TableCell>
                    ))
                  : ['Пользователь', 'Аккаунт', 'QOS', 'Default QOS', 'Лимиты', 'Действия'].map((h) => (
                      <TableCell key={h} sx={headSx}>{h}</TableCell>
                    ))
                }
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedAssociations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ ...cellSx, py: 3, color: 'rgba(255,255,255,0.4)' }}>
                    Ассоциации не найдены
                  </TableCell>
                </TableRow>
              ) : (
                displayedAssociations.map((assoc, idx) => (
                  <TableRow key={idx} sx={rowHoverSx}>
                    {assocTab === 1 && (
                      <TableCell sx={cellSx}>{assoc.user}</TableCell>
                    )}
                    <TableCell sx={cellSx}>{assoc.account}</TableCell>
                    <TableCell sx={cellSx}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(assoc.qos ?? []).slice(0, 4).map((q) => (
                          <Chip key={q} label={q} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                        ))}
                        {(assoc.qos?.length ?? 0) > 4 && (
                          <Chip label={`+${(assoc.qos?.length ?? 0) - 4}`} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={cellSx}>{assoc.default?.qos ?? '—'}</TableCell>
                    {assocTab === 1 && (
                      <TableCell sx={{ ...cellSx, maxWidth: 220 }}>
                        {(() => {
                          const parts = assoc.limits ? buildLimitsParts(assoc.limits) : [];
                          if (parts.length === 0) return <Typography variant="caption" color="text.secondary">—</Typography>;
                          const summary = parts.slice(0, 2).join(' | ') + (parts.length > 2 ? ` +${parts.length - 2}` : '');
                          return (
                            <Tooltip
                              title={<span style={{ whiteSpace: 'pre-line' }}>{parts.join('\n')}</span>}
                              placement="left"
                            >
                              <Typography variant="caption" sx={{ color: 'rgba(100,220,150,0.9)', cursor: 'help', display: 'block' }}>
                                {summary}
                              </Typography>
                            </Tooltip>
                          );
                        })()}
                      </TableCell>
                    )}
                    <TableCell sx={cellSx}>
                      <Tooltip title="Назначить QOS">
                        <IconButton size="small" onClick={() => setSetQosAssoc(assoc)} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          <PlaylistAddCheckIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {assocTab === 1 && (
                        <Tooltip title="Установить личные лимиты">
                          <IconButton size="small" onClick={() => setSetLimitsAssoc(assoc)} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                            <TuneIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* ── Dialogs ── */}
      {createOpen && (
        <CreateQosDialog onClose={() => setCreateOpen(false)} tresCatalog={tresCatalog} />
      )}
      {editQos && (
        <EditQosDialog qos={editQos} onClose={() => setEditQos(null)} tresCatalog={tresCatalog} />
      )}
      {deleteQos_ && (
        <DeleteQosDialog qos={deleteQos_} onClose={() => setDeleteQos(null)} />
      )}
      {setQosAssoc && (
        <SetAssocQosDialog
          assoc={setQosAssoc}
          availableQos={qosList}
          onClose={() => setSetQosAssoc(null)}
        />
      )}
      {setLimitsAssoc && (
        <SetAssocLimitsDialog
          assoc={setLimitsAssoc}
          onClose={() => setSetLimitsAssoc(null)}
          tresCatalog={tresCatalog}
        />
      )}
    </Box>
  );
}