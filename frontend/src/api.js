const BASE = '/api';
function getToken() { return localStorage.getItem('sm_token'); }
async function request(path, options = {}) {
  const token = getToken();
  const isForm = options.body instanceof FormData;
  const headers = { ...(options.headers || {}) };
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) { localStorage.removeItem('sm_token'); window.location.href = '/login'; throw new Error('Session expired.'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
// GET endpoints whose result is a file (CSV / HTML report), not JSON. Auth is a Bearer
// token in localStorage, never a cookie, so a plain <a href> navigation to these routes
// can't authenticate — fetch with the header, then hand the browser a local blob URL.
async function requestBlob(path) {
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${BASE}${path}`, { headers });
  if (res.status === 401) { localStorage.removeItem('sm_token'); window.location.href = '/login'; throw new Error('Session expired.'); }
  if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Request failed'); }
  return res;
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password) => request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  getMe: () => request('/auth/me'),
  getStats: () => request('/results/stats'),
  getMarkSchemes: () => request('/mark-schemes'),
  getMarkScheme: id => request(`/mark-schemes/${id}`),
  createMarkScheme: payload => request('/mark-schemes', { method: 'POST', body: JSON.stringify(payload) }),
  deleteMarkScheme: id => request(`/mark-schemes/${id}`, { method: 'DELETE' }),
  getScripts: () => request('/scripts'),
  getScript: id => request(`/scripts/${id}`),
  createScript: payload => request('/scripts', { method: 'POST', body: JSON.stringify(payload) }),
  uploadScript: formData => request('/scripts/upload', { method: 'POST', body: formData }),
  reviewResult: (resultId, payload) => request(`/results/${resultId}/review`, { method: 'PUT', body: JSON.stringify(payload) }),
  approveConfident: scriptId => request(`/results/script/${scriptId}/approve-confident`, { method: 'PUT' }),
  approveAll: scriptId => request(`/results/script/${scriptId}/approve-all`, { method: 'PUT' }),
  exportCsv: async schemeId => {
    const res = await requestBlob(schemeId ? `/export/csv?scheme_id=${schemeId}` : '/export/csv');
    const cd = res.headers.get('Content-Disposition') || '';
    const filename = (cd.match(/filename="?([^"]+)"?/) || [])[1] || 'scriptmark_results.csv';
    downloadBlob(await res.blob(), filename);
  },
  sendFeedback: (message, page) => request('/feedback', { method: 'POST', body: JSON.stringify({ message, page }) }),
  openReport: async scriptId => {
    const res = await requestBlob(`/export/report/${scriptId}`);
    const html = await res.text();
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  },
};
