import {
  createPublishedTextCourse,
  expect,
  isApiCall,
  seedBrowserCart,
  test,
} from "../fixtures/fullstack";

test(
  "double requestSubmit at checkout sends one order request, survives reload, and cancels cleanly",
  { tag: "@fullstack" },
  async ({ instructorAccount, page, studentAccount }) => {
    const paidCourse = await createPublishedTextCourse(instructorAccount, {
      titlePrefix: "checkout-race",
      price: 399000,
    });

    await page.goto("/courses");
    await seedBrowserCart(page, paidCourse, instructorAccount.fullName);

    await page.goto("/checkout");
    const checkoutForm = page.locator("#checkout-form");
    await expect(checkoutForm).toBeVisible();
    await expect(page.getByText(paidCourse.title).first()).toBeVisible();

    await checkoutForm.locator('input[name="phoneNumber"]').fill("0901234567");
    await checkoutForm.locator('input[name="payment-method"][value="VIETQR"]').check();

    const submitButton = page.locator('button[form="checkout-form"]');
    await expect(submitButton).toBeEnabled();

    let orderRequestCount = 0;
    page.on("request", (request) => {
      if (isApiCall(request.url(), request.method(), "/api/v1/me/orders", "POST")) {
        orderRequestCount += 1;
      }
    });

    const createOrderResponsePromise = page.waitForResponse((response) =>
      isApiCall(response.url(), response.request().method(), "/api/v1/me/orders", "POST"),
    );

    await checkoutForm.evaluate((form: HTMLFormElement) => {
      form.requestSubmit();
      form.requestSubmit();
    });

    const createOrderResponse = await createOrderResponsePromise;
    expect(createOrderResponse.status()).toBe(200);
    expect(orderRequestCount).toBe(1);

    await expect(page.getByText(/Đơn hàng đang chờ thanh toán/)).toBeVisible();

    // Reloading checkout must recover the active pending order from backend /me/orders/active-pending.
    const activePendingPromise = page.waitForResponse((response) =>
      isApiCall(
        response.url(),
        response.request().method(),
        "/api/v1/me/orders/active-pending",
        "GET",
      ),
    );
    await page.reload();
    const activePendingResponse = await activePendingPromise;
    expect(activePendingResponse.status()).toBe(200);
    await expect(page.getByText(/Đã khôi phục đơn hàng đang chờ thanh toán/)).toBeVisible();

    const cancelOrderPromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /^\/api\/v1\/me\/orders\/[^/]+\/cancel$/.test(new URL(response.url()).pathname),
    );
    await page.getByRole("button", { name: "Hủy đơn để tạo lại" }).click();
    const cancelOrderResponse = await cancelOrderPromise;
    expect(cancelOrderResponse.status()).toBe(200);

    await expect(page.getByRole("button", { name: "Tạo hướng dẫn chuyển khoản" })).toBeEnabled();
    expect(studentAccount.email).toBeTruthy();
  },
);
