import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import DayShiftPage from './pages/DayShiftPage';
import InboxPage from './pages/InboxPage';
import OverviewPage from './pages/OverviewPage';
import { ToastProvider } from './components/ToastProvider';
import { ROUTES } from './lib/constants';

// React Query クライアント設定
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to={ROUTES.DAY} replace />} />
              <Route path={ROUTES.DAY} element={<DayShiftPage />} />
              <Route path={ROUTES.INBOX} element={<InboxPage />} />
              <Route path={ROUTES.OVERVIEW} element={<OverviewPage />} />
              <Route path="*" element={<Navigate to={ROUTES.DAY} replace />} />
            </Routes>
          </Layout>
        </Router>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
