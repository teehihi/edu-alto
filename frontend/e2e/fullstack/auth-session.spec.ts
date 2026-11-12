import type { BrowserContext } from "@playwright/test";
import {
  defaultTestPassword,
  e2eOtpCode,
  expect,
  fullstackApiUrl,
  isApiCall,
  test,
  uniqueTestTag,
} from "../fixtures/fullstack";
import { AuthPageObject } from "../pages/auth.page";

async function getRefreshCookie(context: BrowserContext) {
  const cookies = await context.cookies();
  return cookies.find((cookie) => cookie.name === "edualto.refresh");
}

test(
  "register, OTP verification, login, reload refresh, and logout lifecycle works end-to-end",
  { tag: "@fullstack" },
  async ({ context, page, request }) => {
    const authPage = new AuthPageObject(page);
    const tag = uniqueTestTag("auth");
    const email = `${tag}@e2e.edualto.local`;
    const fullName = `Học viên E2E ${tag.slice(-6)}`;

    await authPage.registerStudent({
      fullName,
      email,
      password: defaultTestPassword,
    });
    await authPage.verifyEmailWithOtp(e2eOtpCode);
    await authPage.login(email, defaultTestPassword);

    await page.waitForURL(/\/learning|\/profile|\/$/);
    const activeRefreshCookie = await getRefreshCookie(context);
    expect(activeRefreshCookie).toBeTruthy();
    expect(activeRefreshCookie?.httpOnly).toBe(true);

    const refreshOnReloadPromise = page.waitForResponse((response) =>
      isApiCall(response.url(), response.request().method(), "/api/v1/auth/refresh", "POST"),
    );
    await page.goto("/profile");
    const refreshOnReload = await refreshOnReloadPromise;
    expect(refreshOnReload.status()).toBe(200);

    const refreshedPayload = (await refreshOnReload.json()) as {
      data: { accessToken: string };
    };
    expect(refreshedPayload.data.accessToken).toBeTruthy();
    await expect(page.getByRole("heading", { level: 1, name: fullName })).toBeVisible();
    await expect(page.getByRole("button", { name: `Menu người dùng: ${fullName}` })).toBeVisible();

    await authPage.logoutFromUserMenu(fullName);
    await expect.poll(async () => getRefreshCookie(context)).toBeUndefined();

    const replayRefreshWithOldCookie = await request.post(`${fullstackApiUrl}/auth/refresh`, {
      headers: {
        Cookie: `edualto.refresh=${activeRefreshCookie!.value}`,
      },
    });
    expect(replayRefreshWithOldCookie.status()).toBe(401);

    const refreshWithoutCookie = await context.request.post(`${fullstackApiUrl}/auth/refresh`);
    expect(refreshWithoutCookie.status()).toBe(401);
  },
);

test(
  "401 response triggers single-flight refresh and retries original API request",
  { tag: "@fullstack" },
  async ({ page, studentAccount }) => {
    let refreshRequests = 0;
    let injectedExpiredError = false;

    page.on("request", (request) => {
      if (isApiCall(request.url(), request.method(), "/api/v1/auth/refresh", "POST")) {
        refreshRequests += 1;
      }
    });

    await page.route("**/api/v1/me/enrollments*", async (route) => {
      if (!injectedExpiredError) {
        injectedExpiredError = true;
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Access token expired in E2E simulation",
              details: [],
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    const initialRefreshPromise = page.waitForResponse((response) =>
      isApiCall(response.url(), response.request().method(), "/api/v1/auth/refresh", "POST"),
    );
    const retriedEnrollmentsPromise = page.waitForResponse(
      (response) =>
        isApiCall(response.url(), response.request().method(), "/api/v1/me/enrollments", "GET") &&
        response.status() === 200,
    );

    await page.goto("/learning/courses");
    const initialRefresh = await initialRefreshPromise;
    expect(initialRefresh.status()).toBe(200);

    const retriedEnrollments = await retriedEnrollmentsPromise;
    expect(retriedEnrollments.status()).toBe(200);
    expect(injectedExpiredError).toBe(true);
    // 1 initial bootstrap refresh + 1 single-flight retry refresh after the simulated 401
    expect(refreshRequests).toBe(2);
    await expect(
      page.getByRole("button", { name: `Menu người dùng: ${studentAccount.fullName}` }),
    ).toBeVisible();
  },
);
