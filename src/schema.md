# Contract Pack — PracticeLab Database Schema

## Соглашения

- `id` — UUID v4, тип `UUID`, PK.
- `created_at`, `updated_at` — `TIMESTAMP WITH TIME ZONE`, NOT NULL.
- Все внешние ключи — `UUID`, NOT NULL, с `ON DELETE CASCADE` (если не указано иное).

---

## Таблицы

### 1. `users`

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| id | UUID | PK | |
| role | VARCHAR(50) | NOT NULL, CHECK IN ('student', 'teacher', 'admin') | Роль пользователя |
| name | VARCHAR(255) | NOT NULL | Имя |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 2. `courses`

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| id | UUID | PK | |
| author_id | UUID | FK → users.id, NOT NULL | Автор курса |
| title | VARCHAR(255) | NOT NULL | Название |
| description | TEXT | NULL | Описание |
| status | VARCHAR(50) | NOT NULL, CHECK IN ('draft', 'published') | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Индексы:**
- `idx_courses_author_id` ON (author_id)
- `idx_courses_status` ON (status)

### 3. `groups`

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| id | UUID | PK | |
| name | VARCHAR(200) | NOT NULL | Название группы, напр. «9А» |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 4. `course_group_access`

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| course_id | UUID | PK, FK → courses.id | |
| group_id | UUID | PK, FK → groups.id | |

### 5. `lessons`

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| id | UUID | PK | |
| course_id | UUID | FK → courses.id, NOT NULL | |
| title | VARCHAR(255) | NOT NULL | |
| position | INTEGER | NOT NULL, CHECK (> 0) | Порядковый номер в курсе |
| status | VARCHAR(50) | NOT NULL, CHECK IN ('draft', 'published') | |
| is_optional | BOOLEAN | NOT NULL DEFAULT FALSE | Необязательный урок |
| deadline | TIMESTAMPTZ | NULL | Дедлайн (значение по умолчанию) |
| deadline_type | VARCHAR(20) | NULL, CHECK IN ('soft', 'hard') | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Индексы:**
- `idx_lessons_course_id` ON (course_id)
- `idx_lessons_course_position` ON (course_id, position) UNIQUE

### 6. `steps`

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| id | UUID | PK | |
| lesson_id | UUID | FK → lessons.id, NOT NULL | |
| title | VARCHAR(255) | NOT NULL | |
| position | INTEGER | NOT NULL, CHECK (> 0) | Порядковый номер в уроке |
| step_type | VARCHAR(50) | NULL, CHECK IN ('checklist', 'illustration', 'video', 'student_work', 'quiz') | Тип шага |
| content | TEXT | NULL | Содержимое (зависит от типа) |
| status | VARCHAR(50) | NOT NULL, CHECK IN ('draft', 'published') | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Индексы:**
- `idx_steps_lesson_id` ON (lesson_id)
- `idx_steps_lesson_position` ON (lesson_id, position) UNIQUE

### 7. `student_works`

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| id | UUID | PK | |
| student_id | UUID | FK → users.id, NOT NULL | |
| step_id | UUID | FK → steps.id, NOT NULL | Шаг, на котором создана работа |
| status | VARCHAR(50) | NOT NULL, CHECK IN ('draft', 'submitted', 'approved', 'changes_requested', 'overdue') | Жизненный цикл |
| work_type | VARCHAR(50) | NOT NULL, CHECK IN ('coding', 'interactive') | Тип работы |
| max_attempts | INTEGER | NULL | Максимальное число попыток (для работ с попытками) |
| current_attempt | INTEGER | NOT NULL DEFAULT 1 | Текущая попытка |
| content | TEXT | NULL | Ссылка, код, текст ответа |
| reviewer_comment | TEXT | NULL | Комментарий преподавателя |
| submitted_at | TIMESTAMPTZ | NULL | Дата отправки на ревью |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Индексы:**
- `idx_student_works_student_id` ON (student_id)
- `idx_student_works_step_id` ON (step_id)
- `idx_student_works_status` ON (status)

**Constraints:**
- `CHECK (submitted_at IS NOT NULL OR status = 'draft')` — только черновик без даты отправки.
- `CHECK (current_attempt >= 1 AND (max_attempts IS NULL OR current_attempt <= max_attempts))`

### 8. `reviews`

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| id | UUID | PK | |
| student_work_id | UUID | FK → student_works.id, NOT NULL | |
| reviewer_id | UUID | FK → users.id, NOT NULL | |
| verdict | VARCHAR(50) | NOT NULL, CHECK IN ('approved', 'changes_requested') | |
| comment | TEXT | NULL | |
| review_round | INTEGER | NOT NULL, CHECK (> 0) | 1 — первичное, 2+ — повторное |
| created_at | TIMESTAMPTZ | NOT NULL | |

**Индексы:**
- `idx_reviews_student_work_id` ON (student_work_id)
- `idx_reviews_work_round` ON (student_work_id, review_round) UNIQUE

### 9. `student_progresses`

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| id | UUID | PK | |
| student_id | UUID | FK → users.id, NOT NULL | |
| course_id | UUID | FK → courses.id, NOT NULL | |
| current_lesson_id | UUID | FK → lessons.id, NULL | Текущий урок (NULL если курс завершён) |
| completed_at | TIMESTAMPTZ | NULL | Дата завершения курса |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Индексы:**
- `idx_student_progresses_student_course` ON (student_id, course_id) UNIQUE

---

