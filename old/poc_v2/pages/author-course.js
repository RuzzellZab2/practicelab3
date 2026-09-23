import { api } from '../js/api.js';
import { esc, toast } from '../js/core.js';

const STEP_TYPES = [
  ['illustration', 'Иллюстрация'],
  ['video', 'Видео'],
  ['quiz', 'Квиз'],
  ['checklist', 'Чеклист самопроверки'],
  ['interactive', 'Интерактивное задание'],
];

export async function render(root, params) {
  const refresh = () => render(root, params);
  const courseId = params.id;

  const course = await api.getCourse(courseId);
  document.getElementById('ac-title').textContent = course.title;
  const isPublished = course.status === 'published';
  document.getElementById('ac-status').innerHTML = isPublished
    ? '<span class="badge badge--success">Опубликованный курс</span>'
    : '<span class="badge badge--muted">Черновик курса</span>';

  await renderReviewer(courseId, refresh);
  await renderLessons(courseId, refresh);
  renderAddLessonForm(courseId, refresh);

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

async function renderReviewer(courseId, refresh) {
  const reviewerEl = document.getElementById('ac-reviewer');
  const currentReviewer = await api.getCourseReviewer(courseId);
  const reviewers = await api.listReviewers();
  reviewerEl.innerHTML = `
    <h2>Ревьюер курса</h2>
    <p class="muted">${currentReviewer ? 'Назначен: <b>' + esc(currentReviewer.name) + '</b>' : 'Ревьюер не назначен'}</p>
    <div class="btn-row">
      <select id="reviewer-select" class="input">
        <option value="">— выберите ревьюера —</option>
        ${reviewers.map((r) => `<option value="${r.id}" ${currentReviewer && currentReviewer.id === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}
      </select>
      <button class="btn" id="assign-reviewer">Назначить</button>
    </div>`;

  document.getElementById('assign-reviewer').addEventListener('click', async () => {
    const val = document.getElementById('reviewer-select').value;
    try {
      await api.assignReviewer(courseId, val);
      toast('Ревьюер назначен на курс', 'success');
      refresh();
    } catch (e) {
      toast(e.message, 'error');
    }
  });
}

async function renderLessons(courseId, refresh) {
  const lessonsEl = document.getElementById('ac-lessons');
  const lessons = await api.getCourseLessons(courseId);

  if (!lessons.length) {
    lessonsEl.innerHTML = '<p class="empty">Уроков пока нет.</p>';
    return;
  }

  let html = '';
  for (const l of lessons) {
    const steps = await api.getLessonSteps(l.id);
    const statusBadge = l.status === 'published'
      ? '<span class="badge badge--success">Опубликован</span>'
      : '<span class="badge badge--muted">Черновик</span>';
    const deadlineBadge = l.deadline
      ? `<span class="badge badge--warning">Дедлайн: ${esc(String(l.deadline).replace('T', ' '))}</span>`
      : '';
    html += `
      <li class="lesson" data-lesson="${l.id}">
        <div class="lesson__row">
          <div class="lesson__title">Урок ${l.position}. ${esc(l.title)} ${statusBadge}</div>
          <span class="muted">шагов: ${steps.length}</span>
        </div>
        ${deadlineBadge ? `<div class="card__meta">${deadlineBadge}</div>` : ''}
        <div class="btn-row">
          <label class="field" style="flex:1">
            <span class="field__label">Название урока</span>
            <input class="input lesson-title-edit" type="text" value="${esc(l.title)}">
          </label>
          <button class="btn" data-save-draft="${l.id}">Сохранить черновик</button>
        </div>
        <div class="btn-row">
          <label class="field" style="flex:1">
            <span class="field__label">Дедлайн урока</span>
            <input class="input lesson-deadline" type="datetime-local" value="${l.deadline ? esc(String(l.deadline).slice(0, 16)) : ''}">
          </label>
          <button class="btn" data-set-deadline="${l.id}">Установить дедлайн</button>
        </div>
        <div class="card__meta">Шаги урока:</div>
        <ul class="checklist">
          ${steps.length
            ? steps.map((s) => `<li>${s.position}. ${esc(s.title)}</li>`).join('')
            : '<li class="muted">Шагов пока нет</li>'}
        </ul>
        <div class="btn-row">
          <input class="input step-title" type="text" placeholder="Название нового шага">
          <select class="input step-type">
            ${STEP_TYPES.map(([val, label]) => `<option value="${val}">${label}</option>`).join('')}
          </select>
          <button class="btn btn--primary" data-add-step="${l.id}">Добавить шаг</button>
        </div>
      </li>`;
  }
  lessonsEl.innerHTML = html;

  bindLessonControls(lessonsEl, refresh);
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

  root.querySelectorAll('[data-set-deadline]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('[data-lesson]');
      const deadline = card.querySelector('.lesson-deadline').value;
      try {
        await api.setLessonDeadline(btn.dataset.setDeadline, deadline);
        toast('Дедлайн установлен', 'success');
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

function renderAddLessonForm(courseId, refresh) {
  const form = document.getElementById('add-lesson-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = form.querySelector('#lesson-title-input').value;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await api.addLesson(courseId, title);
      toast('Урок добавлен на курс', 'success');
      form.reset();
      refresh();
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
    }
  });
}
