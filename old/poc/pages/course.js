import { api } from '../js/api.js';
import { session, esc, toast } from '../js/core.js';

export async function render(root, params) {
  const courseId = params.id;
  const course = await api.getCourse(courseId);

  document.getElementById('course-breadcrumb').innerHTML =
    '<a href="#/catalog">Каталог</a> / ' + esc(course.title);
  document.getElementById('course-title').textContent = course.title;
  document.getElementById('course-desc').textContent = course.description || '';
  document.getElementById('course-status').innerHTML =
    course.status === 'published' ? '<span class="badge badge--success">Опубликованный курс</span>' : '';

  const lessons = await api.getLessonsWithStatus(session.userId, courseId);
  const passedCount = lessons.filter((l) => l.passed).length;
  document.getElementById('course-progress').textContent =
    'Пройдено уроков: ' + passedCount + ' из ' + lessons.length;

  const container = document.getElementById('course-lessons');
  if (!lessons.length) {
    container.innerHTML = '<p class="empty">В курсе пока нет уроков.</p>';
    return;
  }

  const statusBadge = (status) => {
    switch (status) {
      case 'passed': return '<span class="badge badge--success">Пройден</span>';
      case 'current': return '<span class="badge badge--primary">Текущий</span>';
      case 'locked': return '<span class="badge badge--muted">Заблокирован</span>';
      default: return '';
    }
  };

  container.innerHTML = lessons.map(({ lesson, status }) => {
    const stepCount = api.stepCount(lesson.id);
    const openable = status !== 'locked';
    const content = openable
      ? `<a class="btn btn--primary btn--small" href="#/lesson/${lesson.id}">${status === 'passed' ? 'Открыть' : 'Начать урок'}</a>`
      : '';
    return `
      <div class="lesson ${status === 'current' ? 'lesson--current' : ''}">
        <div class="lesson__row">
          <div>
            <div class="lesson__title">${lesson.position}. ${esc(lesson.title)}</div>
            <div class="card__meta">Шагов: ${stepCount}${lesson.has_work ? ' · практическая работа' : ''}</div>
          </div>
          <div class="lesson__right">${statusBadge(status)} ${content}</div>
        </div>
      </div>`;
  }).join('');
}
