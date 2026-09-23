import { api } from '../js/api.js';
import { session, esc, toast } from '../js/core.js';

export async function render(root, params) {
  await renderCourses();
  bindCreateForm();
}

async function renderCourses() {
  const container = document.getElementById('author-courses');
  container.innerHTML = '<p class="muted">Загрузка…</p>';

  const courses = await api.listCoursesForAuthor(session.userId);

  if (!courses.length) {
    container.innerHTML = '<p class="empty">У вас пока нет курсов.</p>';
    return;
  }

  container.innerHTML = courses.map(({ course, reviewer, lessonCount }) => {
    const statusBadge = course.status === 'published'
      ? '<span class="badge badge--success">Опубликованный курс</span>'
      : '<span class="badge badge--warning">Черновик</span>';
    return `
      <article class="card">
        <div class="card__head">
          <h2 class="card__title">${esc(course.title)}</h2>
          ${statusBadge}
        </div>
        <div class="card__body">
          <p class="card__desc">${esc(course.description || '')}</p>
          <div class="card__meta">Уроков: ${lessonCount} · Ревьюер: ${reviewer ? esc(reviewer.name) : 'не назначен'}</div>
        </div>
        <div class="card__actions">
          <a class="btn btn--primary" href="#/author/course/${course.id}">Открыть</a>
        </div>
      </article>`;
  }).join('');
}

function bindCreateForm() {
  document.getElementById('create-course').addEventListener('click', async () => {
    const title = document.getElementById('new-course-title').value;
    const desc = document.getElementById('new-course-desc').value;
    try {
      const course = await api.createCourse(session.userId, title, desc);
      toast('Курс создан как черновик', 'success');
      document.getElementById('new-course-title').value = '';
      document.getElementById('new-course-desc').value = '';
      location.hash = '#/author/course/' + course.id;
    } catch (e) {
      toast(e.message, 'error');
    }
  });
}
