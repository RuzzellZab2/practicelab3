import { api } from '../js/api.js';
import { esc, toast } from '../js/core.js';

const STEP_TYPES = [
  ['illustration', 'Иллюстрация'],
  ['video', 'Видео'],
  ['quiz', 'Квиз'],
  ['checklist', 'Чеклист самопроверки'],
  ['interactive', 'Интерактивное задание'],
];

function fmtDeadline(deadline) {
  if (!deadline) return '';
  return String(deadline).replace('T', ' ');
}

export async function render(root, params) {
  const courseId = params.id;
  const refresh = () => render(root, params);
  await renderCourse(courseId, refresh);
  await renderDeadline(courseId, refresh);
  await renderReviewer(courseId);
  await renderLessons(courseId, refresh);
  bindAddLesson(courseId, refresh);
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

async function renderDeadline(courseId, refresh) {
  const { course } = await api.getAuthorCourseDetail(courseId);
  const deadlineEl = document.getElementById('course-deadline');
  deadlineEl.innerHTML = course.deadline
    ? `<span class="badge badge--warning">Дедлайн: ${esc(fmtDeadline(course.deadline))}</span>`
    : '<span class="muted">Дедлайн не установлен.</span>';

  const input = document.getElementById('course-deadline-input');
  input.value = course.deadline ? String(course.deadline).slice(0, 16) : '';

  document.getElementById('set-deadline').onclick = async () => {
    try {
      await api.setCourseDeadline(courseId, input.value);
      toast('Дедлайн установлен', 'success');
      refresh();
    } catch (e) {
      toast(e.message, 'error');
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

  document.getElementById('assign-reviewer').onclick = async () => {
    try {
      const r = await api.assignReviewer(courseId, select.value);
      toast('Ревьюер назначен на курс', 'success');
      current.textContent = 'Назначен: ' + r.name;
    } catch (e) {
      toast(e.message, 'error');
    }
  };
}

async function renderLessons(courseId, refresh) {
  const { lessons } = await api.getAuthorCourseDetail(courseId);
  const container = document.getElementById('course-lessons');

  if (!lessons.length) {
    container.innerHTML = '<p class="empty">Уроков пока нет.</p>';
    return;
  }

  let html = '';
  for (const l of lessons) {
    const steps = await api.getLessonSteps(l.id);
    const published = l.status === 'published';
    const statusBadge = published
      ? '<span class="badge badge--success">Опубликован</span>'
      : '<span class="badge badge--muted">Черновик</span>';
    const disabled = published ? 'disabled' : '';
    html += `
      <div class="lesson" data-lesson="${l.id}">
        <div class="lesson__row">
          <div class="lesson__title">Урок ${l.position}. ${esc(l.title)}</div>
          <span>${statusBadge}</span>
        </div>
        <div class="btn-row">
          <label class="field" style="flex:1; margin:0">
            <span class="field__label">Название урока</span>
            <input class="input lesson-title-edit" type="text" value="${esc(l.title)}" ${disabled}>
          </label>
          <button class="btn" data-save-draft="${l.id}" ${disabled}>Сохранить черновик</button>
        </div>
        <div class="card__meta">Шаги урока:</div>
        <ul class="checklist">
          ${steps.length
            ? steps.map((s) => `<li>${s.position}. ${esc(s.title)}</li>`).join('')
            : '<li class="muted">Шагов пока нет</li>'}
        </ul>
        <div class="btn-row">
          <input class="input step-title" type="text" placeholder="Название нового шага" style="flex:1">
          <select class="input step-type">
            ${STEP_TYPES.map(([val, label]) => `<option value="${val}">${label}</option>`).join('')}
          </select>
          <button class="btn btn--primary" data-add-step="${l.id}">Добавить шаг</button>
        </div>
      </div>`;
  }
  container.innerHTML = html;

  bindLessonControls(container, refresh);
}

function bindLessonControls(root, refresh) {
  root.querySelectorAll('[data-save-draft]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('[data-lesson]');
      const title = card.querySelector('.lesson-title-edit').value;
      try {
        await api.saveLessonDraft(btn.dataset.saveDraft, title);
        toast('Сохранённый черновик урока', 'success');
        refresh();
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  });

  root.querySelectorAll('[data-add-step]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('[data-lesson]');
      const title = card.querySelector('.step-title').value;
      const type = card.querySelector('.step-type').value;
      try {
        await api.addStep(btn.dataset.addStep, title, type);
        toast('Шаг добавлен в урок', 'success');
        refresh();
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  });
}

function bindAddLesson(courseId, refresh) {
  document.getElementById('add-lesson').onclick = async () => {
    const input = document.getElementById('lesson-title-input');
    const btn = document.getElementById('add-lesson');
    btn.disabled = true;
    try {
      await api.addLesson(courseId, input.value);
      toast('Урок добавлен на курс', 'success');
      input.value = '';
      refresh();
    } catch (e) {
      toast(e.message, 'error');
      btn.disabled = false;
    }
  };
}
