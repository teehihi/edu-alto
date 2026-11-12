import { randomUUID } from "node:crypto";
import { expect, test as base, type APIRequestContext, type Page } from "@playwright/test";

export const fullstackApiUrl =
  process.env.PLAYWRIGHT_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080/api/v1";

export const e2eOtpCode = process.env.E2E_OTP_CODE ?? process.env.OTP_FIXED_CODE ?? "123456";
export const e2eAdminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@edualto.vn";
export const e2eAdminPassword = process.env.E2E_ADMIN_PASSWORD ?? "AdminE2E123!";
export const defaultTestPassword = "E2ePassword123!";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
};

export type E2eUserSummary = {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
};

export type AuthTokenPayload = {
  tokenType: string;
  accessToken: string;
  expiresInSeconds: number;
  user: E2eUserSummary;
};

export type TestAccount = {
  email: string;
  password: string;
  fullName: string;
  accessToken: string;
  user: E2eUserSummary;
  api: APIRequestContext;
};

export type PublishedCourseFixture = {
  courseId: string;
  slug: string;
  title: string;
  price: number;
  sectionId: string;
  lessonId: string;
  lessonTitle: string;
};

type FullstackFixtures = {
  instructorAccount: TestAccount;
  studentAccount: TestAccount;
  secondaryStudentAccount: TestAccount;
  adminAccount: TestAccount;
};

