import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Typography,
  Tooltip,
  Chip,
  Paper,
  SelectChangeEvent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { SlurmTresItem } from '@/types/slurm-qos.types';

const FALLBACK_TRES: SlurmTresItem[] = [
  { type: 'cpu' },
  { type: 'mem' },
  { type: 'node' },
  { type: 'gres', name: 'gpu' },
  { type: 'energy' },
  { type: 'billing' },
];

/** Типы, для которых нужно указывать единицы (Slurm принимает G/M/T суффиксы) */
const UNIT_HINT_TYPES = new Set(['mem', 'vmem']);

interface TresRow {
  id: number;
  type: string;
  name: string;
  value: string;
  /** true = помечена к удалению (value будет -1 при отправке) */
  removing: boolean;
}

interface Props {
  value: string;
  onChange: (tresString: string) => void;
  availableTres?: SlurmTresItem[];
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

let nextId = 1;

function parseTresString(raw: string): TresRow[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(',')
    .map((part) => {
      const eqIdx = part.indexOf('=');
      if (eqIdx === -1) return null;
      const key = part.slice(0, eqIdx).trim();
      const val = part.slice(eqIdx + 1).trim();
      if (!key) return null;
      const slashIdx = key.indexOf('/');
      if (slashIdx !== -1) {
        return { id: nextId++, type: key.slice(0, slashIdx), name: key.slice(slashIdx + 1), value: val, removing: false };
      }
      return { id: nextId++, type: key, name: '', value: val, removing: false };
    })
    .filter(Boolean) as TresRow[];
}

function buildTresString(rows: TresRow[]): string {
  return rows
    .filter((r) => r.type)
    .map((r) => {
      const key = r.name ? `${r.type}/${r.name}` : r.type;
      // removing=true → -1 чтобы явно сбросить лимит в sacctmgr
      const val = r.removing ? '-1' : r.value;
      if (!val) return null;
      return `${key}=${val}`;
    })
    .filter(Boolean)
    .join(',');
}

const TresBuilder: React.FC<Props> = ({
  value,
  onChange,
  availableTres = [],
  label = 'TRES',
  helperText,
  disabled = false,
}) => {
  const [rows, setRows] = useState<TresRow[]>(() => parseTresString(value));
  const [showRaw, setShowRaw] = useState(false);
  // Bug 3 fix: отдельное состояние для режима ввода строки
  const [rawInput, setRawInput] = useState('');

  // Синхронизируем rawInput при переключении в режим строки
  const handleToggleMode = () => {
    if (!showRaw) {
      // переходим в режим строки — инициализируем rawInput текущей строкой
      setRawInput(buildTresString(rows));
    } else {
      // возвращаемся в конструктор — парсим rawInput в строки
      setRows(parseTresString(rawInput));
    }
    setShowRaw((v) => !v);
  };

  const tresCatalog = useMemo<SlurmTresItem[]>(() => {
    const merged = [...FALLBACK_TRES];
    for (const item of availableTres) {
      const exists = merged.some((m) => m.type === item.type && m.name === item.name);
      if (!exists) merged.push(item);
    }
    return merged;
  }, [availableTres]);

  const typeOptions = useMemo(
    () => Array.from(new Set(tresCatalog.map((t) => t.type))).sort(),
    [tresCatalog]
  );

  const getSubtypes = useCallback(
    (type: string) =>
      tresCatalog
        .filter((t) => t.type === type && t.name)
        .map((t) => t.name as string),
    [tresCatalog]
  );

  const updateRows = useCallback(
    (newRows: TresRow[]) => {
      setRows(newRows);
      onChange(buildTresString(newRows));
    },
    [onChange]
  );

  const addRow = () => {
    const type = typeOptions[0] ?? 'cpu';
    const subtypes = getSubtypes(type);
    updateRows([...rows, { id: nextId++, type, name: subtypes[0] ?? '', value: '', removing: false }]);
  };

  // Bug 2 fix: удаление → помечаем removing=true, value=-1 (чтобы sacctmgr сбросил лимит)
  const removeRow = (id: number) => {
    updateRows(
      rows.map((r) =>
        r.id === id ? { ...r, removing: true, value: '-1' } : r
      )
    );
  };

  const restoreRow = (id: number) => {
    updateRows(rows.map((r) => (r.id === id ? { ...r, removing: false, value: '' } : r)));
  };

  const deleteRowCompletely = (id: number) => {
    updateRows(rows.filter((r) => r.id !== id));
  };

  const updateRow = (id: number, patch: Partial<TresRow>) => {
    updateRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleTypeChange = (id: number, newType: string) => {
    const subtypes = getSubtypes(newType);
    updateRow(id, { type: newType, name: subtypes[0] ?? '' });
  };

  // Bug 3 fix: в режиме строки обновляем rawInput независимо от rows
  const handleRawChange = (raw: string) => {
    setRawInput(raw);
    onChange(raw);
  };

  const tresString = buildTresString(rows);

  if (disabled) {
    return (
      <TextField
        label={label}
        value={tresString}
        fullWidth
        size="small"
        disabled
        helperText={helperText}
      />
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
          {label}
        </Typography>
        <Tooltip title="TRES задаются в формате type=value или type/subtype=value. Например: cpu=100, gres/gpu=4, mem=200G (G/M/T для mem). -1 = убрать лимит.">
          <HelpOutlineIcon fontSize="small" color="action" sx={{ cursor: 'help' }} />
        </Tooltip>
        <Button size="small" onClick={handleToggleMode}>
          {showRaw ? 'Конструктор' : 'Ввод строки'}
        </Button>
      </Box>

      {showRaw ? (
        /* Bug 3 fix: value={rawInput}, не tresString */
        <TextField
          label={label}
          value={rawInput}
          onChange={(e) => handleRawChange(e.target.value)}
          fullWidth
          size="small"
          placeholder="cpu=100,gres/gpu=4,mem=200G"
          helperText={helperText ?? 'Формат: type=value через запятую. -1 = сбросить лимит.'}
        />
      ) : (
        <Paper variant="outlined" sx={{ p: 1 }}>
          {rows.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Нет ограничений — нажмите «Добавить»
            </Typography>
          )}

          {rows.map((row) => {
            const subtypes = getSubtypes(row.type);
            // Bug 4 fix: подсказка единиц для mem/vmem
            const valuePlaceholder = UNIT_HINT_TYPES.has(row.type)
              ? 'напр. 200G / 1024M'
              : '-1 = без лимита';

            return (
              <Box
                key={row.id}
                sx={{
                  display: 'flex', gap: 1, mb: 1,
                  // flex-start чтобы helper text под mem не сдвигал другие элементы
                  alignItems: 'flex-start',
                  opacity: row.removing ? 0.5 : 1,
                  bgcolor: row.removing ? 'rgba(255,80,80,0.06)' : 'transparent',
                  borderRadius: 1,
                  px: 0.5,
                }}
              >
                {/* Тип */}
                <FormControl size="small" sx={{ minWidth: 100, flexShrink: 0 }} disabled={row.removing}>
                  <InputLabel>Тип</InputLabel>
                  <Select
                    label="Тип"
                    value={row.type}
                    onChange={(e: SelectChangeEvent) => handleTypeChange(row.id, e.target.value)}
                  >
                    {typeOptions.map((t) => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Подтип */}
                {subtypes.length > 0 ? (
                  <FormControl size="small" sx={{ minWidth: 100, flexShrink: 0 }} disabled={row.removing}>
                    <InputLabel>Подтип</InputLabel>
                    <Select
                      label="Подтип"
                      value={row.name}
                      onChange={(e: SelectChangeEvent) => updateRow(row.id, { name: e.target.value })}
                    >
                      {subtypes.map((s) => (
                        <MenuItem key={s} value={s}>{s}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    size="small"
                    label="Подтип"
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    sx={{ minWidth: 100 }}
                    placeholder="опционально"
                    disabled={row.removing}
                  />
                )}

                {/* Значение */}
                {row.removing ? (
                  <Typography variant="caption" color="error" sx={{ flexGrow: 1, ml: 1 }}>
                    будет сброшено (-1)
                  </Typography>
                ) : (
                  <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <TextField
                      size="small"
                      label="Значение"
                      value={row.value}
                      onChange={(e) => updateRow(row.id, { value: e.target.value })}
                      fullWidth
                      placeholder={valuePlaceholder}
                    />
                    {/* Bug 4: подсказка единиц под полем */}
                    {UNIT_HINT_TYPES.has(row.type) && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
                        Единицы: G (ГиБ), M (МиБ), T (ТиБ). Напр.: 200G, 1024M
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Кнопки удаления — mt: '4px' выравнивает с полем при flex-start */}
                {row.removing ? (
                  <>
                    <Tooltip title="Отменить удаление">
                      <Button size="small" onClick={() => restoreRow(row.id)} sx={{ minWidth: 60, mt: '4px' }}>
                        Отмена
                      </Button>
                    </Tooltip>
                    <Tooltip title="Удалить из строки полностью (не отправлять -1)">
                      <IconButton size="small" onClick={() => deleteRowCompletely(row.id)} sx={{ mt: '2px' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                ) : (
                  <Tooltip title="Сбросить лимит (отправит -1 в sacctmgr). Чтобы просто убрать из строки — используйте «Ввод строки».">
                    <IconButton size="small" onClick={() => removeRow(row.id)} color="error" sx={{ mt: '2px' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            );
          })}

          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={addRow}
            variant="outlined"
            sx={{ mt: 0.5 }}
          >
            Добавить
          </Button>

          {tresString && (
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {tresString.split(',').map((part, i) => (
                <Chip
                  key={i}
                  label={part}
                  size="small"
                  variant="outlined"
                  color={part.includes('=-1') ? 'error' : 'default'}
                />
              ))}
            </Box>
          )}
        </Paper>
      )}
      {helperText && !showRaw && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default TresBuilder;