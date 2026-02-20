import { Box } from '@mui/material';
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
    </Box>
  );
};