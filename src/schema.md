# Схема БД — PracticeLab

## Соглашения

- `id` — UUID v4, тип `CHAR(36)` или эквивалент, PK.
- `created_at`, `updated_at` — `TIMESTAMP WITH TIME ZONE`, NOT NULL.
- Все внешние ключи — `UUID`, NOT NULL, с `ON DELETE CASCADE` (если не указано иное).

---

## Таблицы

### 1. `platforms`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| id | UUID | PK | Идентификатор платформы |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Название платформы |
| site_url | VARCHAR(500) | NOT NULL | URL сайта платформы |
| created_at | TIMESTAMPTZ | NOT NULL | Дата создания записи |
| updated_at | TIMESTAMPTZ | NOT NULL | Дата обновления записи |

### 2. `courses`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| id | UUID | PK | Идентификатор курса |
| platform_id | UUID | FK → platforms.id, NOT NULL | Платформа, на которой расположен курс |
| title | VARCHAR(300) | NOT NULL | Название курса |
| status | VARCHAR(50) | NOT NULL, CHECK IN ('draft', 'published', 'archived') | Статус: черновик / опубликован / архив |
| is_group_course | BOOLEAN | NOT NULL DEFAULT FALSE | Курс с группами (доступ по группам учеников) |
| created_at | TIMESTAMPTZ | NOT NULL | Дата создания записи |
| updated_at | TIMESTAMPTZ | NOT NULL | Дата обновления записи |

**Индексы:**
- `idx_courses_platform_id` ON (platform_id)
- `idx_courses_status` ON (status)

### 3. `lessons`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| id | UUID | PK | Идентификатор урока |
| course_id | UUID | FK → courses.id, NOT NULL | Курс, в который входит урок |
| title | VARCHAR(300) | NOT NULL | Название урока |
| ordinal_number | INTEGER | NOT NULL, CHECK (> 0) | Порядковый номер в курсе |
| status | VARCHAR(50) | NOT NULL, CHECK IN ('draft', 'published') | Статус: черновик / опубликован |
| has_review | BOOLEAN | NOT NULL DEFAULT FALSE | Урок с ревью |
| deadline | TIMESTAMPTZ | NULL | Дедлайн урока (если установлен) |
| deadline_type | VARCHAR(20) | NULL, CHECK IN ('soft', 'hard') | Тип дедлайна |
| is_first | BOOLEAN | NOT NULL DEFAULT FALSE | Первый урок в курсе |
| is_last | BOOLEAN | NOT NULL DEFAULT FALSE | Последний урок в курсе |
| created_at | TIMESTAMPTZ | NOT NULL | Дата создания записи |
| updated_at | TIMESTAMPTZ | NOT NULL | Дата обновления записи |

**Индексы:**
- `idx_lessons_course_id` ON (course_id)
- `idx_lessons_course_ordinal` ON (course_id, ordinal_number) UNIQUE
- `idx_lessons_status` ON (status)

### 4. `steps`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| id | UUID | PK | Идентификатор шага |
| lesson_id | UUID | FK → lessons.id, NOT NULL | Урок, в который входит шаг |
| type | VARCHAR(50) | NOT NULL, CHECK IN ('text', 'video', 'checklist', 'illustration', 'student_work', 'quiz') | Тип шага |
| ordinal_number | INTEGER | NOT NULL, CHECK (> 0) | Порядковый номер в уроке |
| content | TEXT | NOT NULL | Содержимое шага (JSON в зависимости от типа) |
| status | VARCHAR(50) | NOT NULL, CHECK IN ('draft', 'published') | Статус шага |
| created_at | TIMESTAMPTZ | NOT NULL | Дата создания записи |
| updated_at | TIMESTAMPTZ | NOT NULL | Дата обновления записи |

**Индексы:**
- `idx_steps_lesson_id` ON (lesson_id)
- `idx_steps_lesson_ordinal` ON (lesson_id, ordinal_number) UNIQUE

### 5. `student_works`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| id | UUID | PK | Идентификатор работы |
| lesson_id | UUID | FK → lessons.id, NOT NULL | Урок, в рамках которого сдана работа |
| student_id | UUID | NOT NULL | Идентификатор ученика (внешняя система) |
| status | VARCHAR(50) | NOT NULL, CHECK IN ('draft', 'on_review', 'on_revision', 'accepted', 'overdue') | Текущий статус работы |
| submitted_at | TIMESTAMPTZ | NULL | Дата отправки на ревью |
| reviewed_at | TIMESTAMPTZ | NULL | Дата проверки преподавателем |
| deadline | TIMESTAMPTZ | NULL | Дедлайн на момент отправки (снимок из урока) |
| content | JSONB | NOT NULL DEFAULT '{}' | Содержимое работы: ссылки, файлы, код |
| reviewer_comment | TEXT | NULL | Комментарий преподавателя |
| auto_checked | BOOLEAN | NOT NULL DEFAULT FALSE | Признак автоматической проверки |
| created_at | TIMESTAMPTZ | NOT NULL | Дата создания записи |
| updated_at | TIMESTAMPTZ | NOT NULL | Дата обновления записи |

