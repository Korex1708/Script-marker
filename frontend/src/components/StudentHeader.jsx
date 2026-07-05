import { useStudentAuth } from '../StudentAuthContext';

export default function StudentHeader() {
  const { student, logout } = useStudentAuth();
  return (
    <div className="page-header-row" style={{ alignItems: 'center' }}>
      <div>
        <span className="eyebrow">Sentra Merit · Student view</span>
        <h1 style={{ fontSize: '1.5rem' }}>{student?.name}</h1>
      </div>
      <button className="logout-btn" onClick={logout}>Log out</button>
    </div>
  );
}
