import { Box, Typography } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Sidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './Sidebar';
import { useUiStore } from '@/stores/uiStore';

export const AppLayout = () => {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flex: 1,
          p: 3,
          overflow: 'auto',
          minWidth: 0,
          marginLeft: 0,
          width: `calc(100% - ${sidebarWidth}px)`,
          transition: 'width 0.2s ease',
        }}
      >
        <Outlet />
      </Box>
      <Typography
        variant="caption"
        sx={{
          position: 'fixed',
          bottom: 10,
          right: 14,
          color: 'text.disabled',
          fontSize: 11,
          letterSpacing: 0.5,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        prod. krezd
      </Typography>
    </Box>
  );
};