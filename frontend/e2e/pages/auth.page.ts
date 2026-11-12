import { expect, type Page } from "@playwright/test";

export class AuthPageObject {
  constructor(private readonly page: Page) {}

  async registerStudent(options: { fullName: string; email: string; password: string }) {
    await this.page.goto("/register");
    await this.page.getByRole("radio", { name: "Học viên" }).click();
    await this.page.locator("#fullName").fill(options.fullName);
    await this.page.locator("#email").fill(options.email);
    await this.page.locator("#password").fill(options.password);
    await this.page.locator("#confirmPassword").fill(options.password);

    const registerResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/v1/auth/register",
    );
    await this.page.getByRole("button", { name: "Đăng ký" }).click();
    const response = await registerResponse;
    expect(response.status()).toBe(200);
    await this.page.waitForURL(/\/verify-email/);
  }

  async verifyEmailWithOtp(otpCode: string) {
    const otpInput = this.page.getByLabel("Mã OTP");
    await otpInput.fill(otpCode);

    const verifyResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/v1/auth/verify-email",
    );
    await this.page.getByRole("button", { name: "Xác nhận" }).click();
    const response = await verifyResponse;
    expect(response.status()).toBe(200);
    await this.page.waitForURL(/\/login/, { timeout: 10_000 });
  }

  async login(email: string, password: string) {
    await this.page.goto("/login");
    await this.page.locator("#email").fill(email);
    await this.page.locator("#password").fill(password);

    const loginResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/v1/auth/login",
    );
    await this.page.getByRole("button", { name: "Đăng nhập" }).click();
    const response = await loginResponse;
    expect(response.status()).toBe(200);
  }

  async logoutFromUserMenu(fullName?: string) {
    const trigger = this.page.getByRole("button", {
      name: fullName ? `Menu người dùng: ${fullName}` : /Menu người dùng:/,
    });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const logoutResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/v1/auth/logout",
    );
    await this.page.getByRole("menuitem", { name: "Đăng xuất" }).click();
    const response = await logoutResponse;
    expect(response.status()).toBe(200);
  }
}
