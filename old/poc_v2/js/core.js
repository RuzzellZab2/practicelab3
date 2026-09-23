// Общие утилиты и «сессия» текущего пользователя (без реальной авторизации).

export const session = {
  userId: 'u_student',
  role: 'student',
};

const ROLE_TO_USER = {
  student: 'u_student',
  reviewer: 'u_reviewer',
  course_author: 'u_author',
  user: 'u_plain',
};

export function switchRole(role) {
  session.role = role;
  session.userId = ROLE_TO_USER[role] || session.userId;
}

export function uid(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

export function toast(message, type = 'info') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast toast--' + type;
  el.textContent = message;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast--show'));
  setTimeout(() => {
    el.classList.remove('toast--show');
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function nowIso() {
  return new Date().toISOString();
}

export function delay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
