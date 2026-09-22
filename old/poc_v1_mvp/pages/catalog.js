import { api } from '../js/api.js';
import { session, esc, toast } from '../js/core.js';

export async function render(root, params) {
  const list = document.getElementById('course-list');
  list.innerHTML = '<p class="muted">Загрузка…</p>';

  const courses = await api.listPublishedCourses();
  const enrolled = await api.getEnrolledCourseIds(session.userId);

  if (!courses.length) {
    list.innerHTML = '<p class="empty">Пока нет опубликованных курсов.</p>';
    return;
  }

  list.innerHTML = courses.map((c) => {
    const isEnrolled = enrolled.includes(c.id);
    const lessons = api.lessonCount(c.id);
    return `
      <article class="card">
        <div class="card__head">
          <h2 class="card__title">${esc(c.title)}</h2>
        </div>
        <div class="card__body">
          <p class="card__desc">${esc(c.description || '')}</p>
          <div class="card__meta">Уроков: ${lessons}</div>
        </div>
        <div class="card__actions">
          ${
            isEnrolled
              ? `<a class="btn btn--primary" href="#/course/${c.id}">Открыть курс</a>`
              : `<button class="btn btn--primary" data-enroll="${c.id}">Записаться</button>`
          }
        </div>
      </article>`;
  }).join('');

  list.querySelectorAll('[data-enroll]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const courseId = btn.dataset.enroll;
      btn.disabled = true;
      btn.textContent = 'Записываем…';
      try {
        await api.enroll(session.userId, courseId);
        toast('Вы имеете доступ к курсу', 'success');
        render(root, params);
      } catch (e) {
        toast(e.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Записаться';
      }
    });
  });
}
