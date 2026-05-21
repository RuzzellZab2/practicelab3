# Отчёт о сверке: Концепты → Контракт-пак (schema.md + openapi.yaml)

## Ключевые решения AI-агента

| # | Решение | Обоснование |
|---|---------|-------------|
| 1 | **Роли пользователей**: `student`, `teacher`, `admin` | Категории «Ученик», «Преподаватель», «Администратор» из `user.md`. «Автор курса» не роль, а выражается FK `courses.author_id` |
| 2 | **Статусы `draft` / `published`** у курса, урока, шага | Категории «Черновик» и «Опубликованный» из `course.md`, `lesson.md`, `step.md` |
| 3 | **Дедлайн урока**: `deadline` + `deadline_type` (soft/hard) | Категория «Урок с дедлайном» из `lesson.md` |
| 4 | **Типы шагов**: `checklist`, `illustration`, `video`, `student_work`, `quiz` | Категории из `step.md`. «Черновик шага» — не тип, а статус |
| 5 | **Работа ученика привязана к шагу**, а не к уроку напрямую | `student_works.step_id → steps.id`. Урок → шаг → работа (косвенная связь) |
| 6 | **Статусный автомат работы**: `draft→submitted→approved/changes_requested`, + `overdue` | Категории: черновик, на ревью, проверенная, принятая, на доработке, просроченная (`student_work.md`) |
| 7 | **`work_type`**: `coding`, `interactive` | Категории «Работа на кодирование», «Работа с интерактивным заданием». Квиз — шаг, а не работа |
| 8 | **Ревью**: `review_round` (1+), UNIQUE(student_work_id, review_round) | Категории «Первичное ревью», «Повторное ревью» из `review.md` |
| 9 | **Прогресс**: `current_lesson_id` nullable, `completed_at` nullable | Категории «Курс начат», «Курс в процессе», «Курс завершён» из `student_progress.md` |
| 10 | **M:N курс-группа** через `course_group_access` | Категория «Курс с группами» из `course.md` |
| 11 | **Все `id` — UUID v4** | Соглашение контракт-пака |
| 12 | **FK с `ON DELETE CASCADE`** | Соглашение контракт-пака |
| 13 | **UNIQUE-индексы на `(course_id, position)`** у уроков и `(lesson_id, position)` у шагов | Обеспечивают целостность порядка внутри родителя |
| 14 | **CHECK `submitted_at IS NOT NULL OR status = 'draft'`** | Только черновик может быть без даты отправки |
| 15 | **CHECK `current_attempt >= 1 AND (max_attempts IS NULL OR current_attempt <= max_attempts)`** | Защита целостности попыток |
| 16 | **Только GET instance endpoint'ы — без списков, без мутаций** | API чтения (v0.1.0), без list и mutation |
| 17 | **`description` nullable у `courses`** | Черновик курса может не иметь описания |
| 18 | **`step_type` nullable у `steps`** | Тип шага может быть не указан |
| 19 | **`content` nullable у `steps` и у `student_works`** | Не все типы шагов/работ имеют содержимое |
| 20 | **`content` у `student_works` — TEXT** | Ссылка (GitHub), код, текст — всё в одном поле |

## Как это выражено в БД (schema.md)

**9 таблиц:**

| Таблица | Концепт | Поля (ключевые) | Связи |
|---------|---------|-----------------|-------|
| `users` | Пользователь | id, role(enum), name | — |
| `courses` | Курс | id, author_id(FK→users), title, description(null), status(enum) | lessons, course_group_access |
| `groups` | Группа | id, name | course_group_access |
| `course_group_access` | Курс↔Группа | course_id(FK)+group_id(FK) composite PK | courses, groups |
| `lessons` | Урок | id, course_id(FK), title, position(CHECK>0), status, is_optional, deadline(null), deadline_type(null,enum) | steps, student_works (косвенно) |
| `steps` | Шаг | id, lesson_id(FK), title, position(CHECK>0), step_type(null,enum), content(null), status | student_works |
| `student_works` | Работа ученика | id, student_id(FK→users), step_id(FK→steps), status(enum), work_type(enum), max_attempts(null), current_attempt(=1), content(null), reviewer_comment(null), submitted_at(null) | reviews |
| `reviews` | Ревью | id, student_work_id(FK), reviewer_id(FK→users), verdict(enum), comment(null), review_round(CHECK>0) | — |
| `student_progresses` | Прогресс | id, student_id(FK→users), course_id(FK→courses), current_lesson_id(null,FK→lessons), completed_at(null) | — |

**Соглашения и детали:**
- Все `id` UUID v4, все таблицы имеют `created_at`, `updated_at` TIMESTAMPTZ
- FK везде `ON DELETE CASCADE`
- Индексы: 12 шт, включая 4 UNIQUE-композитных
- 2 CHECK-constraint на `student_works`
- ER: `users 1:N courses | student_works | reviews | student_progresses`
- ER: `courses 1:N lessons; courses M:N groups (via course_group_access)`
- ER: `lessons 1:N steps; steps 1:N student_works; student_works 1:N reviews`
- ER: `lessons >── student_works` — косвенная связь через steps

## Как это выражено в API (openapi.yaml)

**8 GET instance endpoint'ов:**

| Endpoint | operationId | Схема | Поля (required) |
|----------|-------------|-------|-----------------|
| `GET /users/{id}` | getUser | User | id, role, name, created_at, updated_at |
| `GET /courses/{id}` | getCourse | Course | id, author_id, title, status, created_at, updated_at |
| `GET /groups/{id}` | getGroup | Group | id, name, created_at, updated_at |
| `GET /lessons/{id}` | getLesson | Lesson | id, course_id, title, position, is_optional, status, created_at, updated_at |
| `GET /steps/{id}` | getStep | Step | id, lesson_id, title, position, status, created_at, updated_at |
| `GET /student-works/{id}` | getStudentWork | StudentWork | id, student_id, step_id, status, work_type, current_attempt, created_at, updated_at |
| `GET /reviews/{id}` | getReview | Review | id, student_work_id, reviewer_id, verdict, review_round, created_at |
| `GET /student-progresses/{id}` | getStudentProgress | StudentProgress | id, student_id, course_id, created_at, updated_at |

