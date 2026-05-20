# Отчёт о сверке контракт-пака с концептами (step 9)

## Ключевые решения AI-агента

1. **Пользователь** — добавлен как самостоятельная таблица `users` с полем `role` и FK-связями для всех `student_id` / `reviewer_id`.
2. **Автор курса** — `courses.author_id` (FK → users.id), а не роль admin.
3. **Жизненный цикл vs тип работы** — `student_works.status` (5 значений) и `work_type` (test, coding, interactive) как независимые измерения.
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
| Запись на курс | `course_enrollments(user_id, course_id)` |

## Как это выражено в API

| Endpoint | Сущность |
|----------|----------|
| `GET /users/{id}` | User |
| `GET /courses/{id}` | Course |
| `GET /groups/{id}` | Group |
| `GET /lessons/{id}` | Lesson (включая `is_optional`) |
| `GET /steps/{id}` | Step (включая `step_type`) |
| `GET /student-works/{id}` | StudentWork (включая `max_attempts`, `current_attempt`) |
| `GET /reviews/{id}` | Review |
| `GET /student-progresses/{id}` | StudentProgress |

Всего 8 endpoints, GET instance only. URI в kebab-case, ресурсы во множественном числе.

## Несостыковки

1. **Платформа — не таблица** — `platform.md` есть в концептах, но таблицы `platforms` в БД нет. Платформа неявна (единственный сервис), но расходится с ожиданием по карточке.
2. **`course_enrollments` нет в API** — таблица есть в БД, но endpoint `GET /course-enrollments/` не выставлен (имеет композитный PK, не подходит под шаблон `/{id}`).
3. **`review_round` не выведен из концептов явно** — в `review.md` есть категории «Первичное ревью» / «Повторное ревью», но поле `review_round` — интерпретация, не вытекающая прямо из карточки.
4. **Нет категории для статуса `overdue` в жизненном цикле** — в `student_work.md` есть категория «Просроченная работа», но переход статусов (когда и как работа становится `overdue`) не описан.
5. **`is_optional` не описан в контексте прогресса** — не зафиксировано, влияет ли пропуск необязательного урока на `student_progresses.completed_at`.
6. **Схема не покрывает уроки по истечению дедлайна `soft`** — различие между `soft` и `hard` deadline описано в концептах, но в БД нет поля, определяющего поведение после истечения (блокировка vs предупреждение).

## Рекомендованные правки

1. **Добавить схему переходов статусов** — в `student_work.md` описать жизненный цикл: `draft → submitted → [approved | changes_requested]`, а также условия перехода в `overdue`.
2. **Зафиксировать влияние `is_optional` на прогресс** — в `lesson.md` или `student_progress.md` описать, что необязательные уроки не влияют на `completed_at`.
3. **Явно описать `review_round` в концепте** — добавить в `review.md` поле, отражающее номер раунда проверки.
4. **Зафиксировать поведение `soft` vs `hard` дедлайна** — в `lesson.md` описать различие: hard — блокировка доступа, soft — предупреждение без блокировки.
5. **Убрать endpoint для course_enrollments или изменить подход** — поскольку PK композитный, endpoint с одним `id` невозможен. Либо убрать, либо добавить query-параметры.

## Открытые вопросы

1. **Платформа — концепт или таблица?** Если сервис всегда один (dvmn.org), таблица `platforms` не нужна. Если планируется мульти-арендность — нужна.
2. **Нужны ли endpointы для `course_enrollments` и `lesson_group_deadlines`?** Сейчас они не выставлены в API, но могут потребоваться для клиентов.
3. **Как `max_attempts` влияет на жизненный цикл?** При исчерпании попыток работа должна автоматически переходить в статус `overdue` или оставаться в `submitted`?
