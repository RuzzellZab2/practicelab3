// «Мок-бэкенд»: все операции асинхронные, с задержкой и валидацией, мутируют объект db.

import { db } from './db.js';
import { uid, nowIso, delay } from './core.js';

function findCourse(id) { return db.courses.find((c) => c.id === id); }
function findLesson(id) { return db.lessons.find((l) => l.id === id); }

function publishedLessons(courseId) {
  return db.lessons
    .filter((l) => l.course_id === courseId && l.status === 'published')
    .sort((a, b) => a.position - b.position);
}

function publishedSteps(lessonId) {
  return db.steps
    .filter((s) => s.lesson_id === lessonId && s.status === 'published')
    .sort((a, b) => a.position - b.position);
}

function isStepDone(studentId, stepId) {
  return db.stepCompletions.some((c) => c.student_id === studentId && c.step_id === stepId);
}

function findWork(studentId, lessonId) {
  return db.works.find((w) => w.student_id === studentId && w.lesson_id === lessonId);
}

export function isLessonPassed(studentId, lessonId) {
  const lesson = findLesson(lessonId);
  if (!lesson) return false;
  const steps = publishedSteps(lessonId);
  const allStepsDone = steps.every((s) => isStepDone(studentId, s.id));
  if (lesson.has_work) {
    const w = findWork(studentId, lessonId);
    return allStepsDone && !!w && w.status === 'approved';
  }
  return allStepsDone;
}

function recalcProgress(studentId, courseId) {
  const lessons = publishedLessons(courseId);
  const firstNotPassed = lessons.find((l) => !isLessonPassed(studentId, l.id));
  const prog = db.progress.find((p) => p.student_id === studentId && p.course_id === courseId);
  if (!prog) return;
  if (firstNotPassed) {
    prog.current_lesson_id = firstNotPassed.id;
    prog.completed_at = null;
  } else {
    prog.current_lesson_id = null;
    prog.completed_at = nowIso();
  }
}

