// In-memory «база данных». Все данные живут в этом объекте и мутируются действиями пользователя.

export const db = {
  users: [
    { id: 'u_author', role: 'course_author', name: 'Елена Смирнова' },
    { id: 'u_reviewer', role: 'reviewer', name: 'Мария Иванова' },
    { id: 'u_reviewer2', role: 'reviewer', name: 'Пётр Волков' },
    { id: 'u_student', role: 'student', name: 'Иван Петров' },
    { id: 'u_student2', role: 'student', name: 'Ольга Кузнецова' },
    { id: 'u_plain', role: 'user', name: 'Алексей Соколов' },
  ],

  courses: [
    {
      id: 'c_python', author_id: 'u_author',
      title: 'Python-разработчик',
      description: 'Полный курс по Python с нуля до продвинутого уровня',
      status: 'published',
    },
    {
      id: 'c_sql', author_id: 'u_author',
      title: 'Основы SQL',
      description: 'Работа с базами данных и запросами',
      status: 'draft',
    },
  ],

  lessons: [
    { id: 'l_py_intro', course_id: 'c_python', title: 'Введение в Python', position: 1, is_optional: false, status: 'published', has_work: false },
    { id: 'l_py_http', course_id: 'c_python', title: 'Основы HTTP', position: 2, is_optional: false, status: 'published', has_work: true },
    { id: 'l_sql_select', course_id: 'c_sql', title: 'Запросы SELECT', position: 1, is_optional: false, status: 'draft', has_work: false },
    { id: 'l_sql_join', course_id: 'c_sql', title: 'Объединение таблиц (JOIN)', position: 2, is_optional: false, status: 'draft', has_work: false },
  ],

  steps: [
    {
      id: 's_py_intro_1', lesson_id: 'l_py_intro', title: 'Что такое Python', position: 1, step_type: 'illustration', status: 'published',
      content: { text: 'Python — язык общего назначения с простым синтаксисом и большой экосистемой библиотек.', caption: 'Иллюстрация: структура интерпретатора Python' },
    },
    {
      id: 's_py_intro_2', lesson_id: 'l_py_intro', title: 'Циклы while и for', position: 2, step_type: 'video', status: 'published',
      content: { title: 'Циклы while и for', duration: '12:40' },
    },
    {
      id: 's_py_intro_3', lesson_id: 'l_py_intro', title: 'Квиз по синтаксису', position: 3, step_type: 'quiz', status: 'published',
      content: { question: 'Какой оператор перебирает элементы последовательности?', options: ['for', 'while', 'if', 'switch'], correct: 0 },
    },
    {
      id: 's_py_http_1', lesson_id: 'l_py_http', title: 'Как работает HTTP', position: 1, step_type: 'illustration', status: 'published',
      content: { text: 'HTTP — протокол передачи данных между клиентом и сервером: метод запроса, заголовки и тело ответа.', caption: 'Иллюстрация: схема «клиент — сервер»' },
    },
    {
      id: 's_py_http_2', lesson_id: 'l_py_http', title: 'Проверь себя по чеклисту', position: 2, step_type: 'checklist', status: 'published',
      content: { intro: 'Проверь свою работу по чеклисту:', items: ['Запрос составлен корректно', 'Ответ сервера проверен', 'Ошибки обработаны'] },
    },
    {
      id: 's_sql_select_1', lesson_id: 'l_sql_select', title: 'Основы SELECT', position: 1, step_type: 'illustration', status: 'draft',
      content: { text: 'SELECT выбирает данные из таблицы по условию WHERE.', caption: 'Иллюстрация: таблица и результат запроса' },
    },
    {
      id: 's_sql_join_1', lesson_id: 'l_sql_join', title: 'Внутреннее объединение', position: 1, step_type: 'illustration', status: 'draft',
      content: { text: 'INNER JOIN объединяет строки двух таблиц по совпадающему ключу.', caption: 'Иллюстрация: две таблицы и результат JOIN' },
    },
  ],

  works: [
    { id: 'w_student_http', student_id: 'u_student', lesson_id: 'l_py_http', status: 'draft', work_type: 'coding', content: '', submitted_at: null },
    { id: 'w_student2_http', student_id: 'u_student2', lesson_id: 'l_py_http', status: 'submitted', work_type: 'coding', content: 'https://github.com/olga/http-client', submitted_at: '2026-05-10T14:30:00Z' },
  ],

  reviews: [],

  enrollments: [
    { student_id: 'u_student', course_id: 'c_python' },
    { student_id: 'u_student2', course_id: 'c_python' },
  ],

  progress: [
    { id: 'pr_student_py', student_id: 'u_student', course_id: 'c_python', current_lesson_id: 'l_py_intro', completed_at: null },
    { id: 'pr_student2_py', student_id: 'u_student2', course_id: 'c_python', current_lesson_id: 'l_py_http', completed_at: null },
  ],

  courseReviewers: [
    { course_id: 'c_python', reviewer_id: 'u_reviewer' },
  ],

  stepCompletions: [],

  stepComments: [],

  roleRequests: [],
};
