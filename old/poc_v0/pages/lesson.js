import { api, isLessonPassed } from '../js/api.js';
import { session, esc, toast } from '../js/core.js';

export async function render(root, params) {
  const refresh = () => render(root, params);
  const lessonId = params.id;

  const lesson = await api.getLesson(lessonId);
  document.getElementById('lesson-title').textContent = lesson.title;
  const course = await api.getCourse(lesson.course_id);
  document.getElementById('lesson-breadcrumb').innerHTML =
    `<a href="#/course/${course.id}">${esc(course.title)}</a> / ${esc(lesson.title)}`;

  const passed = isLessonPassed(session.userId, lessonId);
  document.getElementById('lesson-status').innerHTML = passed
    ? '<span class="badge badge--success">Урок пройден</span>'
    : '';

  await renderSteps(document.getElementById('steps'), lessonId, refresh);
  await renderWork(document.getElementById('work-section'), lessonId, lesson, refresh);
}

function stepBodyHtml(s) {
  switch (s.step_type) {
    case 'illustration':
      return `
        <p>${esc(s.content.text)}</p>
        <p class="muted">${esc(s.content.caption)}</p>
        <button class="btn btn--primary" data-action="done">Понятно, дальше</button>`;
    case 'video':
      return `
        <div class="video">▶ ${esc(s.content.title)} <span class="muted">(${esc(s.content.duration)})</span></div>
        <button class="btn btn--primary" data-action="done">Видео просмотрено</button>`;
    case 'checklist': {
      const items = (s.content.items || [])
        .map((it) => `<li class="check"><label><input type="checkbox" data-check> ${esc(it)}</label></li>`)
        .join('');
      return `
        <p>${esc(s.content.intro || '')}</p>
        <ul class="checklist">${items}</ul>
        <button class="btn btn--primary" data-action="done">Подтвердить выполнение</button>`;
    }
    case 'quiz': {
      const opts = (s.content.options || [])
        .map((o, i) => `<li class="check"><label><input type="radio" name="quiz-${s.id}" value="${i}"> ${esc(o)}</label></li>`)
        .join('');
      return `
        <p class="quiz__q">${esc(s.content.question)}</p>
        <ul class="checklist">${opts}</ul>
        <button class="btn btn--primary" data-action="done">Ответить</button>`;
    }
    default:
      return `
        <p>${esc((s.content && s.content.text) || '')}</p>
        <button class="btn btn--primary" data-action="done">Отметить как пройденный</button>`;
  }
}

async function renderSteps(container, lessonId, refresh) {
  const steps = await api.getSteps(lessonId);
  const done = await api.getStepCompletions(session.userId, lessonId);
  const doneSet = new Set(done);

  if (!steps.length) {
    container.innerHTML = '<p class="muted">В уроке пока нет шагов.</p>';
    return;
  }

  container.innerHTML = steps.map((s) => {
    const isDone = doneSet.has(s.id);
    return `
      <div class="card step ${isDone ? 'step--done' : ''}" data-step="${s.id}">
        <div class="step__head">
          <span class="step__num">Шаг ${s.position}</span>
          <h3 class="step__title">${esc(s.title)}</h3>
          ${isDone ? '<span class="badge badge--success">Пройден</span>' : ''}
        </div>
        <div class="step__body">${stepBodyHtml(s)}</div>
      </div>`;
  }).join('');

  const firstNotDone = steps.find((s) => !doneSet.has(s.id));

  container.querySelectorAll('.step').forEach((stepEl) => {
    const step = steps.find((s) => s.id === stepEl.dataset.step);
    const isDone = doneSet.has(step.id);
    if (isDone || (firstNotDone && step.id !== firstNotDone.id)) {
      stepEl.querySelectorAll('button, input, textarea, select').forEach((el) => { el.disabled = true; });
      return;
    }
    bindStep(stepEl, step, refresh);
  });
}

