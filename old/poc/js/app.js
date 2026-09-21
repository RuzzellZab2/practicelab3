// Точка входа: роутер, навигация, переключение ролей.

import { session, switchRole } from './core.js';

const ROLE_HOME = {
  student: '#/catalog',
  course_author: '#/author',
  reviewer: '#/review',
};

const routes = [
  { re: /^\/catalog$/, tpl: 'pages/catalog.html', load: () => import('../pages/catalog.js') },
  { re: /^\/course\/([\w-]+)$/, tpl: 'pages/course.html', load: () => import('../pages/course.js') },
  { re: /^\/lesson\/([\w-]+)$/, tpl: 'pages/lesson.html', load: () => import('../pages/lesson.js') },
  { re: /^\/my-reviews$/, tpl: 'pages/my-reviews.html', load: () => import('../pages/my-reviews.js') },
  { re: /^\/author$/, tpl: 'pages/author.html', load: () => import('../pages/author.js') },
  { re: /^\/author\/course\/([\w-]+)$/, tpl: 'pages/author-course.html', load: () => import('../pages/author-course.js') },
  { re: /^\/review$/, tpl: 'pages/review.html', load: () => import('../pages/review.js') },
  { re: /^\/review\/work\/([\w-]+)$/, tpl: 'pages/review-work.html', load: () => import('../pages/review-work.js') },
];

const templateCache = {};
const app = document.getElementById('app');

async function fetchTemplate(path) {
  if (!templateCache[path]) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Не удалось загрузить шаблон: ' + path);
    templateCache[path] = await res.text();
  }
  return templateCache[path];
}

async function render() {
  const path = location.hash.replace(/^#/, '') || '/catalog';
  const route = routes.find((r) => r.re.test(path));
  if (!route) {
    app.innerHTML = '<div class="card"><p>Страница не найдена.</p></div>';
    return;
  }
  const match = path.match(route.re);
  const params = { id: match ? match[1] : null };
  try {
    app.innerHTML = await fetchTemplate(route.tpl);
    const mod = await route.load();
    await mod.render(app, params);
  } catch (e) {
    console.error(e);
    app.innerHTML = '<div class="card"><h2>Не удалось загрузить страницу</h2>' +
      '<p>' + e.message + '</p>' +
      '<p class="muted">Убедитесь, что сайт открыт через HTTP-сервер (например, <code>python3 -m http.server</code>), а не напрямую из файла.</p></div>';
  }
  highlightNav();
}

function highlightNav() {
  const path = location.hash.replace(/^#/, '');
  document.querySelectorAll('.topbar__nav a').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + path);
  });
}

function buildNav() {
  const nav = document.getElementById('main-nav');
  const items = {
    student: [
      { href: '#/catalog', label: 'Каталог' },
      { href: '#/my-reviews', label: 'Мои результаты' },
    ],
    course_author: [{ href: '#/author', label: 'Мои курсы' }],
    reviewer: [{ href: '#/review', label: 'Работы на ревью' }],
  };
  nav.innerHTML = (items[session.role] || [])
    .map((i) => `<a href="${i.href}">${i.label}</a>`)
    .join('');
}

function buildRoleSwitch() {
  const sel = document.getElementById('role-switch');
  sel.innerHTML = `
    <option value="student">Ученик</option>
    <option value="course_author">Автор курса</option>
    <option value="reviewer">Ревьюер</option>`;
  sel.value = session.role;
  sel.addEventListener('change', () => {
    switchRole(sel.value);
    buildNav();
    const home = ROLE_HOME[session.role];
    if (location.hash !== home) location.hash = home;
    else render();
  });
}

document.getElementById('brand').addEventListener('click', () => {
  location.hash = ROLE_HOME[session.role];
});

window.addEventListener('hashchange', render);

buildRoleSwitch();
buildNav();
render();
