import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { StudentAuthProvider, useStudentAuth } from './StudentAuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentLogin from './pages/StudentLogin';
import StudentRegister from './pages/StudentRegister';
import StudentResults from './pages/StudentResults';
import StudentResultDetail from './pages/StudentResultDetail';
import Dashboard from './pages/Dashboard';
import MarkSchemes from './pages/MarkSchemes';
import MarkSchemeDetail from './pages/MarkSchemeDetail';
import CreateMarkScheme from './pages/CreateMarkScheme';
import Scripts from './pages/Scripts';
import NewScript from './pages/NewScript';
import ScriptReview from './pages/ScriptReview';

function Shell() {
  const { teacher, loading } = useAuth();
  if (loading) return <div className="loading-overlay" style={{ minHeight:'100vh' }}><div className="spinner" />Loading…</div>;
  if (!teacher) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-panel">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/mark-schemes" element={<MarkSchemes />} />
          <Route path="/mark-schemes/new" element={<CreateMarkScheme />} />
          <Route path="/mark-schemes/:id" element={<MarkSchemeDetail />} />
          <Route path="/scripts" element={<Scripts />} />
          <Route path="/scripts/new" element={<NewScript />} />
          <Route path="/scripts/:id" element={<ScriptReview />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function StudentShell() {
  const { student, loading } = useStudentAuth();
  if (loading) return <div className="loading-overlay" style={{ minHeight: '100vh' }}><div className="spinner" />Loading…</div>;
  if (!student) return <Navigate to="/student/login" replace />;
  return (
    <Routes>
      <Route path="results" element={<StudentResults />} />
      <Route path="results/:id" element={<StudentResultDetail />} />
      <Route path="*" element={<Navigate to="results" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StudentAuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/register" element={<StudentRegister />} />
          <Route path="/student/*" element={<StudentShell />} />
          <Route path="/*" element={<Shell />} />
        </Routes>
      </StudentAuthProvider>
    </AuthProvider>
  );
}
