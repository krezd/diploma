import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Pages (пока создадим заглушки)
const DashboardPage = () => <div>Dashboard Page - Coming Soon</div>;
const JobsPage = () => <div>Jobs Page - Coming Soon</div>;
const ClusterPage = () => <div>Cluster Page - Coming Soon</div>;
const LoginPage = () => <div>Login Page - Coming Soon</div>;

// Material-UI тема
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/cluster" element={<ClusterPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
