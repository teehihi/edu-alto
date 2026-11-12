import { expect, type Page } from "@playwright/test";

export class LearningPageObject {
  constructor(private readonly page: Page) {}

  async gotoCourseDetail(slug: string) {
    await this.page.goto(`/courses/${slug}`);
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  async enrollFreeCourse(courseId: string) {
    const enrollButton = this.page.getByRole("button", { name: "Đăng ký học" });
    await expect(enrollButton).toBeEnabled();

    const enrollResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === `/api/v1/courses/${courseId}/enrollments`,
    );
    await enrollButton.click();
    const response = await enrollResponse;
    expect(response.status()).toBe(200);
    await this.page.waitForURL(new RegExp(`/learning/courses/${courseId}`));
  }

  async gotoLesson(lessonId: string) {
    const lessonResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === `/api/v1/lessons/${lessonId}`,
    );
    await this.page.goto(`/learning/lessons/${lessonId}`);
    const response = await lessonResponse;
    expect(response.status()).toBe(200);
  }

  async completeCurrentLesson(lessonId: string) {
    const completeButton = this.page.getByRole("button", { name: "Đánh dấu hoàn thành" });
    await expect(completeButton).toBeEnabled();

    const completeResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === `/api/v1/lessons/${lessonId}/complete`,
    );
    await completeButton.click();
    const response = await completeResponse;
    expect(response.status()).toBe(200);
    await expect(this.page.getByRole("button", { name: "Đã hoàn thành" })).toBeDisabled();
  }
}
