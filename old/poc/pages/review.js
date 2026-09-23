import { api } from '../js/api.js';
import { session, esc, fmtDate } from '../js/core.js';

export async function render(root, params) {
  const list = document.getElementById('review-list');
  list.innerHTML = '<p class="muted">Загрузка…</p>';

  const works = await api.listWorksOnReview(session.userId);

  if (!works.length) {
    list.innerHTML = '<p class="empty">Нет работ на ревью.</p>';
    return;
  }

  list.innerHTML = works.map(({ work, lesson, course, student }) => `
    <article class="card">
      <div class="card__head">
        <h2 class="card__title">${esc(student ? student.name : 'Ученик')}</h2>
        <span class="badge badge--primary">На ревью</span>
      </div>
      <div class="card__body">
        <div class="card__meta">Курс: ${esc(course ? course.title : '—')} · Урок: ${esc(lesson ? lesson.title : '—')}</div>
        <div class="card__meta">Отправлено: ${fmtDate(work.submitted_at)}</div>
      </div>
      <div class="card__actions">
        <a class="btn btn--primary" href="#/review/work/${work.id}">Проверить</a>
      </div>
    </article>`).join('');
}
