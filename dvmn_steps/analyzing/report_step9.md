# Отчёт о сверке: Концепты → Контракт-пак (schema.md + openapi.yaml)

## Ключевые решения AI-агента

| # | Решение | Обоснование |
|---|---------|-------------|
| 1 | **Роли пользователей**: `student`, `teacher`, `admin` | Категории «Ученик», «Преподаватель», «Администратор» из `user.md`. «Автор курса» не роль, а FK `courses.author_id` |
| 2 | **Статусы `draft` / `published`** у курса, урока, шага | Категории «Черновик» и «Опубликованный» |
| 3 | **Дедлайн урока**: `deadline` + `deadline_type` (soft/hard) | Категория «Урок с дедлайном» |
| 4 | **Типы шагов**: `checklist`, `illustration`, `video`, `quiz` | Категории из `step.md`. «Черновик шага» — статус, не тип |
| 5 | **Работа ученика привязана к уроку**, а не к шагу | Урок содержит ровно одну работу, FK `student_works.lesson_id` |
| 6 | **Статусный автомат работы**: `draft→submitted→approved/changes_requested` | Категории `student_work.md`. `overdue` удалён как избыточный |
| 7 | **`work_type`**: `coding`, `interactive` | Категории «Работа на кодирование», «Работа с интерактивным заданием» |
| 8 | **Ревью**: `review_round` (1+), UNIQUE(student_work_id, review_round) | Категории «Первичное ревью», «Повторное ревью» |
| 9 | **Прогресс по урокам**: `current_lesson_id` nullable, `completed_at` nullable | Категории «Курс начат/в процессе/завершён» |
| 10 | **M:N связи** через `course_group_access` и `group_members` | Категория «Курс с группами» + ответ на уточняющий вопрос |
| 11 | **`description` добавлен в `course.md`** как опциональный атрибут | Рекомендованная правка |
| 12 | **endpoint'ы `group-members` и `course-group-access`** добавлены в API | Рекомендованная правка |

## Как это выражено в БД (schema.md)

**10 таблиц:**

| Таблица | Концепт | Ключевые поля |
|---------|---------|---------------|
| `users` | Пользователь | id, role(enum), name |
| `courses` | Курс | id, author_id(FK→users), title, description(null), status(enum) |
| `groups` | Группа | id, name |
| `group_members` | (связь Группа↔Ученики) | group_id+user_id composite PK |
| `course_group_access` | (связь Курс↔Группа) | course_id+group_id composite PK |
| `lessons` | Урок | id, course_id(FK), title, position, status, is_optional, deadline(null), deadline_type(null,enum) |
| `steps` | Шаг | id, lesson_id(FK), title, position, step_type(null,enum: c/i/v/q), content(null), status |
| `student_works` | Работа ученика | id, student_id(FK→users), lesson_id(FK→lessons), status(enum: draft/submitted/approved/changes_requested), work_type(enum), content(null), submitted_at(null) |
| `reviews` | Ревью | id, student_work_id(FK), reviewer_id(FK→users), verdict(enum), comment(null), review_round(CHECK>0) |
| `student_progresses` | Прогресс | id, student_id(FK→users), course_id(FK→courses), current_lesson_id(null,FK→lessons), completed_at(null) |

**ER:** `users 1:N courses/student_works/reviews/student_progresses`; `groups M:N users` via `group_members`; `courses M:N groups` via `course_group_access`; `courses 1:N lessons 1:N steps`; `lessons 1:N student_works`; `student_works 1:N reviews`.

## Как это выражено в API (openapi.yaml)

**10 endpoint'ов** (8 instance + 2 list по query-параметру):

| Endpoint | Тип | Схема |
|----------|-----|-------|
| `GET /users/{id}` | instance | User |
| `GET /courses/{id}` | instance | Course |
| `GET /groups/{id}` | instance | Group |
| `GET /lessons/{id}` | instance | Lesson |
| `GET /steps/{id}` | instance | Step |
| `GET /student-works/{id}` | instance | StudentWork |
| `GET /reviews/{id}` | instance | Review |
| `GET /student-progresses/{id}` | instance | StudentProgress |
| `GET /group-members?group_id=...` | list | GroupMember[] |
| `GET /course-group-access?course_id=...` | list | CourseGroupAccess[] |

**Схемы:** 11 шт (10 сущностей + Error).

## Несостыковки

| # | Несостыковка | Концепт | БД | API | Серьёзность |
|---|-------------|---------|----|-----|-------------|
| 1 | **`name` у `users`** — нет спецификации атрибутов в `user.md` | не специфицирован | VARCHAR(255) | string | **низкая** — формат неясен |
| 2 | **`content` у `steps`** — единое TEXT-поле для разных типов шагов | не специфицирован | TEXT | string | **низкая** — вопрос закрыт ответом, но в схеме не отражено |

## Рекомендованные правки

| # | Правка | Где менять | Затрагивает |
|---|--------|-----------|-------------|
| 1 | **Специфицировать атрибуты в `user.md`**: какие поля (id, role, name), их тип и обязательность | user.md | Концепт |

## Открытые вопросы

1. **Нет открытых вопросов.** Все ранее заданные вопросы получили ответы и учтены в контракт-паке.
