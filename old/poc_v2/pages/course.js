import { api } from '../js/api.js';
import { session, esc } from '../js/core.js';

export async function render(root, params) {
  const courseId = params.id;
  const listEl = document.getElementById('lesson-list');
  listEl.innerHTML = '<p class="muted">Загрузка…</p>';

  const course = await api.getCourse(courseId);
  document.getElementById('course-title').textContent = course.title;
  document.getElementById('course-meta').textContent = course.description || '';

  const items = await api.getLessonsWithStatus(session.userId, courseId);
  const passedCount = items.filter((i) => i.passed).length;
  const total = items.length;
  const pct = total ? Math.round((passedCount / total) * 100) : 0;

  document.getElementById('course-progress').style.width = pct + '%';
  document.getElementById('course-progress-text').textContent =
    `Пройдено уроков: ${passedCount} из ${total}`;

  listEl.innerHTML = items.map(({ lesson, status }) => {
    let badge = '';
    let openable = false;
    let cls = '';
    if (status === 'passed') {
      badge = '<span class="badge badge--success">Пройден</span>';
      openable = true;
    } else if (status === 'current') {
      badge = '<span class="badge badge--primary">Текущий</span>';
      openable = true;
      cls = 'lesson--current';
    } else {
      badge = '<span class="badge badge--muted">Недоступен</span>';
    }
    const workMark = lesson.has_work ? ' · практическая работа' : '';
    return `
      <li class="lesson ${cls}">
        <div class="lesson__row">
          <div class="lesson__title">Урок ${lesson.position}. ${esc(lesson.title)}${workMark}</div>
          <div class="lesson__right">
            ${badge}
            ${openable ? `<a class="btn btn--small" href="#/lesson/${lesson.id}">Открыть</a>` : ''}
          </div>
        </div>
      </li>`;
  }).join('');
}
