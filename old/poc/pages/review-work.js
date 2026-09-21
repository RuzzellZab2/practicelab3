import { api } from '../js/api.js';
import { session, esc, fmtDate, toast } from '../js/core.js';

export async function render(root, params) {
  const box = document.getElementById('rw-content');
  box.innerHTML = '<p class="muted">Загрузка…</p>';

  const { work, lesson, course, student, reviews } = await api.getWorkForReview(params.id);

  const historyHtml = reviews.length
    ? reviews.map((r) => `
        <div class="review ${r.verdict === 'approved' ? 'review--ok' : 'review--warn'}">
          <div class="review__meta muted">Раунд ${r.review_round} · ${fmtDate(r.created_at)}</div>
          <div class="review__verdict">${r.verdict === 'approved' ? 'Принято' : 'На доработку'}</div>
          <div class="review__comment">«${esc(r.comment)}»</div>
        </div>`).join('')
    : '<p class="muted">Ревью по этой работе ещё нет.</p>';

  box.innerHTML = `
    <div class="card">
      <div class="card__head">
        <h2>${esc(student ? student.name : '')}</h2>
        <span class="muted">${fmtDate(work.submitted_at)}</span>
      </div>
      <p>${esc(course ? course.title : '')} · ${esc(lesson ? lesson.title : '')}</p>
      <div class="work-content">
        <div class="field__label">Решение ученика</div>
        <p>${esc(work.content || '—')}</p>
      </div>
    </div>
    <div class="card">
      <h3>Ревью</h3>
      <label class="field">
        <span class="field__label">Комментарий</span>
        <textarea id="review-comment" class="input" rows="4" placeholder="Опишите замечания или подтвердите приём работы"></textarea>
      </label>
      <div class="btn-row">
        <button class="btn btn--danger" data-verdict="changes_requested">Вернуть на доработку</button>
        <button class="btn btn--success" data-verdict="approved">Принять работу</button>
      </div>
      <h3>История ревью</h3>
      ${historyHtml}
    </div>`;

  box.querySelectorAll('[data-verdict]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const comment = box.querySelector('#review-comment').value;
      try {
        await api.submitReview(work.id, session.userId, btn.dataset.verdict, comment);
        toast(btn.dataset.verdict === 'approved' ? 'Работа принята' : 'Работа отправлена на доработку', 'success');
        location.hash = '#/review';
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  });
}
