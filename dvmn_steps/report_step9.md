# Отчёт о сверке: Концепты → Контракт-пак (schema.md + openapi.yaml)

## Ключевые решения AI-агента

| # | Решение | Обоснование |
|---|---------|-------------|
| 1 | Роли пользователей: `student`, `teacher`, `admin` | Категории концепта «Пользователь»: Ученик, Преподаватель, Администратор. «Автор курса» — не роль, а категория, выражена через FK `courses.author_id` |
| 2 | Статусы курса/урока/шага: `draft`, `published` | Категории «Черновик курса/урока/шага» и «Опубликованный курс» из концептов |
| 3 | Дедлайн урока: `deadline` (TIMESTAMPTZ) + `deadline_type` (soft/hard) | Категория «Урок с дедлайном» из концепта «Урок» |
| 4 | Типы шагов: `checklist`, `illustration`, `video`, `student_work`, `quiz` | Категории концепта «Шаг»: чеклист, иллюстрация, видео, работа ученика, квиз. «Черновик шага» вынесен в статус, а не тип |
| 5 | Работа ученика привязана к Шагу, а не к Уроку напрямую | Концепт «Работа ученика» вложен в Урок, но в БД — FK `student_works.step_id → steps.id`, урок → шаг → работа (косвенная связь) |
| 6 | Статусный автомат работы: `draft→submitted→approved/changes_requested`, плюс `overdue` | Категории концепта «Работа ученика»: черновик, на ревью, проверенная, принятая, на доработке, просроченная |
| 7 | `work_type`: `coding`, `interactive` — тест (`quiz`) не порождает `student_work` | Категории «Работа на кодирование», «Работа с интерактивным заданием», «Работа-тест» в концепте. Квиз — это тип шага, не работы |
| 8 | Ревью: `review_round` (INTEGER, 1+), UNIQUE(student_work_id, review_round) | Категории «Первичное ревью» и «Повторное ревью» из концепта «Ревью» |
| 9 | Прогресс ученика: `current_lesson_id` nullable, `completed_at` nullable | Категории: «Курс начат», «Курс в процессе», «Курс завершён». NULL в `current_lesson_id` = курс завершён |
| 10 | Связь курс-группа через M:N таблицу `course_group_access` | Категория «Курс с группами» из концепта «Курс» |

## Как это выражено в БД (schema.md)

**9 таблиц**:

| Таблица | Концепт | Ключевые поля |
|---------|---------|---------------|
| `users` | Пользователь | role (enum: student/teacher/admin), name |
| `courses` | Курс | author_id → users, title, description, status (draft/published) |
| `groups` | Группа | name |
| `course_group_access` | (связь Курс↔Группа) | course_id + group_id (составной PK) |
| `lessons` | Урок | course_id → courses, position, status, is_optional, deadline, deadline_type |
| `steps` | Шаг | lesson_id → lessons, position, step_type (checklist/illustration/video/student_work/quiz), content, status |
| `student_works` | Работа ученика | student_id → users, step_id → steps, status (draft/submitted/approved/changes_requested/overdue), work_type (coding/interactive), max_attempts, current_attempt, content, reviewer_comment, submitted_at |
| `reviews` | Ревью | student_work_id → student_works, reviewer_id → users, verdict (approved/changes_requested), comment, review_round |
| `student_progresses` | Прогресс ученика | student_id → users, course_id → courses, current_lesson_id → lessons (nullable), completed_at (nullable) |

**Соглашения:**
- Все `id` — UUID v4
- У всех таблиц: `created_at`, `updated_at` TIMESTAMPTZ
- FK с `ON DELETE CASCADE`
- Индексы: `idx_courses_author_id`, `idx_courses_status`, `idx_lessons_course_id`, `idx_lessons_course_position` (UNIQUE), `idx_steps_lesson_id`, `idx_steps_lesson_position` (UNIQUE), `idx_student_works_student_id`, `idx_student_works_step_id`, `idx_student_works_status`, `idx_reviews_student_work_id`, `idx_reviews_work_round` (UNIQUE), `idx_student_progresses_student_course` (UNIQUE)
- Constraints: `student_works` CHECK (submitted_at IS NOT NULL OR status = 'draft'), CHECK (current_attempt >= 1 AND current_attempt <= max_attempts OR max_attempts IS NULL)

## Как это выражено в API (openapi.yaml)

**8 GET instance endpoint'ов** — по одному на каждую таблицу с PK-`id`:

