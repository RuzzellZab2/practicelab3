import { api } from '../js/api.js';
import { session, esc, toast } from '../js/core.js';

export async function render(root, params) {
  const list = document.getElementById('courses-list');
  list.innerHTML = '<p class="muted">Загрузка…</p>';

  const courses = await api.listCoursesForAuthor(session.userId);
  list.innerHTML = courses.length
    ? courses.map(({ course, reviewer, lessonCount }) => {
        const published = course.status === 'published';
        return `
          <div class="card">
            <div class="card__head">
              <h2>${esc(course.title)}</h2>
              <span class="badge ${published ? 'badge--success' : 'badge--muted'}">${published ? 'Опубликован' : 'Черновик'}</span>
            </div>
            <p class="muted">Уроков: ${lessonCount} · Проверяющий: ${reviewer ? esc(reviewer.name) : 'не назначен'}</p>
            <a class="btn btn--small" href="#/author/course/${course.id}">Открыть</a>
          </div>`;
      }).join('')
    : '<p class="empty">У вас пока нет курсов.</p>';

  const form = document.getElementById('create-course-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = form.querySelector('#course-title-input').value;
    const desc = form.querySelector('#course-desc-input').value;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await api.createCourse(session.userId, title, desc);
      toast('Курс создан как черновик', 'success');
      form.reset();
      render(root, params);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
    }
  });
}
