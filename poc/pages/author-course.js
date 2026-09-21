import { api } from '../js/api.js';
import { esc, toast } from '../js/core.js';

export async function render(root, params) {
  const refresh = () => render(root, params);
  const courseId = params.id;

  const course = await api.getCourse(courseId);
  document.getElementById('ac-title').textContent = course.title;
  const isPublished = course.status === 'published';
  document.getElementById('ac-status').innerHTML = isPublished
    ? '<span class="badge badge--success">Опубликованный курс</span>'
    : '<span class="badge badge--muted">Черновик курса</span>';

  const lessons = await api.getCourseLessons(courseId);
  const lessonsEl = document.getElementById('ac-lessons');
  lessonsEl.innerHTML = lessons.length
    ? lessons.map((l) => `
        <li class="lesson">
          <div class="lesson__row">
            <div class="lesson__title">Урок ${l.position}. ${esc(l.title)}</div>
            <span class="muted">шагов: ${api.stepCount(l.id)}</span>
          </div>
        </li>`).join('')
    : '<p class="empty">Уроков пока нет.</p>';

  const reviewerEl = document.getElementById('ac-reviewer');
  const currentReviewer = await api.getCourseReviewer(courseId);
  const reviewers = await api.listReviewers();
  reviewerEl.innerHTML = `
    <h2>Проверяющий курса</h2>
    <p class="muted">${currentReviewer ? 'Назначен: <b>' + esc(currentReviewer.name) + '</b>' : 'Проверяющий не назначен'}</p>
    <div class="btn-row">
      <select id="reviewer-select" class="input">
        <option value="">— выберите проверяющего —</option>
        ${reviewers.map((r) => `<option value="${r.id}" ${currentReviewer && currentReviewer.id === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}
      </select>
      <button class="btn" id="assign-reviewer">Назначить</button>
    </div>`;

  document.getElementById('assign-reviewer').addEventListener('click', async () => {
    const val = document.getElementById('reviewer-select').value;
    try {
      await api.assignReviewer(courseId, val);
      toast('Проверяющий назначен на курс', 'success');
      refresh();
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  const publishBtn = document.getElementById('publish-course');
  publishBtn.textContent = isPublished ? 'Курс опубликован' : 'Опубликовать курс';
  publishBtn.disabled = isPublished;
  publishBtn.onclick = async () => {
    try {
      await api.publishCourse(courseId);
      toast('Курс опубликован', 'success');
      refresh();
    } catch (e) {
      toast(e.message, 'error');
    }
  };
}