**Схемы (9 шт: 8 сущностей + Error):**
- Все nullable-поля из БД: в схемах `nullable: true`
- Enum-поля: повторяют CHECK IN из БД
- `deadline_type` у Lesson: enum (soft, hard), nullable
- `step_type` у Step: enum (checklist, illustration, video, student_work, quiz), nullable
- `work_type` у StudentWork: enum (coding, interactive)
- Все статусы: enum

**Чего нет в API:**
- Нет endpoint'а для `course_group_access` (составной PK)
- Нет list-эндпоинтов (`GET /users`, `GET /courses` и т.д.)
- Нет mutation-эндпоинтов (POST, PUT, PATCH, DELETE)
- Нет пагинации, фильтрации, сортировки
- Нет query-параметров (все endpoint'ы только по path-{id})
- Только 2 response-кода: 200, 404

## Несостыковки

| # | Несостыковка | Концепт | БД | API | Серьёзность |
|---|-------------|---------|----|-----|-------------|
| 1 | **`reviewer_comment` в `student_works`** — нет упоминания в карточке «Работа ученика». Комментарий — атрибут ревью, не работы | не описан | есть поле | есть поле | **высокая** — денормализация без обоснования |
| 2 | **Категория «Шаг пройден» (`step_completion`) в `student_progress.md`** не имеет таблицы | описана (категория) | нет таблицы | нет endpoint'а | **высокая** — висящая категория |
| 3 | **Категория «Работа-тест»** в `student_work.md` — нет `work_type = 'test'` | описана | нет в enum | нет в enum | **средняя** — неясно, тест = квиз или отдельный тип работы |
| 4 | **Категории «Урок с ревью» / «Урок без ревью»** — нет поля `has_review` у `lessons` | описаны | нет поля | нет поля | **средняя** — требуется косвенный вывод через шаги→работы→ревью |
| 5 | **`course_group_access`** — таблица есть, концепт «Курс с группами» описан, но API не отдаёт эту связь | описан (категория) | есть таблица | **нет** endpoint'а и схемы | **средняя** — неполнота API |
| 6 | **`max_attempts` / `current_attempt`** — категория «Работа с попытками» упоминает пересдачу, но поля не специфицированы | не специфицированы | есть поля | есть поля | **низкая** — техническая детализация |
| 7 | **`description` у `courses`** — нет атрибута в карточке «Курс» | не описан | есть поле (nullable) | есть поле (nullable) | **низкая** — недокументированное поле |
| 8 | **`users.name` — всего одно поле «Имя»** — в концепте «Пользователь» нет спецификации атрибутов. ФИО помечено out_of_scope, но `name` есть | гранично out_of_scope | есть поле | есть поле | **низкая** — возможно, `name` — это nickname/username, а не ФИО |
| 9 | **Статус `overdue` у `student_works`** — в БД это полноценный статус. В концепте «Просроченная работа» — категория, не статус. Различие: просроченная = не отправлена в срок (`submitted_at IS NULL`), а не произвольный статус. Но БД позволяет поставить `overdue` вручную | категория (выводимый статус) | enum-статус | enum-статус | **низкая** — логическое расхождение моделирования |

## Рекомендованные правки

| # | Правка | Где менять | Затрагивает |
|---|--------|-----------|-------------|
| 1 | **Убрать `reviewer_comment` из `student_works`** | schema.md, openapi.yaml | БД, API |
| 2 | **Решить судьбу `step_completions`**: либо удалить категорию «Шаг пройден» из `student_progress.md`, либо добавить таблицу и endpoint | student_progress.md, schema.md, openapi.yaml | Концепт, БД, API |
| 3 | **Добавить в `student_work.md` описание полей `work_type`, `max_attempts`, `current_attempt`** или явно пометить как технические атрибуты вне модели ценности | student_work.md | Концепт |
| 4 | **Добавить endpoint для `course_group_access`** (хотя бы query-параметр) или явно задокументировать internal-статус | openapi.yaml | API |
| 5 | **Добавить `description` в концепт «Курс»** как опциональный атрибут или out_of_scope | course.md | Концепт |

## Открытые вопросы

1. **`step_completions`: нужна ли таблица?** Категория «Шаг пройден» есть, таблицы нет. Если прогресс по шагам не хранится — как клиент понимает, какие шаги пройдены? Или это фиксируется через `student_works` (только для шагов с работами), а остальные шаги считаются пройденными автоматически при открытии?

2. **Есть ли семантическая разница между `overdue` и `draft` при дедлайне?** В БД `overdue` — отдельный статус, но концепт описывает просроченную работу как «не отправлена до дедлайна». Может ли работа быть `overdue` и при этом иметь `submitted_at`? Constraint разрешает только `draft` без `submitted_at` — значит `overdue` не может быть с `submitted_at`. Тогда `overdue` = просроченный черновик. Не избыточен ли этот статус относительно `draft` + проверки дедлайна?

3. **Работа-тест — это шаг-квиз или отдельный `work_type`?** В концепте есть категория «Работа-тест», но `work_type` enum её не содержит. Если тест = квиз (шаг, а не работа), категория в «Работе ученика» вводит в заблуждение. Если тест ≠ квиз — не хватает `work_type: 'test'` в БД и API.
