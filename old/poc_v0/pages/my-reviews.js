import { api } from '../js/api.js';
import { session, esc, fmtDate } from '../js/core.js';

const STATUS_MAP = {
  draft: ['Черновик', 'badge--muted'],
  submitted: ['На ревью', 'badge--primary'],
  approved: ['Принята', 'badge--success'],
  changes_requested: ['На доработке', 'badge--danger'],
};

export async function render(root, params) {
  const list = document.getElementById('works-list');
  list.innerHTML = '<p class="muted">Загрузка…</p>';

  const items = await api.listMyWorks(session.userId);
  if (!items.length) {
    list.innerHTML = '<p class="empty">У вас пока нет работ.</p>';
    return;
  }

  list.innerHTML = items.map(({ work, lesson, course, latestReview }) => {
    const [label, cls] = STATUS_MAP[work.status] || ['—', 'badge--muted'];
    let reviewHtml = '';
    if (latestReview) {
      const verdict = latestReview.verdict === 'approved'
        ? 'Работа принята'
        : 'Работа отправлена на доработку';
      reviewHtml = `
        <div class="review ${latestReview.verdict === 'approved' ? 'review--ok' : 'review--warn'}">
          <div class="review__verdict">${verdict}</div>
          <div class="review__comment">«${esc(latestReview.comment)}»</div>
          <div class="review__meta muted">${fmtDate(latestReview.created_at)}</div>
        </div>`;
    }
    return `
      <div class="card">
        <div class="card__head">
          <h2>${esc(course ? course.title : '')} — ${esc(lesson ? lesson.title : '')}</h2>
          <span class="badge ${cls}">${label}</span>
        </div>
        ${work.content ? `<p class="muted">Решение: ${esc(work.content)}</p>` : ''}
        ${reviewHtml}
        ${work.status === 'changes_requested' ? `<a class="btn btn--small" href="#/lesson/${work.lesson_id}">Доработать работу</a>` : ''}
      </div>`;
  }).join('');
}
