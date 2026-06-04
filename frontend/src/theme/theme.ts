import { createTheme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

export const createAppTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      background: mode === 'dark'
        ? { default: '#0f1117', paper: '#1e2130' }
        : { default: '#f0f2f5', paper: '#ffffff' },
      primary: {
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#2563eb',
      },
      secondary: {
        main: '#8b5cf6',
      },
      text: mode === 'dark'
        ? { primary: '#e2e8f0', secondary: '#94a3b8' }
        : { primary: '#1a202c', secondary: '#4a5568' },
      divider: mode === 'dark' ? '#2d3748' : '#e2e8f0',
      error: { main: '#ef4444' },
      warning: { main: '#f59e0b' },
      success: { main: '#10b981' },
      info: { main: '#0ea5e9' },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 500 },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark' ? '#2d3748' : '#cbd5e0',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark' ? '#4a5568' : '#a0aec0',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: mode === 'dark' ? '#2d3748' : '#e2e8f0' },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: { borderColor: mode === 'dark' ? '#2d3748' : '#e2e8f0' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500 },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#2d3748' : 'rgba(0,0,0,0.08)',
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });