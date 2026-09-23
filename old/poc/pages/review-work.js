import { api } from '../js/api.js';
import { session, esc, toast, fmtDate } from '../js/core.js';

const statusMap = {
  submitted: ['Работа на ревью', 'badge--primary'],
  approved: ['Работа принята', 'badge--success'],
  changes_requested: ['Работа на доработке', 'badge--danger'],
};

export async function render(root, params) {
  const workId = params.id;
  const { work, lesson, course, student, reviews } = await api.getWorkForReview(workId);

  document.getElementById('work-student-name').textContent = student ? student.name : 'Ученик';
  document.getElementById('work-title').textContent = lesson ? lesson.title : 'Работа';
  document.getElementById('work-meta').textContent =
    'Курс: ' + (course ? course.title : '—') + ' · Ученик: ' + (student ? student.name : '—');
  document.getElementById('work-content').textContent = work.content || '—';

  const status = statusMap[work.status] || ['—', 'badge--muted'];
  document.getElementById('work-status').innerHTML =
    `<span class="badge ${status[1]}">${status[0]}</span>`;

  renderHistory(reviews);

  const alreadyReviewed = work.status === 'approved' || work.status === 'changes_requested';
  if (alreadyReviewed) {
    document.getElementById('review-comment').disabled = true;
    document.getElementById('approve-btn').disabled = true;
    document.getElementById('changes-btn').disabled = true;
    return;
  }

  const commentEl = document.getElementById('review-comment');
  document.getElementById('approve-btn').addEventListener('click', () => submit(workId, 'approved'));
  document.getElementById('changes-btn').addEventListener('click', () => submit(workId, 'changes_requested'));

  async function submit(workId, verdict) {
    try {
      await api.submitReview(workId, session.userId, verdict, commentEl.value);
      toast(verdict === 'approved' ? 'Работа принята' : 'Работа отправлена на доработку', 'success');
      location.hash = '#/review';
    } catch (e) {
      toast(e.message, 'error');
    }
  }
}

function renderHistory(reviews) {
  const container = document.getElementById('review-history');
  if (!reviews.length) {
    container.innerHTML = '<p class="muted">История ревью по этой работе пока пуста.</p>';
    return;
  }
  container.innerHTML =
    '<div class="card"><div class="card__head"><h2>История ревью</h2></div>' +
    reviews.map((r) => {
      const verdict = r.verdict === 'approved' ? 'Принято' : 'На доработку';
      const cls = r.verdict === 'approved' ? 'review--ok' : 'review--warn';
      return `
        <div class="review ${cls}">
          <div class="review__verdict">Раунд ${r.review_round}: ${verdict}</div>
          <div class="review__comment">«${esc(r.comment)}»</div>
          <div class="review__meta muted">${fmtDate(r.created_at)}</div>
        </div>`;
    }).join('') + '</div>';
}
