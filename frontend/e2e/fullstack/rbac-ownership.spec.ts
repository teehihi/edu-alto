import { createPublishedTextCourse, expect, fullstackApiUrl, test } from "../fixtures/fullstack";

test(
  "RBAC prevents student and instructor from accessing unauthorized portals and APIs",
  { tag: "@fullstack" },
  async ({ adminAccount, instructorAccount, page, studentAccount }) => {
    const adminSummaryAsStudent = await studentAccount.api.get(
      `${fullstackApiUrl}/admin/dashboard/summary`,
      {
        headers: { Authorization: `Bearer ${studentAccount.accessToken}` },
      },
    );
    expect(adminSummaryAsStudent.status()).toBe(403);

    const createCourseAsStudent = await studentAccount.api.post(
      `${fullstackApiUrl}/instructor/courses`,
      {
        headers: { Authorization: `Bearer ${studentAccount.accessToken}` },
        data: {
          title: "Unauthorized Student Course",
          description: "Should be rejected with 403",
          price: 0,
        },
      },
    );
    expect(createCourseAsStudent.status()).toBe(403);

    const adminUsersAsInstructor = await instructorAccount.api.get(
      `${fullstackApiUrl}/admin/users`,
      {
        headers: { Authorization: `Bearer ${instructorAccount.accessToken}` },
      },
    );
    expect(adminUsersAsInstructor.status()).toBe(403);

    const adminSummaryAsAdmin = await adminAccount.api.get(
      `${fullstackApiUrl}/admin/dashboard/summary`,
      {
        headers: { Authorization: `Bearer ${adminAccount.accessToken}` },
      },
    );
    expect(adminSummaryAsAdmin.status()).toBe(200);

    await page.goto("/admin/dashboard");
    await expect(page.getByRole("heading", { name: "Không có quyền quản trị" })).toBeVisible();
  },
);

test(
  "enrollment gate and cross-student order ownership block unauthorized access",
  { tag: "@fullstack" },
  async ({ instructorAccount, secondaryStudentAccount, studentAccount }) => {
    const paidCourse = await createPublishedTextCourse(instructorAccount, {
      titlePrefix: "ownership-paid",
      price: 299000,
      isPreview: false,
    });

    const lessonWithoutEnrollment = await secondaryStudentAccount.api.get(
      `${fullstackApiUrl}/lessons/${paidCourse.lessonId}`,
      {
        headers: { Authorization: `Bearer ${secondaryStudentAccount.accessToken}` },
      },
    );
    expect(lessonWithoutEnrollment.status()).toBe(403);

    const completeWithoutEnrollment = await secondaryStudentAccount.api.post(
      `${fullstackApiUrl}/lessons/${paidCourse.lessonId}/complete`,
      {
        headers: { Authorization: `Bearer ${secondaryStudentAccount.accessToken}` },
      },
    );
    expect(completeWithoutEnrollment.status()).toBe(403);

    const createOrderResponse = await studentAccount.api.post(`${fullstackApiUrl}/me/orders`, {
      headers: { Authorization: `Bearer ${studentAccount.accessToken}` },
      data: {
        courseIds: [paidCourse.courseId],
        paymentMethod: "VIETQR",
        phoneNumber: "0901234567",
      },
    });
    expect(createOrderResponse.status()).toBe(200);
    const createdOrderBody = (await createOrderResponse.json()) as {
      data: { orderId: string; status: string };
    };
    const orderId = createdOrderBody.data.orderId;
    expect(orderId).toBeTruthy();

    const readOtherOrder = await secondaryStudentAccount.api.get(
      `${fullstackApiUrl}/me/orders/${orderId}`,
      {
        headers: { Authorization: `Bearer ${secondaryStudentAccount.accessToken}` },
      },
    );
    expect([403, 404]).toContain(readOtherOrder.status());

    const cancelOtherOrder = await secondaryStudentAccount.api.post(
      `${fullstackApiUrl}/me/orders/${orderId}/cancel`,
      {
        headers: { Authorization: `Bearer ${secondaryStudentAccount.accessToken}` },
      },
    );
    expect([403, 404]).toContain(cancelOtherOrder.status());

    const readOwnOrder = await studentAccount.api.get(`${fullstackApiUrl}/me/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${studentAccount.accessToken}` },
    });
    expect(readOwnOrder.status()).toBe(200);
    const ownOrderBody = (await readOwnOrder.json()) as { data: { status: string } };
    expect(ownOrderBody.data.status).toBe("PAYMENT_REVIEW");

    await studentAccount.api.post(`${fullstackApiUrl}/me/orders/${orderId}/cancel`, {
      headers: { Authorization: `Bearer ${studentAccount.accessToken}` },
    });
  },
);