export const api = {
  async listPublishedCourses() {
    await delay(250);
    return db.courses.filter((c) => c.status === 'published').map((c) => ({ ...c }));
  },

  async getCourse(id) {
    await delay(150);
    const c = findCourse(id);
    if (!c) throw new Error('Курс не найден');
    return { ...c };
  },

  async getUser(id) {
    await delay(120);
    const u = db.users.find((x) => x.id === id);
    if (!u) throw new Error('Пользователь не найден');
    return { ...u };
  },

  lessonCount(courseId) {
    return db.lessons.filter((l) => l.course_id === courseId).length;
  },

  stepCount(lessonId) {
    return db.steps.filter((s) => s.lesson_id === lessonId).length;
  },

  async getPublishedLessons(courseId) {
    await delay(200);
    return publishedLessons(courseId).map((l) => ({ ...l }));
  },

  async getLessonsWithStatus(studentId, courseId) {
    await delay(200);
    let currentFound = false;
    return publishedLessons(courseId).map((l) => {
      const passed = isLessonPassed(studentId, l.id);
      let status;
      if (passed) status = 'passed';
      else if (!currentFound) { currentFound = true; status = 'current'; }
      else status = 'locked';
      return { lesson: { ...l }, status, passed };
    });
  },

  async getEnrolledCourseIds(studentId) {
    await delay(150);
    return db.enrollments.filter((e) => e.student_id === studentId).map((e) => e.course_id);
  },

  async enroll(studentId, courseId) {
    await delay(500);
    const c = findCourse(courseId);
    if (!c) throw new Error('Курс не найден');
    if (c.status !== 'published') throw new Error('Курс ещё не опубликован');
    if (db.enrollments.some((e) => e.student_id === studentId && e.course_id === courseId)) {
      throw new Error('Вы уже записаны на этот курс');
    }
    db.enrollments.push({ student_id: studentId, course_id: courseId });
    return { courseId };
  },

  async getLesson(id) {
    await delay(150);
    const l = findLesson(id);
    if (!l) throw new Error('Урок не найден');
    return { ...l };
  },

  async getSteps(lessonId) {
    await delay(200);
    return publishedSteps(lessonId).map((s) => ({ ...s }));
  },

  async getStepCompletions(studentId, lessonId) {
    await delay(150);
    return publishedSteps(lessonId)
      .filter((s) => isStepDone(studentId, s.id))
      .map((s) => s.id);
  },

  async completeStep(studentId, stepId) {
    await delay(400);
    const step = db.steps.find((s) => s.id === stepId);
    if (!step) throw new Error('Шаг не найден');
    if (isStepDone(studentId, stepId)) throw new Error('Шаг уже пройден');
    db.stepCompletions.push({ student_id: studentId, step_id: stepId });
    const lesson = findLesson(step.lesson_id);
    const passed = isLessonPassed(studentId, step.lesson_id);
    recalcProgress(studentId, lesson.course_id);
    return { lessonId: step.lesson_id, lessonPassed: passed };
  },

  async getWork(studentId, lessonId) {
    await delay(150);
    const w = findWork(studentId, lessonId);
    return w ? { ...w } : null;
  },

  async getLatestReview(workId) {
    await delay(120);
    const reviews = db.reviews
      .filter((r) => r.student_work_id === workId)
      .sort((a, b) => b.review_round - a.review_round);
    return reviews[0] ? { ...reviews[0] } : null;
  },

  async saveWorkDraft(studentId, lessonId, content) {
    await delay(400);
    const trimmed = (content || '').trim();
    if (!trimmed) throw new Error('Введите текст работы перед сохранением');
    const w = findWork(studentId, lessonId);
    if (!w) {
      const created = {
        id: uid('w'), student_id: studentId, lesson_id: lessonId,
        status: 'draft', work_type: 'coding', content: trimmed, submitted_at: null,
      };
      db.works.push(created);
      return { ...created };
    }
    if (w.status === 'approved') throw new Error('Принятую работу нельзя редактировать');
    if (w.status === 'submitted') throw new Error('Работа уже на ревью');
    w.content = trimmed;
    return { ...w };
  },

  async submitWork(studentId, lessonId) {
    await delay(500);
    const w = findWork(studentId, lessonId);
    if (!w || !(w.content || '').trim()) throw new Error('Сначала сохраните черновик работы');
    if (w.status === 'submitted') throw new Error('Работа уже отправлена на ревью');
    w.status = 'submitted';
    w.submitted_at = nowIso();
    return { ...w };
  },

  async listMyWorks(studentId) {
    await delay(250);
    return db.works
      .filter((w) => w.student_id === studentId)
      .map((w) => {
        const lesson = findLesson(w.lesson_id);
        const course = lesson ? findCourse(lesson.course_id) : null;
        const reviews = db.reviews
          .filter((r) => r.student_work_id === w.id)
          .sort((a, b) => (b.review_round || 0) - (a.review_round || 0));
        return {
          work: { ...w },
          lesson: lesson ? { ...lesson } : null,
          course: course ? { ...course } : null,
          latestReview: reviews[0] ? { ...reviews[0] } : null,
        };
      });
  },

  async listCoursesForAuthor(authorId) {
    await delay(250);
    return db.courses
      .filter((c) => c.author_id === authorId)
      .map((c) => {
        const link = db.courseReviewers.find((r) => r.course_id === c.id);
        const reviewer = link ? db.users.find((u) => u.id === link.reviewer_id) : null;
        return {
          course: { ...c },
          reviewer: reviewer ? { ...reviewer } : null,
          lessonCount: db.lessons.filter((l) => l.course_id === c.id).length,
        };
      });
  },

  async createCourse(authorId, title, description) {
    await delay(500);
    const t = (title || '').trim();
    if (!t) throw new Error('Введите название курса');
    const c = {
      id: uid('c'), author_id: authorId, title: t,
      description: (description || '').trim() || null, status: 'draft',
    };
    db.courses.push(c);
    return { ...c };
  },

  async getCourseLessons(courseId) {
    await delay(200);
    return db.lessons
      .filter((l) => l.course_id === courseId)
      .sort((a, b) => a.position - b.position)
      .map((l) => ({ ...l }));
  },

  async listReviewers() {
    await delay(200);
    return db.users.filter((u) => u.role === 'reviewer').map((u) => ({ ...u }));
  },

  async getCourseReviewer(courseId) {
    await delay(150);
    const link = db.courseReviewers.find((r) => r.course_id === courseId);
    if (!link) return null;
    const u = db.users.find((x) => x.id === link.reviewer_id);
    return u ? { ...u } : null;
  },

  async assignReviewer(courseId, reviewerId) {
    await delay(450);
    const c = findCourse(courseId);
    if (!c) throw new Error('Курс не найден');
    if (!reviewerId) throw new Error('Выберите проверяющего');
    const r = db.users.find((u) => u.id === reviewerId && u.role === 'reviewer');
    if (!r) throw new Error('Проверяющий не найден');
    const link = db.courseReviewers.find((x) => x.course_id === courseId);
    if (link) link.reviewer_id = reviewerId;
    else db.courseReviewers.push({ course_id: courseId, reviewer_id: reviewerId });
    return { ...r };
  },

  async publishCourse(courseId) {
    await delay(600);
    const c = findCourse(courseId);
    if (!c) throw new Error('Курс не найден');
    if (c.status === 'published') throw new Error('Курс уже опубликован');
    if (!db.lessons.some((l) => l.course_id === courseId)) {
      throw new Error('Курс не готов: добавьте хотя бы один урок');
    }
    if (!db.courseReviewers.some((r) => r.course_id === courseId)) {
      throw new Error('Назначьте проверяющего перед публикацией');
    }
    c.status = 'published';
    db.lessons.filter((l) => l.course_id === courseId).forEach((l) => { l.status = 'published'; });
    db.steps
      .filter((s) => {
        const l = findLesson(s.lesson_id);
        return l && l.course_id === courseId;
      })
      .forEach((s) => { s.status = 'published'; });
    return { ...c };
  },

  async listWorksOnReview(reviewerId) {
    await delay(300);
    const myCourses = db.courseReviewers
      .filter((r) => r.reviewer_id === reviewerId)
      .map((r) => r.course_id);
    return db.works
      .filter((w) => w.status === 'submitted')
      .filter((w) => {
        const l = findLesson(w.lesson_id);
        return l && myCourses.includes(l.course_id);
      })
      .map((w) => {
        const lesson = findLesson(w.lesson_id);
        const course = lesson ? findCourse(lesson.course_id) : null;
        const student = db.users.find((u) => u.id === w.student_id);
        return {
          work: { ...w },
          lesson: lesson ? { ...lesson } : null,
          course: course ? { ...course } : null,
          student: student ? { ...student } : null,
        };
      });
  },

  async getWorkForReview(workId) {
    await delay(200);
    const w = db.works.find((x) => x.id === workId);
    if (!w) throw new Error('Работа не найдена');
    const lesson = findLesson(w.lesson_id);
    const course = lesson ? findCourse(lesson.course_id) : null;
    const student = db.users.find((u) => u.id === w.student_id);
    const reviews = db.reviews
      .filter((r) => r.student_work_id === workId)
      .sort((a, b) => a.review_round - b.review_round);
    return {
      work: { ...w },
      lesson: lesson ? { ...lesson } : null,
      course: course ? { ...course } : null,
      student: student ? { ...student } : null,
      reviews: reviews.map((r) => ({ ...r })),
    };
  },

  async submitReview(workId, reviewerId, verdict, comment) {
    await delay(600);
    const w = db.works.find((x) => x.id === workId);
    if (!w) throw new Error('Работа не найдена');
    if (!['approved', 'changes_requested'].includes(verdict)) throw new Error('Некорректный вердикт');
    if (!(comment || '').trim()) throw new Error('Напишите комментарий к работе');
    const round = db.reviews.filter((r) => r.student_work_id === workId).length + 1;
    const review = {
      id: uid('r'), student_work_id: workId, reviewer_id: reviewerId,
      verdict, comment: comment.trim(), review_round: round, created_at: nowIso(),
    };
    db.reviews.push(review);
    w.status = verdict === 'approved' ? 'approved' : 'changes_requested';
    if (verdict === 'approved') {
      const lesson = findLesson(w.lesson_id);
      recalcProgress(w.student_id, lesson.course_id);
    }
    return { ...review };
  },
};
