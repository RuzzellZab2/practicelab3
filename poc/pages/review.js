import { api } from '../js/api.js';
import { session, esc, fmtDate } from '../js/core.js';

export async function render(root, params) {
  const list = document.getElementById('queue');
  list.innerHTML = '<p class="muted">Загрузка…</p>';

  const items = await api.listWorksOnReview(session.userId);
  if (!items.length) {
    list.innerHTML = '<p class="empty">Нет работ на ревью.</p>';
    return;
  }

  list.innerHTML = items.map(({ work, lesson, course, student }) => `
    <div class="card">
      <div class="card__head">
        <h2>${esc(student ? student.name : '')}</h2>
        <span class="muted">${fmtDate(work.submitted_at)}</span>
      </div>
      <p>${esc(course ? course.title : '')} · ${esc(lesson ? lesson.title : '')}</p>
      <p class="muted">Решение: ${esc(work.content || '—')}</p>
      <a class="btn btn--primary btn--small" href="#/review/work/${work.id}">Проверить</a>
    </div>`).join('');
}
