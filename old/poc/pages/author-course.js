import { api } from '../js/api.js';
import { esc, toast } from '../js/core.js';

export async function render(root, params) {
  const courseId = params.id;
  const refresh = () => render(root, params);
  await renderCourse(courseId, refresh);
  await renderReviewer(courseId);
  await renderLessons(courseId);
}

async function renderCourse(courseId, refresh) {
  const { course } = await api.getAuthorCourseDetail(courseId);

  document.getElementById('course-name').textContent = course.title;
  document.getElementById('course-title').textContent = course.title;
  document.getElementById('course-desc').textContent = course.description || '';

  const published = course.status === 'published';
  document.getElementById('course-status').innerHTML = published
    ? '<span class="badge badge--success">Опубликованный курс</span>'
    : '<span class="badge badge--warning">Черновик</span>';

  const publishBtn = document.getElementById('publish-course');
  if (published) {
    publishBtn.disabled = true;
    publishBtn.textContent = 'Курс опубликован';
    return;
  }
  publishBtn.onclick = async () => {
    publishBtn.disabled = true;
    publishBtn.textContent = 'Публикуем…';
    try {
      await api.publishCourse(courseId);
      toast('Курс опубликован', 'success');
      refresh();
    } catch (e) {
      toast(e.message, 'error');
      publishBtn.disabled = false;
      publishBtn.textContent = 'Опубликовать курс';
    }
  };
}

async function renderReviewer(courseId) {
  const { reviewer } = await api.getAuthorCourseDetail(courseId);
  const current = document.getElementById('current-reviewer');
  current.textContent = reviewer
    ? 'Назначен: ' + reviewer.name
    : 'Ревьюер пока не назначен.';

  const reviewers = await api.listReviewers();
  const select = document.getElementById('reviewer-select');
  select.innerHTML = reviewers
    .map((r) => `<option value="${r.id}">${esc(r.name)}</option>`)
    .join('');

  document.getElementById('assign-reviewer').addEventListener('click', async () => {
    try {
      const r = await api.assignReviewer(courseId, select.value);
      toast('Ревьюер назначен на курс', 'success');
      current.textContent = 'Назначен: ' + r.name;
    } catch (e) {
      toast(e.message, 'error');
    }
  });
}

async function renderLessons(courseId) {
  const { lessons } = await api.getAuthorCourseDetail(courseId);
  const container = document.getElementById('course-lessons');

  if (!lessons.length) {
    container.innerHTML = '<p class="empty">Уроков пока нет.</p>';
    return;
  }

  container.innerHTML = lessons.map((l) => `
    <div class="lesson">
      <div class="lesson__row">
        <div>
          <div class="lesson__title">${l.position}. ${esc(l.title)}</div>
          <div class="card__meta">Шагов: ${l.stepCount}</div>
        </div>
        <div class="lesson__right">
          <span class="badge ${l.status === 'published' ? 'badge--success' : 'badge--muted'}">${l.status === 'published' ? 'Опубликован' : 'Черновик'}</span>
        </div>
      </div>
    </div>`).join('');
}
