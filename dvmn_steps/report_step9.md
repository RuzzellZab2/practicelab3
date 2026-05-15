# Отчёт о сверке контракт-пака с концептами (step 9)

## Ключевые решения AI-агента

1. **Пользователь** — добавлен как самостоятельная таблица `users` с полем `role` и FK-связями для всех `student_id` / `reviewer_id`.
2. **Автор курса** — `courses.author_id` (FK → users.id), а не роль admin.
3. **Жизненный цикл vs тип работы** — `student_works.status` (5 значений жизненного цикла) и `work_type` (test, coding, interactive) как независимые измерения.
4. **Ревью как отдельная сущность** — таблица `reviews` с `review_round` для поддержки первичных и повторных проверок.
5. **Иерархия: Шаг → Работа ученика → Ревью** — `student_works.step_id` связывает работу с шагом, `reviews.student_work_id` — ревью с работой.
6. **Группы как логический ярлык** — таблица `groups` без расписания, связь M:N с курсами через `course_group_access`.
7. **Дедлайны по группам** — `lesson_group_deadlines` для разных дедлайнов одного урока для разных потоков.
8. **Прогресс** — `student_progresses` (текущий урок) + `step_completions` (пошаговая детализация).
9. **Платформа не таблица** — заменена на контекстный слой, не вынесена в БД.
10. **Необязательные уроки** — поле `lessons.is_optional` для пропуска урока без потери прогресса.
11. **Попытки в работе** — поля `max_attempts` и `current_attempt` в `student_works` для поддержки пересдач.
12. **Типы шагов** — enum `step_type` синхронизирован с категориями из `step.md`: checklist, illustration, video, student_work, quiz.

## Как это выражено в БД

| Решение | Таблицы / Поля |
|---------|----------------|
| Пользователь | `users(id, role, name)` |
| Автор курса | `courses.author_id → users.id` |
| Статус + тип работы | `student_works(status, work_type)` |
| Попытки в работе | `student_works(max_attempts, current_attempt)` |
| Ревью с историей | `reviews(student_work_id, reviewer_id, verdict, review_round)` |
| Иерархия | `student_works.step_id → steps.id`; `reviews.student_work_id → student_works.id` |
| Группы | `groups`, `course_group_access` (M:N) |
| Дедлайны по группам | `lesson_group_deadlines(lesson_id, group_id, deadline, deadline_type)` |
| Прогресс | `student_progresses`, `step_completions` |
| Необязательный урок | `lessons.is_optional` |
| Типы шагов | `steps.step_type` enum: checklist, illustration, video, student_work, quiz |

## Как это выражено в API

| Endpoint | Сущность |
|----------|----------|
| `GET /users/{id}` | User |
| `GET /courses/{id}` | Course |
| `GET /lessons/{id}` | Lesson (включая `is_optional`) |
| `GET /steps/{id}` | Step (включая `step_type`) |
| `GET /student-works/{id}` | StudentWork (включая `max_attempts`, `current_attempt`) |
| `GET /reviews/{id}` | Review |
| `GET /student-progresses/{id}` | StudentProgress |
| `GET /groups/{id}` | Group |

Всего 8 endpoints, GET instance only. URI в kebab-case, ресурсы во множественном числе. Каждый возвращает 200 с примером JSON и 404.

## Несостыковки

1. **Платформа — не таблица** — `platform.md` есть в концептах, но таблицы `platforms` в БД нет. Платформа неявна (единственный сервис), но расходится с ожиданием по карточке.
2. **`course_enrollments` не описан в концептах** — в карточках нет сущности «Запись на курс», таблица добавлена в БД без концептуального обоснования.
3. **Нет концепта «Группа»** — `groups` упоминается в `course.md` (категория «Курс с группами`) и в `user.md` (администратор управляет группами), но самостоятельного файла концепта нет.
4. **`review_round` не описан в концептах** — в `review.md` есть категории «Первичное ревью» / «Повторное ревью», но поле `review_round` не выведено из карточки явно.
5. **`step_completions` не следует из концептов** — таблица добавлена по решению из `questions_step8.md`, в карточках концептов такой сущности нет.
6. **Нет категории для статуса `overdue`** — в `student_work.md` есть категория «Просроченная работа», но как статус жизненного цикла `overdue` не описан в явной схеме переходов.
7. **`is_optional` не описан в контексте прогресса** — не зафиксировано, влияет ли пропуск необязательного урока на `student_progresses.completed_at`.

## Рекомендованные правки

1. **Добавить концепт «Группа»** (`concepts/group.md`) — чтобы обосновать таблицы `groups`, `course_group_access`, `lesson_group_deadlines`, `course_enrollments`.
2. **Добавить концепт «Прогресс ученика»** (`concepts/student_progress.md`) — чтобы обосновать таблицы `student_progresses` и `step_completions`.
3. **Обосновать `course_enrollments`** — добавить категорию «Запись на курс» в `course.md` или в `user.md`.
4. **Добавить диаграмму переходов статусов** — в `student_work.md` описать, какие переходы между статусами жизненного цикла допустимы (draft → submitted → approved/changes_requested/overdue и т.д.).
5. **Зафиксировать влияние `is_optional` на прогресс** — в `lesson.md` или `student_progress.md` описать, что пропуск необязательного урока не блокирует завершение курса.

## Открытые вопросы

1. **Платформа — концепт или таблица?** Если сервис всегда один (dvmn.org), таблица `platforms` не нужна. Если планируется мульти-арендность — нужна.
2. **Нужны ли endpointы для `course_enrollments` и `lesson_group_deadlines`?** Сейчас они не выставлены в API, но могут потребоваться для клиентов.
3. **Как `max_attempts` влияет на жизненный цикл?** При исчерпании попыток работа должна автоматически переходить в статус `overdue` или оставаться в `submitted`?