## Связи (ER-сводка)

```
users 1──N courses              (author)
users 1──N student_works        (student)
users 1──N reviews              (reviewer)
users 1──N student_progresses   (student)

courses 1──N lessons
courses 1──N course_group_access N──N groups

lessons 1──N steps
lessons >──N student_works      (через шаг: урок → шаг → работа)

steps 1──N student_works

student_works 1──N reviews
```

---

## Примеры данных

### users

**Типичный — ученик:**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "role": "student",
  "name": "Иван Петров"
}
```

**Крайний — преподаватель:**
```json
{
  "id": "a1b2c3d4-0101-0202-0303-040506070809",
  "role": "teacher",
  "name": "Мария Иванова"
}
```

### courses

**Типичный — опубликованный курс:**
```json
{
  "id": "b1c2d3e4-1234-5678-9abc-def012345678",
  "author_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "title": "Python-разработчик",
  "description": "Полный курс по Python с нуля до продвинутого уровня",
  "status": "published"
}
```

**Крайний — черновик:**
```json
{
  "id": "c2d3e4f5-2345-6789-abcd-ef0123456789",
  "author_id": "a1b2c3d4-0101-0202-0303-040506070809",
  "title": "Новый курс по SQL",
  "description": null,
  "status": "draft"
}
```

### groups

**Типичная группа:**
```json
{
  "id": "d0e1f2a3-0010-4000-8000-000000000010",
  "name": "9А"
}
```

### course_group_access

**Типичная запись:**
```json
{
  "course_id": "b1c2d3e4-1234-5678-9abc-def012345678",
  "group_id": "d0e1f2a3-0010-4000-8000-000000000010"
}
```

### lessons

**Типичный — опубликованный урок:**
```json
{
  "id": "d3e4f5a6-3456-789a-bcde-f01234567890",
  "course_id": "b1c2d3e4-1234-5678-9abc-def012345678",
  "title": "Основы HTTP",
  "position": 2,
  "status": "published",
  "is_optional": false
}
```

**Крайний — необязательный урок с дедлайном:**
```json
{
  "id": "e4f5a6b7-4567-89ab-cdef-012345678901",
  "course_id": "b1c2d3e4-1234-5678-9abc-def012345678",
  "title": "Дополнительно: продвинутые паттерны",
  "position": 11,
  "is_optional": true,
  "status": "published",
  "deadline": "2026-06-01T23:59:00Z",
  "deadline_type": "soft"
}
```

### steps

**Типичный — шаг с работой ученика:**
```json
{
  "id": "f5a6b7c8-5678-9abc-def0-123456789012",
  "lesson_id": "d3e4f5a6-3456-789a-bcde-f01234567890",
  "title": "Напиши функцию сортировки",
  "position": 3,
  "step_type": "student_work",
  "status": "published"
}
```

**Крайний — черновик шага:**
```json
{
  "id": "a6b7c8d9-6789-abcd-ef01-234567890123",
  "lesson_id": "d3e4f5a6-3456-789a-bcde-f01234567890",
  "title": "Проверь себя: тест по циклу for",
  "position": 4,
  "step_type": "quiz",
  "status": "draft"
}
```

### student_works

**Типичная — работа на ревью:**
```json
{
  "id": "b7c8d9e0-789a-bcde-f012-345678901234",
  "student_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "step_id": "f5a6b7c8-5678-9abc-def0-123456789012",
  "status": "submitted",
  "work_type": "coding",
  "content": "https://github.com/ivanpetrov/sorting",
  "submitted_at": "2026-05-10T14:30:00Z"
}
```

**Крайний — просроченная работа (не отправлена до дедлайна):**
```json
{
  "id": "c8d9e0f1-89ab-cdef-0123-456789012345",
  "student_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "step_id": "f5a6b7c8-5678-9abc-def0-123456789012",
  "status": "overdue",
  "work_type": "coding",
  "current_attempt": 1,
  "content": null,
  "submitted_at": null
}
```

### reviews

**Типичное — первичное ревью:**
```json
{
  "id": "d9e0f1a2-9abc-def0-1234-567890123456",
  "student_work_id": "b7c8d9e0-789a-bcde-f012-345678901234",
  "reviewer_id": "a1b2c3d4-0101-0202-0303-040506070809",
  "verdict": "changes_requested",
  "comment": "Поправь обработку краевых случаев",
  "review_round": 1
}
```

**Крайний — повторное ревью (принято):**
```json
{
  "id": "e0f1a2b3-0abc-def0-1234-567890123457",
  "student_work_id": "b7c8d9e0-789a-bcde-f012-345678901234",
  "reviewer_id": "a1b2c3d4-0101-0202-0303-040506070809",
  "verdict": "approved",
  "comment": "Замечания исправлены",
  "review_round": 2
}
```

### student_progresses

**Типичный — ученик в процессе:**
```json
{
  "id": "f0a1b2c3-0abc-def0-1234-567890123458",
  "student_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "course_id": "b1c2d3e4-1234-5678-9abc-def012345678",
  "current_lesson_id": "d3e4f5a6-3456-789a-bcde-f01234567890",
  "completed_at": null
}
```

**Крайний — курс завершён:**
```json
{
  "id": "a1b2c3d4-0abc-def0-1234-567890123459",
  "student_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "course_id": "b1c2d3e4-1234-5678-9abc-def012345678",
  "current_lesson_id": null,
  "completed_at": "2026-05-20T10:00:00Z"
}
```
