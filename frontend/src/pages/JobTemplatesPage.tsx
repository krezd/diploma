import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, IconButton, Tooltip, Chip, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch,
  FormControlLabel, CircularProgress, Alert, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobTemplateApi } from '@/services/api/jobTemplateApi';
import { useAuthStore } from '@/stores/authStore';
import type { JobTemplate, JobTemplateRequest } from '@/types/job-template.types';

// ─── EditDialog ───────────────────────────────────────────────────────────────

interface EditDialogProps {
  template: JobTemplate | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: number, req: JobTemplateRequest) => void;
  loading: boolean;
}

const EditDialog = ({ template, open, onClose, onSave, loading }: EditDialogProps) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [script, setScript] = useState('');

  // Reset when template changes or dialog opens
  useEffect(() => {
    if (!template) return;
    setName(template.name);
    setDesc(template.description ?? '');
    setIsPublic(template.isPublic);
    // For SCRIPT mode — use scriptTemplate; for CONSTRUCTOR — extract script_body from jobDescJson
    if (template.mode === 'SCRIPT') {
      setScript(template.scriptTemplate ?? '');
    } else {
      try {
        const parsed = JSON.parse(template.jobDescJson ?? '{}') as { script_body?: string };
        setScript(parsed.script_body ?? '');
      } catch {
        setScript('');
      }
    }
  }, [template, open]);

  if (!template) return null;

  const handleSave = () => {
    let updatedJobDescJson = template.jobDescJson;
    if (template.mode === 'CONSTRUCTOR' && template.jobDescJson) {
      try {
        const parsed = JSON.parse(template.jobDescJson) as Record<string, unknown>;
        parsed.script_body = script;
        updatedJobDescJson = JSON.stringify(parsed);
      } catch {
        // keep original
      }
    }
    onSave(template.id, {
      name: name.trim(),
      description: desc.trim() || undefined,
      isPublic,
      mode: template.mode,
      jobDescJson: updatedJobDescJson,
      scriptTemplate: script || undefined,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: '#1a2035', border: '1px solid #2d3748' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid #2d3748' }}>Редактирование шаблона</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Название" value={name}
              onChange={(e) => setName(e.target.value)} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Описание" value={desc}
              onChange={(e) => setDesc(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} size="small" />}
              label={<Typography variant="body2">Публичный шаблон (виден всем пользователям)</Typography>}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              {template.mode === 'SCRIPT' ? 'Bash-скрипт' : 'Команды для выполнения (тело скрипта)'}
            </Typography>
            <TextField fullWidth size="small" multiline rows={12}
              value={script} onChange={(e) => setScript(e.target.value)}
              inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: 'text.secondary' }}>Отмена</Button>
        <Button variant="contained" disabled={!name.trim() || loading} onClick={handleSave}>
          {loading ? <CircularProgress size={16} /> : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── DeleteConfirmDialog ──────────────────────────────────────────────────────

const DeleteConfirmDialog = ({ template, onClose, onConfirm, loading }: {
  template: JobTemplate | null;
  onClose: () => void;
  onConfirm: (id: number) => void;
  loading: boolean;
}) => {
  if (!template) return null;
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: '#1a2035', border: '1px solid #2d3748' } }}>
      <DialogTitle>Удалить шаблон?</DialogTitle>
      <DialogContent>
        <Alert severity="warning">Шаблон «{template.name}» будет удалён. Это действие необратимо.</Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: 'text.secondary' }}>Отмена</Button>
        <Button variant="contained" color="error" disabled={loading} onClick={() => onConfirm(template.id)}>
          {loading ? <CircularProgress size={16} /> : 'Удалить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── TemplateCard ─────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: JobTemplate;
  isOwner: boolean;
  onApply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const TemplateCard = ({ template, isOwner, onApply, onEdit, onDelete, onDuplicate }: TemplateCardProps) => {
  const modeColor = template.mode === 'SCRIPT' ? '#f59e0b' : '#3b82f6';
  const modeLabel = template.mode === 'SCRIPT' ? 'Скрипт' : 'Конструктор';

  const fmtDate = (d: string | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2, p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
        <BookmarkIcon sx={{ color: modeColor, mr: 1, mt: 0.25, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3, wordBreak: 'break-word' }}>
            {template.name}
          </Typography>
          {template.description && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
              {template.description}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
        <Chip label={modeLabel} size="small" variant="outlined"
          sx={{ fontSize: 11, height: 20, color: modeColor, borderColor: modeColor }} />
        <Chip
          icon={template.isPublic ? <PublicIcon sx={{ fontSize: '14px !important' }} /> : <LockIcon sx={{ fontSize: '14px !important' }} />}
          label={template.isPublic ? 'Публичный' : 'Личный'} size="small" variant="outlined"
          sx={{ fontSize: 11, height: 20, color: 'text.secondary', borderColor: '#2d3748' }} />
      </Box>

      <Divider sx={{ borderColor: '#2d3748', mb: 1.5 }} />

      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          Автор: <span style={{ color: '#90caf9' }}>{template.username}</span>
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          Создан: {fmtDate(template.createdAt)}
        </Typography>
        {template.updatedAt && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Изменён: {fmtDate(template.updatedAt)}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, mt: 2, justifyContent: 'flex-end' }}>
        <Tooltip title="Дублировать">
          <IconButton size="small" onClick={onDuplicate} sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {isOwner && (
          <>
            <Tooltip title="Редактировать">
              <IconButton size="small" onClick={onEdit} sx={{ color: 'text.secondary', '&:hover': { color: 'warning.main' } }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Удалить">
              <IconButton size="small" onClick={onDelete} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
        <Button size="small" variant="contained" startIcon={<PlayArrowIcon />}
          onClick={onApply} sx={{ ml: 0.5 }}>
          Применить
        </Button>
      </Box>
    </Paper>
  );
};

// ─── JobTemplatesPage ─────────────────────────────────────────────────────────

export const JobTemplatesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const username = user?.username ?? '';
  const queryClient = useQueryClient();

  const [editTemplate, setEditTemplate] = useState<JobTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<JobTemplate | null>(null);

  const { data: templates = [], isLoading, isError } = useQuery({
    queryKey: ['job-templates'],
    queryFn: jobTemplateApi.getTemplates,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: number; req: JobTemplateRequest }) =>
      jobTemplateApi.updateTemplate(id, req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['job-templates'] });
      setEditTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => jobTemplateApi.deleteTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['job-templates'] });
      setDeleteTemplate(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (req: JobTemplateRequest) => jobTemplateApi.createTemplate(req),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['job-templates'] }),
  });

  const handleApply = (template: JobTemplate) => {
    navigate('/jobs/new', { state: { template } });
  };

  const handleDuplicate = (template: JobTemplate) => {
    createMutation.mutate({
      name: `${template.name} (копия)`,
      description: template.description,
      isPublic: false,
      mode: template.mode,
      jobDescJson: template.jobDescJson,
      scriptTemplate: template.scriptTemplate,
    });
  };

  const myTemplates = templates.filter((t) => t.username === username);
  const publicTemplates = templates.filter((t) => t.username !== username && t.isPublic);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Tooltip title="Назад">
          <IconButton onClick={() => navigate('/jobs')} size="small" sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>Шаблоны заданий</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/jobs/new')}>
          Создать задание
        </Button>
      </Box>

      {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Ошибка загрузки шаблонов</Alert>}

      {!isLoading && !isError && (
        <>
          {/* Мои шаблоны */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 12 }}>
              Мои шаблоны ({myTemplates.length})
            </Typography>
            {myTemplates.length === 0 ? (
              <Paper sx={{ bgcolor: '#1a2035', border: '1px solid #2d3748', borderRadius: 2, p: 4, textAlign: 'center' }}>
                <BookmarkIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Нет сохранённых шаблонов. Создайте задание и сохраните его как шаблон.
                </Typography>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/jobs/new')}>
                  Создать задание
                </Button>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {myTemplates.map((t) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={t.id}>
                    <TemplateCard
                      template={t}
                      isOwner
                      onApply={() => handleApply(t)}
                      onEdit={() => setEditTemplate(t)}
                      onDelete={() => setDeleteTemplate(t)}
                      onDuplicate={() => handleDuplicate(t)}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          {/* Публичные шаблоны */}
          {publicTemplates.length > 0 && (
            <Box>
              <Divider sx={{ borderColor: '#2d3748', mb: 3 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 12 }}>
                Публичные шаблоны ({publicTemplates.length})
              </Typography>
              <Grid container spacing={2}>
                {publicTemplates.map((t) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={t.id}>
                    <TemplateCard
                      template={t}
                      isOwner={false}
                      onApply={() => handleApply(t)}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      onDuplicate={() => handleDuplicate(t)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </>
      )}

      <EditDialog
        template={editTemplate}
        open={!!editTemplate}
        onClose={() => setEditTemplate(null)}
        onSave={(id, req) => updateMutation.mutate({ id, req })}
        loading={updateMutation.isPending}
      />

      <DeleteConfirmDialog
        template={deleteTemplate}
        onClose={() => setDeleteTemplate(null)}
        onConfirm={(id) => deleteMutation.mutate(id)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
};