| Endpoint | Операция | Схема ответа |
|----------|----------|-------------|
| `GET /users/{id}` | getUser | User |
| `GET /courses/{id}` | getCourse | Course |
| `GET /lessons/{id}` | getLesson | Lesson |
| `GET /steps/{id}` | getStep | Step |
| `GET /student-works/{id}` | getStudentWork | StudentWork |
| `GET /reviews/{id}` | getReview | Review |
| `GET /student-progresses/{id}` | getStudentProgress | StudentProgress |
| `GET /groups/{id}` | getGroup | Group |

**Схемы (components/schemas)** — 9 схем (включая Error):

Все схемы повторяют структуру таблиц 1:1, за исключением:
- `course_group_access` — **не имеет** endpoint'а и схемы (составной PK, нет instance-ресурса)
- Все поля `description`, `content`, `reviewer_comment` — nullable: true
- В схеме `Lesson` поле `description` отсутствует (в таблице тоже нет)
- В схеме `Step` поле `content` nullable, `step_type` nullable

**Статус-коды:** только 200 (успех) и 404 (не найден). Нет:
- list-эндпоинтов (GET /users, GET /courses и т.д.)
- mutation-эндпоинтов (POST, PUT, DELETE, PATCH)
- пагинации, фильтрации, сортировки

## Несостыковки

1. **`reviewer_comment` в `student_works` дублирует `comment` в `reviews`** — в концепте «Работа ученика» нет упоминания комментария преподавателя в структуре работы; комментарий — атрибут ревью. Поле есть и в schema.md, и в openapi.yaml.

2. **В карточке «Работа ученика» есть категория «Работа-тест»**, но `work_type` enum содержит только `coding` и `interactive`. Квиз не порождает `student_work`, но категория «Работа-тест» подразумевает автоматическую проверку — в БД нет соответствующего `work_type`.

3. **Концепт «Прогресс ученика» включает категорию «Шаг пройден»** (`step_completion`), но в БД нет таблицы `step_completions` и в API нет соответствующего endpoint'а. Категория описана, но не реализована.

4. **`course_group_access` не имеет endpoint'а и схемы в API** — таблица есть в БД, концепт «Курс с группами» описан, но API не предоставляет доступа к этой связи.

5. **В карточке «Урок» есть категория «Урок с ревью» и «Урок без ревью»**, но в БД нет поля `has_review` у `lessons`. Наличие ревью выводится косвенно через шаги → работы → ревью. API не позволяет определить, предусмотрено ли ревью для урока, не заходя в дочерние сущности.

6. **Поле `max_attempts` и `current_attempt` в `student_works` не описаны в карточках** — категория «Работа с попытками» упоминает пересдачу, но не специфицирует эти поля как атрибуты. Поля присутствуют и в schema.md, и в openapi.yaml.

7. **`description` у `courses` — nullable**, что соответствует «Черновику курса» (description: null в примере). Но в концепте «Курс» описание не упоминается вовсе — ни как обязательный, ни как опциональный атрибут.

## Рекомендованные правки

1. **Убрать `reviewer_comment` из `student_works`** (и из schema.md, и из openapi.yaml) — дублирует `reviews.comment`, не описан в карточке «Работа ученика».

2. **Добавить в карточку «Работа ученика» явное описание полей `work_type`, `max_attempts`, `current_attempt`** либо зафиксировать их как технические атрибуты вне модели ценности.

3. **Ликвидировать расхождение по «Шаг пройден»**: либо добавить таблицу `step_completions` в schema.md (и endpoint в API), либо удалить категорию из карточки «Прогресс ученика».

4. **Добавить endpoint `GET /course-group-access?course_id=...`** или явно задокументировать в openapi.yaml, что `course_group_access` — внутренняя таблица без публичного API.

5. **Добавить в концепт «Курс» атрибут `description`** или явно пометить как out_of_scope.

## Открытые вопросы

1. **Нужна ли таблица `step_completions`?** Категория «Шаг пройден» в концепте «Прогресс ученика» предполагает её существование, но её нет ни в БД, ни в API. Это intentional design decision или недочёт?

2. **Как клиент узнаёт, есть ли у урока ревью?** Сейчас — только через обход шагов → работ → ревью. Нужен ли endpoint `GET /lessons/{id}/has-review` или поле в схеме Lesson?

3. **Должна ли быть поддержка `work_type = 'test'`?** Категория «Работа-тест» описана в концепте, но не имеет отражения в enum. Если тестовая работа = шаг-квиз (без student_work), то категория избыточна. Если тестовая работа ≠ квиз, то не хватает значения в enum.
