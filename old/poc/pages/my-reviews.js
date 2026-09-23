import { api } from '../js/api.js';
import { session, esc, fmtDate } from '../js/core.js';

const statusMap = {
  draft: ['Черновик', 'badge--warning'],
  submitted: ['Работа на ревью', 'badge--primary'],
  approved: ['Работа принята', 'badge--success'],
  changes_requested: ['Работа на доработке', 'badge--danger'],
};

export async function render(root, params) {
  const list = document.getElementById('works-list');
  list.innerHTML = '<p class="muted">Загрузка…</p>';

  const works = await api.listMyWorks(session.userId);

  if (!works.length) {
    list.innerHTML = '<p class="empty">У вас пока нет работ.</p>';
    return;
  }

  list.innerHTML = works.map(({ work, lesson, course, latestReview }) => {
    const status = statusMap[work.status] || ['—', 'badge--muted'];
    const courseTitle = course ? esc(course.title) : '—';
    const lessonTitle = lesson ? esc(lesson.title) : '—';

    let reviewHtml = '<p class="muted">Ревью пока нет.</p>';
    if (latestReview) {
      const verdict = latestReview.verdict === 'approved' ? 'Работа принята' : 'Работа отправлена на доработку';
      const cls = latestReview.verdict === 'approved' ? 'review--ok' : 'review--warn';
      reviewHtml = `
        <div class="review ${cls}">
          <div class="review__verdict">${verdict}</div>
          <div class="review__comment">«${esc(latestReview.comment)}»</div>
          <div class="review__meta muted">Ревьюер · ${fmtDate(latestReview.created_at)}</div>
        </div>`;
    }

    return `
      <article class="card">
        <div class="card__head">
          <h2 class="card__title">${lessonTitle}</h2>
          <span class="badge ${status[1]}">${status[0]}</span>
        </div>
        <div class="card__body">
          <div class="card__meta">Курс: ${courseTitle}</div>
          <div class="work-content">${esc(work.content || '—')}</div>
          ${reviewHtml}
        </div>
      </article>`;
  }).join('');
}