**Индексы:**
- `idx_student_works_lesson_student` ON (lesson_id, student_id)
- `idx_student_works_status` ON (status)
- `idx_student_works_student_id` ON (student_id)

**Constraints:**
- `CHECK (submitted_at IS NOT NULL OR status = 'draft')` — только черновик может быть без submitted_at.
- `CHECK (status != 'draft' OR submitted_at IS NULL)` — черновик не должен иметь даты отправки.

### 6. `student_progresses`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| id | UUID | PK | Идентификатор записи прогресса |
| student_id | UUID | NOT NULL | Идентификатор ученика |
| course_id | UUID | FK → courses.id, NOT NULL | Курс |
| lesson_id | UUID | FK → lessons.id, NULL | Текущий урок (может быть NULL, если ещё не начал) |
| is_completed | BOOLEAN | NOT NULL DEFAULT FALSE | Курс завершён |
| started_at | TIMESTAMPTZ | NULL | Дата начала курса |
| completed_at | TIMESTAMPTZ | NULL | Дата завершения курса |
| created_at | TIMESTAMPTZ | NOT NULL | Дата создания записи |
| updated_at | TIMESTAMPTZ | NOT NULL | Дата обновления записи |

**Индексы:**
- `idx_student_progresses_student_course` ON (student_id, course_id) UNIQUE

### 7. `groups`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| id | UUID | PK | Идентификатор группы |
| course_id | UUID | FK → courses.id, NOT NULL, ON DELETE CASCADE | Курс, к которому привязана группа |
| name | VARCHAR(200) | NOT NULL | Название группы (например, «9А») |
| created_at | TIMESTAMPTZ | NOT NULL | Дата создания записи |
| updated_at | TIMESTAMPTZ | NOT NULL | Дата обновления записи |

**Индексы:**
- `idx_groups_course_id` ON (course_id)

### 8. `group_memberships`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| id | UUID | PK | Идентификатор членства |
| group_id | UUID | FK → groups.id, NOT NULL, ON DELETE CASCADE | Группа |
| student_id | UUID | NOT NULL | Ученик |
| created_at | TIMESTAMPTZ | NOT NULL | Дата добавления |

**Индексы:**
- `idx_group_memberships_group_student` ON (group_id, student_id) UNIQUE
- `idx_group_memberships_student_id` ON (student_id)

---

## Связи (ER-сводка)

```
platforms 1──N courses
courses   1──N lessons
courses   1──N groups
groups    1──N group_memberships
lessons   1──N steps
lessons   1──N student_works
courses   1──1 student_progresses  (per student)
lessons   1──1 student_progresses  (current lesson, nullable)
```

---

## Примеры данных

### platforms