function bindStep(stepEl, step, refresh) {
  const action = stepEl.querySelector('[data-action="done"]');
  if (!action) return;
  action.addEventListener('click', async () => {
    if (step.step_type === 'checklist') {
      const checks = [...stepEl.querySelectorAll('[data-check]')];
      if (!checks.length || !checks.every((c) => c.checked)) {
        toast('Отметьте все пункты чеклиста', 'error');
        return;
      }
    }
    if (step.step_type === 'quiz') {
      const sel = stepEl.querySelector('input[type="radio"]:checked');
      if (!sel) {
        toast('Выберите вариант ответа', 'error');
        return;
      }
      if (Number(sel.value) !== step.content.correct) {
        toast('Шаг не пройден — ответ неверный', 'error');
        return;
      }
    }
    try {
      const res = await api.completeStep(session.userId, step.id);
      toast(res.lessonPassed ? 'Урок пройден' : 'Шаг пройден', 'success');
      refresh();
    } catch (e) {
      toast(e.message, 'error');
    }
  });
}

function reviewBlock(latest) {
  const verdict = latest.verdict === 'approved' ? 'Работа принята' : 'Работа отправлена на доработку';
  const cls = latest.verdict === 'approved' ? 'review--ok' : 'review--warn';
  return `
    <div class="review ${cls}">
      <div class="review__verdict">${verdict}</div>
      <div class="review__comment">«${esc(latest.comment)}»</div>
    </div>`;
}

async function renderWork(container, lessonId, lesson, refresh) {
  if (!lesson.has_work) {
    container.innerHTML = '';
    return;
  }

  const work = await api.getWork(session.userId, lessonId);
  const latest = work ? await api.getLatestReview(work.id) : null;

  const statusMap = {
    draft: ['Черновик сохранён', 'badge--warning'],
    submitted: ['Работа на ревью', 'badge--primary'],
    approved: ['Работа принята', 'badge--success'],
    changes_requested: ['Работа на доработке', 'badge--danger'],
  };
  const status = work ? (statusMap[work.status] || ['—', 'badge--muted']) : null;
  const editable = !work || work.status === 'draft' || work.status === 'changes_requested';

  container.innerHTML = `
    <div class="card">
      <div class="card__head">
        <h2>Практическая работа</h2>
        ${status ? `<span class="badge ${status[1]}">${status[0]}</span>` : ''}
      </div>
      <p class="muted">Выполните задание и отправьте работу на проверку. Урок считается пройденным после того, как ревьюер примет работу.</p>
      <label class="field">
        <span class="field__label">Решение (ссылка на репозиторий, код или текст)</span>
        <textarea id="work-text" class="input" rows="4" placeholder="https://github.com/..." ${editable ? '' : 'disabled'}>${esc(work ? work.content : '')}</textarea>
      </label>
      ${latest ? reviewBlock(latest) : ''}
      <div class="btn-row">
        ${
          editable
            ? `<button class="btn" id="save-draft">Сохранить черновик</button>
               <button class="btn btn--primary" id="submit-work">${work && work.status === 'changes_requested' ? 'Отправить повторно' : 'Отправить на ревью'}</button>`
            : work && work.status === 'submitted'
              ? '<p class="muted">Работа отправлена на проверку. Результат появится в разделе «Мои результаты».</p>'
              : ''
        }
      </div>
    </div>`;

  if (!editable) return;

  const textEl = container.querySelector('#work-text');
  container.querySelector('#save-draft').addEventListener('click', async () => {
    try {
      await api.saveWorkDraft(session.userId, lessonId, textEl.value);
      toast('Черновик сохранён', 'success');
      refresh();
    } catch (e) {
      toast(e.message, 'error');
    }
  });
  container.querySelector('#submit-work').addEventListener('click', async () => {
    try {
      await api.submitWork(session.userId, lessonId);
      toast('Работа на ревью', 'success');
      refresh();
    } catch (e) {
      toast(e.message, 'error');
    }
  });
}