export function uniqueTestTag(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

export function isApiCall(
  urlString: string,
  method: string,
  pathname: string,
  expectedMethod?: string,
) {
  const url = new URL(urlString);
  return url.pathname === pathname && (!expectedMethod || method === expectedMethod);
}

export async function registerVerifiedAccount(
  api: APIRequestContext,
  options: {
    role: "STUDENT" | "INSTRUCTOR";
    fullName?: string;
    emailPrefix?: string;
    password?: string;
    expertise?: string;
  },
): Promise<Omit<TestAccount, "api">> {
  const tag = uniqueTestTag(options.role.toLowerCase());
  const email = `${options.emailPrefix ?? tag}@e2e.edualto.local`;
  const password = options.password ?? defaultTestPassword;
  const fullName = options.fullName ?? `E2E ${options.role} ${tag.slice(-6)}`;

  const registerResponse = await api.post(`${fullstackApiUrl}/auth/register`, {
    data: {
      fullName,
      email,
      password,
      confirmPassword: password,
      role: options.role,
      ...(options.role === "INSTRUCTOR"
        ? { expertise: options.expertise ?? "Kiểm thử Fullstack LMS" }
        : {}),
    },
  });
  expect(
    registerResponse.ok(),
    `Đăng ký tài khoản E2E (${email}) thất bại: HTTP ${registerResponse.status()}`,
  ).toBeTruthy();

  const verifyResponse = await api.post(`${fullstackApiUrl}/auth/verify-email`, {
    data: {
      email,
      otp: e2eOtpCode,
    },
  });
  expect(
    verifyResponse.ok(),
    `Xác thực OTP E2E (${email}) thất bại: HTTP ${verifyResponse.status()}`,
  ).toBeTruthy();

  const loginPayload = await loginViaApi(api, email, password);
  return {
    email,
    password,
    fullName,
    accessToken: loginPayload.accessToken,
    user: loginPayload.user,
  };
}

export async function loginViaApi(
  api: APIRequestContext,
  email: string,
  password: string,
): Promise<AuthTokenPayload> {
  const loginResponse = await api.post(`${fullstackApiUrl}/auth/login`, {
    data: { email, password },
  });
  expect(
    loginResponse.ok(),
    `Đăng nhập API (${email}) thất bại: HTTP ${loginResponse.status()}`,
  ).toBeTruthy();

  const body = (await loginResponse.json()) as ApiEnvelope<AuthTokenPayload>;
  expect(body.data?.accessToken).toBeTruthy();
  return body.data;
}

export async function logoutViaApi(api: APIRequestContext): Promise<void> {
  try {
    await api.post(`${fullstackApiUrl}/auth/logout`);
  } catch {
    // Cleanup best-effort so teardown does not mask test failures.
  }
}

export async function createPublishedTextCourse(
  instructor: TestAccount,
  options: {
    titlePrefix?: string;
    price: number;
    originalPrice?: number;
    isPreview?: boolean;
  },
): Promise<PublishedCourseFixture> {
  const tag = uniqueTestTag(options.titlePrefix ?? "e2e-course");
  const title = `Khóa học E2E ${tag}`;
  const slug = tag.toLowerCase();

  const createCourseResponse = await instructor.api.post(`${fullstackApiUrl}/instructor/courses`, {
    headers: { Authorization: `Bearer ${instructor.accessToken}` },
    data: {
      title,
      slug,
      tagline: "Khóa học kiểm thử tích hợp fullstack EduAlto",
      description: "Nội dung khóa học được tạo tự động trong bộ kiểm thử E2E.",
      price: options.price,
      originalPrice: options.originalPrice ?? (options.price > 0 ? options.price * 2 : 0),
      level: "BEGINNER",
      language: "vi",
    },
  });
  expect(
    createCourseResponse.ok(),
    `Tạo khóa học thất bại: HTTP ${createCourseResponse.status()}`,
  ).toBeTruthy();
  const courseBody = (await createCourseResponse.json()) as ApiEnvelope<{
    id: string;
    slug: string;
    title: string;
  }>;
  const courseId = courseBody.data.id;

  const createSectionResponse = await instructor.api.post(
    `${fullstackApiUrl}/instructor/courses/${courseId}/sections`,
    {
      headers: { Authorization: `Bearer ${instructor.accessToken}` },
      data: {
        title: "Chương 1: Kiểm thử tự động",
        description: "Chương học phục vụ kiểm thử luồng học tập thật.",
      },
    },
  );
  expect(
    createSectionResponse.ok(),
    `Tạo chương học thất bại: HTTP ${createSectionResponse.status()}`,
  ).toBeTruthy();
  const sectionBody = (await createSectionResponse.json()) as ApiEnvelope<{ id: string }>;
  const sectionId = sectionBody.data.id;

  const lessonTitle = `Bài học văn bản ${tag.slice(-6)}`;
  const createLessonResponse = await instructor.api.post(
    `${fullstackApiUrl}/instructor/courses/${courseId}/sections/${sectionId}/lessons`,
    {
      headers: { Authorization: `Bearer ${instructor.accessToken}` },
      data: {
        title: lessonTitle,
        slug: `${slug}-lesson-1`,
        description: "Mô tả bài học kiểm thử E2E",
        content: "Đây là nội dung bài học văn bản dùng để kiểm thử luồng hoàn thành bài học.",
        lessonType: "TEXT",
        durationSeconds: 180,
        isPreview: options.isPreview ?? false,
        status: "PUBLISHED",
      },
    },
  );
  expect(
    createLessonResponse.ok(),
    `Tạo bài học thất bại: HTTP ${createLessonResponse.status()}`,
  ).toBeTruthy();
  const lessonBody = (await createLessonResponse.json()) as ApiEnvelope<{ id: string }>;

  const publishResponse = await instructor.api.post(
    `${fullstackApiUrl}/instructor/courses/${courseId}/publish`,
    {
      headers: { Authorization: `Bearer ${instructor.accessToken}` },
    },
  );
  expect(
    publishResponse.ok(),
    `Xuất bản khóa học thất bại: HTTP ${publishResponse.status()}`,
  ).toBeTruthy();

  return {
    courseId,
    slug: courseBody.data.slug,
    title: courseBody.data.title,
    price: options.price,
    sectionId,
    lessonId: lessonBody.data.id,
    lessonTitle,
  };
}

export async function seedBrowserCart(
  page: Page,
  course: PublishedCourseFixture,
  instructorName: string,
) {
  await page.evaluate(
    ({ item }) => {
      window.localStorage.setItem("edualto:cart:v1", JSON.stringify([item]));
      window.dispatchEvent(new Event("edualto:cart-changed"));
    },
    {
      item: {
        id: course.courseId,
        slug: course.slug,
        title: course.title,
        price: course.price,
        thumbnailUrl: null,
        instructorName,
        lessonCount: 1,
        durationSeconds: 180,
      },
    },
  );
}

export const test = base.extend<FullstackFixtures>({
  instructorAccount: async ({ playwright }, provide) => {
    const api = await playwright.request.newContext();
    try {
      const account = await registerVerifiedAccount(api, { role: "INSTRUCTOR" });
      await provide({ ...account, api });
    } finally {
      await logoutViaApi(api);
      await api.dispose();
    }
  },

  studentAccount: async ({ context }, provide) => {
    const account = await registerVerifiedAccount(context.request, { role: "STUDENT" });
    try {
      await provide({ ...account, api: context.request });
    } finally {
      await logoutViaApi(context.request);
    }
  },

  secondaryStudentAccount: async ({ playwright }, provide) => {
    const api = await playwright.request.newContext();
    try {
      const account = await registerVerifiedAccount(api, { role: "STUDENT" });
      await provide({ ...account, api });
    } finally {
      await logoutViaApi(api);
      await api.dispose();
    }
  },

  adminAccount: async ({ playwright }, provide) => {
    const api = await playwright.request.newContext();
    try {
      const payload = await loginViaApi(api, e2eAdminEmail, e2eAdminPassword);
      await provide({
        email: e2eAdminEmail,
        password: e2eAdminPassword,
        fullName: payload.user.fullName,
        accessToken: payload.accessToken,
        user: payload.user,
        api,
      });
    } finally {
      await logoutViaApi(api);
      await api.dispose();
    }
  },
});

export { expect };
