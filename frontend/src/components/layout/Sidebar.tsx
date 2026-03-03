import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Avatar,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import WorkIcon from '@mui/icons-material/Work';
import StorageIcon from '@mui/icons-material/Storage';
import FolderIcon from '@mui/icons-material/Folder';
import LogoutIcon from '@mui/icons-material/Logout';
import TerminalIcon from '@mui/icons-material/Terminal';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PeopleIcon from '@mui/icons-material/People';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { authApi } from '@/services/api/authApi';
import { ProfileDialog } from './ProfileDialog';

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 64;

type Role = 'REGULAR' | 'ADMIN';

interface NavItem {
  path: string;
  label: string;
  icon: React.JSX.Element;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon fontSize="small" />, roles: ['REGULAR', 'ADMIN'] },
  { path: '/jobs', label: 'Мои задачи', icon: <WorkIcon fontSize="small" />, roles: ['REGULAR'] },
  { path: '/jobs', label: 'Все задачи', icon: <WorkIcon fontSize="small" />, roles: ['ADMIN'] },
  { path: '/cluster', label: 'Кластер', icon: <StorageIcon fontSize="small" />, roles: ['REGULAR', 'ADMIN'] },
  { path: '/files', label: 'Файлы', icon: <FolderIcon fontSize="small" />, roles: ['REGULAR', 'ADMIN'] },
  { path: '/users', label: 'Пользователи', icon: <PeopleIcon fontSize="small" />, roles: ['ADMIN'] },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logout = useAuthStore((s) => s.logout);
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const [profileOpen, setProfileOpen] = useState(false);

  const userRole = user?.role ?? 'REGULAR';
  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));
  const width = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } finally {
      logout();
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        transition: 'width 0.2s ease',
        '& .MuiDrawer-paper': {
          width,
          transition: 'width 0.2s ease',
          boxSizing: 'border-box',
          bgcolor: '#151b2d',
          borderRight: '1px solid #2d3748',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      {/* Логотип + кнопка сворачивания */}
      <Box
        sx={{
          px: sidebarCollapsed ? 0 : 2,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          minHeight: 56,
        }}
      >
        {!sidebarCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TerminalIcon sx={{ color: 'primary.main', fontSize: 24 }} />
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
              HPC Portal
            </Typography>
          </Box>
        )}
        {sidebarCollapsed && (
          <TerminalIcon sx={{ color: 'primary.main', fontSize: 24 }} />
        )}
        <Tooltip title={sidebarCollapsed ? 'Развернуть' : 'Свернуть'} placement="right">
          <IconButton
            size="small"
            onClick={toggleSidebar}
            sx={{ color: 'text.secondary', ml: sidebarCollapsed ? 0 : 0.5, '&:hover': { color: 'text.primary' } }}
          >
            {sidebarCollapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      <Divider />

      {/* Навигация */}
      <List sx={{ px: sidebarCollapsed ? 0.5 : 1, pt: 1.5, flex: 1 }}>
        {navItems.map(({ path, label, icon }) => {
          const isActive = location.pathname === path;
          return (
            <Tooltip key={`${path}-${label}`} title={sidebarCollapsed ? label : ''} placement="right" arrow>
              <ListItemButton
                onClick={() => navigate(path)}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  py: 1,
                  px: sidebarCollapsed ? 0 : 1.5,
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  color: isActive ? 'primary.main' : 'text.secondary',
                  bgcolor: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  '&:hover': {
                    bgcolor: isActive ? 'rgba(59, 130, 246, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                    color: isActive ? 'primary.main' : 'text.primary',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: 'inherit',
                    minWidth: sidebarCollapsed ? 'auto' : 36,
                    mr: sidebarCollapsed ? 0 : undefined,
                  }}
                >
                  {icon}
                </ListItemIcon>
                {!sidebarCollapsed && (
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{ fontSize: 14, fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap' }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      {/* Пользователь + выход */}
      <Box sx={{ p: sidebarCollapsed ? 1 : 2, borderTop: '1px solid #2d3748' }}>
        {!sidebarCollapsed ? (
          <>
            <Tooltip title="Настройки профиля" placement="right">
              <Box
                onClick={() => setProfileOpen(true)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 1.5,
                  cursor: 'pointer',
                  borderRadius: 1.5,
                  px: 0.5,
                  py: 0.5,
                  mx: -0.5,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                  transition: 'background-color 0.15s',
                }}
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  {user?.username?.charAt(0).toUpperCase() ?? '?'}
                </Avatar>
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.username ?? '—'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {user?.role === 'ADMIN' ? 'Администратор' : 'Пользователь'}
                  </Typography>
                </Box>
              </Box>
            </Tooltip>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              startIcon={<LogoutIcon fontSize="small" />}
              onClick={() => void handleLogout()}
              sx={{
                borderColor: '#2d3748',
                color: 'text.secondary',
                fontSize: 13,
                '&:hover': { borderColor: '#4a5568', color: 'text.primary', bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              Выйти
            </Button>
          </>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Настройки профиля" placement="right">
              <Avatar
                onClick={() => setProfileOpen(true)}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'primary.dark',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.85 },
                  transition: 'opacity 0.15s',
                }}
              >
                {user?.username?.charAt(0).toUpperCase() ?? '?'}
              </Avatar>
            </Tooltip>
            <Tooltip title="Выйти" placement="right">
              <IconButton size="small" onClick={() => void handleLogout()} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </Drawer>
  );
};