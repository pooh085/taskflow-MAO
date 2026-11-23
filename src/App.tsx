import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LanguageProvider } from './context/LanguageContext';
import { TaskFlowProvider } from './context/TaskFlowContext';
import { AdminPage } from './pages/AdminPage';
import { BoardPage } from './pages/BoardPage';
import { CalendarPage } from './pages/CalendarPage';
import { DashboardPage } from './pages/DashboardPage';
import { GanttPage } from './pages/GanttPage';
import { ListPage } from './pages/ListPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { TeamPage } from './pages/TeamPage';

export default function App() {
  return (
    <LanguageProvider>
      <TaskFlowProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/board" element={<BoardPage />} />
              <Route path="/list" element={<ListPage />} />
              <Route path="/gantt" element={<GanttPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route
                path="/projects/:projectId"
                element={<Navigate to="board" replace />}
              />
              <Route path="/projects/:projectId/board" element={<BoardPage />} />
              <Route path="/projects/:projectId/list" element={<ListPage />} />
              <Route path="/projects/:projectId/gantt" element={<GanttPage />} />
              <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TaskFlowProvider>
    </LanguageProvider>
  );
}
