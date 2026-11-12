import { createPublishedTextCourse, expect, fullstackApiUrl, test } from "../fixtures/fullstack";
import { LearningPageObject } from "../pages/learning.page";

test(
  "student can enroll in free course, complete a text lesson, and persist progress in PostgreSQL",
  { tag: "@fullstack" },
  async ({ instructorAccount, page, studentAccount }) => {
    const course = await createPublishedTextCourse(instructorAccount, {
      titlePrefix: "free-learning",
      price: 0,
      originalPrice: 0,
    });
    const learningPage = new LearningPageObject(page);

    await learningPage.gotoCourseDetail(course.slug);
    await expect(page.getByRole("heading", { level: 1, name: course.title })).toBeVisible();

    await learningPage.enrollFreeCourse(course.courseId);

    // Enrolling again via API must be idempotent and return the same enrollment ID.
    const firstHistoryResponse = await studentAccount.api.get(`${fullstackApiUrl}/me/enrollments`, {
      headers: { Authorization: `Bearer ${studentAccount.accessToken}` },
    });
    expect(firstHistoryResponse.status()).toBe(200);
    const firstHistoryBody = (await firstHistoryResponse.json()) as {
      data: Array<{ enrollmentId: string; courseId: string }>;
    };
    const matchedEnrollment = firstHistoryBody.data.find(
      (item) => item.courseId === course.courseId,
    );
    expect(matchedEnrollment).toBeTruthy();

    const duplicateEnrollResponse = await studentAccount.api.post(
      `${fullstackApiUrl}/courses/${course.courseId}/enrollments`,
      {
        headers: { Authorization: `Bearer ${studentAccount.accessToken}` },
      },
    );
    expect(duplicateEnrollResponse.status()).toBe(200);
    const duplicateEnrollBody = (await duplicateEnrollResponse.json()) as { data: string };
    expect(duplicateEnrollBody.data).toBe(matchedEnrollment!.enrollmentId);

    await learningPage.gotoLesson(course.lessonId);
    await expect(page.getByRole("heading", { level: 1, name: course.lessonTitle })).toBeVisible();

    await learningPage.completeCurrentLesson(course.lessonId);

    await page.reload();
    await expect(page.getByRole("button", { name: "Đã hoàn thành" })).toBeDisabled();

    const progressResponse = await studentAccount.api.get(
      `${fullstackApiUrl}/me/courses/${course.courseId}/progress`,
      {
        headers: { Authorization: `Bearer ${studentAccount.accessToken}` },
      },
    );
    expect(progressResponse.status()).toBe(200);
    const progressBody = (await progressResponse.json()) as {
      data: {
        courseId: string;
        totalLessons: number;
        completedLessons: number;
        progressPercent: number;
        completed: boolean;
        completedLessonIds: string[];
      };
    };
    expect(progressBody.data.completed).toBe(true);
    expect(progressBody.data.progressPercent).toBe(100);
    expect(progressBody.data.completedLessons).toBe(1);
    expect(progressBody.data.completedLessonIds).toContain(course.lessonId);
  },
);