**Обычный случай:**
```json
{
  "id": "a1b2c3d4-0001-4000-8000-000000000001",
  "name": "PracticeLab",
  "site_url": "https://dvmn.org",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### courses

**Обычный случай (опубликованный курс):**
```json
{
  "id": "b2c3d4e5-0002-4000-8000-000000000002",
  "platform_id": "a1b2c3d4-0001-4000-8000-000000000001",
  "title": "Python",
  "status": "published",
  "is_group_course": false,
  "created_at": "2025-02-01T00:00:00Z",
  "updated_at": "2025-02-10T00:00:00Z"
}
```

**Крайний случай (черновик курса):**
```json
{
  "id": "c3d4e5f6-0003-4000-8000-000000000003",
  "platform_id": "a1b2c3d4-0001-4000-8000-000000000001",
  "title": "Новый курс в разработке",
  "status": "draft",
  "is_group_course": false,
  "created_at": "2025-03-01T00:00:00Z",
  "updated_at": "2025-03-01T00:00:00Z"
}
```

### lessons

**Обычный случай (урок с дедлайном и ревью):**
```json
{
  "id": "d4e5f6a7-0004-4000-8000-000000000004",
  "course_id": "b2c3d4e5-0002-4000-8000-000000000002",
  "title": "HTTP",
  "ordinal_number": 1,
  "status": "published",
  "has_review": true,
  "deadline": "2025-03-15T23:59:00Z",
  "deadline_type": "hard",
  "is_first": true,
  "is_last": false,
  "created_at": "2025-02-05T00:00:00Z",
  "updated_at": "2025-02-15T00:00:00Z"
}
```

**Крайний случай (урок-черновик, без дедлайна, без ревью):**
```json
{
  "id": "e5f6a7b8-0005-4000-8000-000000000005",
  "course_id": "b2c3d4e5-0002-4000-8000-000000000002",
  "title": "Черновик урока",
  "ordinal_number": 5,
  "status": "draft",
  "has_review": false,
  "deadline": null,
  "deadline_type": null,
  "is_first": false,
  "is_last": false,
  "created_at": "2025-03-10T00:00:00Z",
  "updated_at": "2025-03-10T00:00:00Z"
}
```

### steps

**Обычный случай (шаг с работой ученика):**
```json
{
  "id": "f6a7b8c9-0006-4000-8000-000000000006",
  "lesson_id": "d4e5f6a7-0004-4000-8000-000000000004",
  "type": "student_work",
  "ordinal_number": 3,
  "content": "{\"prompt\": \"Напиши функцию сортировки и отправь на проверку\"}",
  "status": "published",
  "created_at": "2025-02-06T00:00:00Z",
  "updated_at": "2025-02-06T00:00:00Z"
}
```

**Крайний случай (черновик шага внутри опубликованного урока):**
```json
{
  "id": "a7b8c9d0-0007-4000-8000-000000000007",
  "lesson_id": "d4e5f6a7-0004-4000-8000-000000000004",
  "type": "video",
  "ordinal_number": 4,
  "content": "{\"video_url\": \"https://example.com/lecture.mp4\"}",
  "status": "draft",
  "created_at": "2025-02-07T00:00:00Z",
  "updated_at": "2025-02-07T00:00:00Z"
}
```

### student_works

**Обычный случай (работа на ревью):**
```json
{
  "id": "b8c9d0e1-0008-4000-8000-000000000008",
  "lesson_id": "d4e5f6a7-0004-4000-8000-000000000004",
  "student_id": "u001-0000-0000-0000-000000000001",
  "status": "on_review",
  "submitted_at": "2025-03-14T12:00:00Z",
  "reviewed_at": null,
  "deadline": "2025-03-15T23:59:00Z",
  "content": "{\"code\": \"def sort(arr): return sorted(arr)\"}",
  "reviewer_comment": null,
  "auto_checked": false,
  "created_at": "2025-03-14T11:00:00Z",
  "updated_at": "2025-03-14T12:00:00Z"
}
```

**Крайний случай (ученик не сдал работу — записи о работе нет):**

Для урока с дедлайном, если ученик не сдал работу, запись в `student_works` отсутствует. Статус просрочки фиксируется по правилу: `deadline < NOW()` и отсутствие `student_works` для пары (lesson_id, student_id).

Пример запроса для выявления просрочек:
```sql
SELECT l.id AS lesson_id, sp.student_id
FROM lessons l
JOIN student_progresses sp ON sp.course_id = l.course_id
WHERE l.deadline < NOW()
  AND l.status = 'published'
  AND NOT EXISTS (
    SELECT 1 FROM student_works sw
    WHERE sw.lesson_id = l.id AND sw.student_id = sp.student_id
  );
```

### student_progresses

**Обычный случай (ученик начал курс, на первом уроке):**
```json
{
  "id": "c9d0e1f2-0009-4000-8000-000000000009",
  "student_id": "u001-0000-0000-0000-000000000001",
  "course_id": "b2c3d4e5-0002-4000-8000-000000000002",
  "lesson_id": "d4e5f6a7-0004-4000-8000-000000000004",
  "is_completed": false,
  "started_at": "2025-03-01T10:00:00Z",
  "completed_at": null,
  "created_at": "2025-03-01T10:00:00Z",
  "updated_at": "2025-03-01T10:00:00Z"
}
```

**Крайний случай (ученик ещё не начинал курс — записи нет):**

Пока ученик не начал прохождение курса, запись в `student_progresses` отсутствует. Она создаётся в момент начала.

### groups

**Обычный случай:**
```json
{
  "id": "d0e1f2a3-0010-4000-8000-000000000010",
  "course_id": "b2c3d4e5-0002-4000-8000-000000000002",
  "name": "9А",
  "created_at": "2025-01-15T00:00:00Z",
  "updated_at": "2025-01-15T00:00:00Z"
}
```

### group_memberships

**Обычный случай:**
```json
{
  "id": "e1f2a3b4-0011-4000-8000-000000000011",
  "group_id": "d0e1f2a3-0010-4000-8000-000000000010",
  "student_id": "u001-0000-0000-0000-000000000001",
  "created_at": "2025-01-16T00:00:00Z"
}
```
