# Вложенность концептов PracticeLab

| Концепт | Где живёт | Вложен у родителя | Статус |
|---------|-----------|-------------------|--------|
| platform | — | корневой | OK |
| user | Платформа PracticeLab | platform → +Пользователь | OK |
| course | Платформа PracticeLab | platform → +Курс | OK |
| group | Платформа PracticeLab | platform → +Группа | OK |
| student_progress | Платформа PracticeLab | platform → +Прогресс ученика | OK |
| lesson | Курс | course → +Урок | OK |
| step | Урок | lesson → +Шаг | OK |
| student_work | Шаг | step → +Работа ученика | OK |
| review | Работа ученика | student_work → +Ревью | OK |
