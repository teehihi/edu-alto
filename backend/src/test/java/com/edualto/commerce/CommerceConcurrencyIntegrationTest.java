package com.edualto.commerce;

import static org.assertj.core.api.Assertions.assertThat;

import com.edualto.AbstractIntegrationTest;
import com.edualto.commerce.domain.PaymentMethod;
import com.edualto.commerce.dto.CreateOrderRequest;
import com.edualto.commerce.dto.OrderCreatedResponse;
import com.edualto.commerce.dto.PromotionRequest;
import com.edualto.commerce.repository.PromotionRepository;
import com.edualto.commerce.service.CommerceService;
import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.repository.CourseRepository;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.repository.RoleRepository;
import com.edualto.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

class CommerceConcurrencyIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private CommerceService commerceService;

    @Autowired
    private PromotionRepository promotionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final List<UUID> fixtureUserIds = new ArrayList<>();
    private final List<UUID> fixtureCourseIds = new ArrayList<>();
    private final List<UUID> fixturePromotionIds = new ArrayList<>();

    @AfterEach
    void cleanFixtures() {
        for (UUID userId : fixtureUserIds) {
            jdbcTemplate.update("delete from learning_activities where student_id = ?", userId);
            jdbcTemplate.update("delete from promotion_redemptions where student_id = ?", userId);
            jdbcTemplate.update("""
                    delete from manual_payment_confirmations
                    where payment_id in (
                        select p.id from payments p join orders o on o.id = p.order_id where o.student_id = ?
                    )
                    """, userId);
            jdbcTemplate.update("""
                    delete from payments
                    where order_id in (select id from orders where student_id = ?)
                    """, userId);
            jdbcTemplate.update("""
                    delete from order_items
                    where order_id in (select id from orders where student_id = ?)
                    """, userId);
            jdbcTemplate.update("delete from orders where student_id = ?", userId);
        }
        for (UUID promotionId : fixturePromotionIds) {
            jdbcTemplate.update("delete from promotion_redemptions where promotion_id = ?", promotionId);
            jdbcTemplate.update("delete from course_promotions where id = ?", promotionId);
        }
        for (UUID courseId : fixtureCourseIds) {
            jdbcTemplate.update("delete from enrollments where course_id = ?", courseId);
        }
        courseRepository.deleteAllById(fixtureCourseIds);
        userRepository.deleteAllById(fixtureUserIds);
        fixturePromotionIds.clear();
        fixtureCourseIds.clear();
        fixtureUserIds.clear();
    }

    @Test
    void concurrentCreateOrderForSameStudentNeverCreatesMultipleActivePendingOrders() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR);
        User studentA = createUser(RoleName.STUDENT);
        User studentB = createUser(RoleName.STUDENT);
        Course courseOne = createPublishedCourse(instructor, new BigDecimal("250000"));
        Course courseTwo = createPublishedCourse(instructor, new BigDecimal("350000"));

        // Same cart submitted concurrently 4 times by the same student reuses a single pending order.
        List<OrderCreatedResponse> sameCartResults = runConcurrently(List.of(
                () -> commerceService.createOrder(
                        studentA.getId(),
                        new CreateOrderRequest(List.of(courseOne.getId()), PaymentMethod.SEPAY, "0931652105", null),
                        "127.0.0.1"
                ),
                () -> commerceService.createOrder(
                        studentA.getId(),
                        new CreateOrderRequest(List.of(courseOne.getId()), PaymentMethod.SEPAY, "0931652105", null),
                        "127.0.0.1"
                ),
                () -> commerceService.createOrder(
                        studentA.getId(),
                        new CreateOrderRequest(List.of(courseOne.getId()), PaymentMethod.SEPAY, "0931652105", null),
                        "127.0.0.1"
                ),
                () -> commerceService.createOrder(
                        studentA.getId(),
                        new CreateOrderRequest(List.of(courseOne.getId()), PaymentMethod.SEPAY, "0931652105", null),
                        "127.0.0.1"
                )
        ));

        UUID expectedOrderId = sameCartResults.getFirst().orderId();
        assertThat(sameCartResults).extracting(OrderCreatedResponse::orderId).containsOnly(expectedOrderId);
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from orders where student_id = ? and status in ('PENDING_PAYMENT', 'PAYMENT_REVIEW')",
                Integer.class,
                studentA.getId()
        )).isEqualTo(1);

        // Different carts submitted concurrently by the same student fail the superseded order and keep only 1 active pending order.
        List<OrderCreatedResponse> differentCartResults = runConcurrently(List.of(
                () -> commerceService.createOrder(
                        studentB.getId(),
                        new CreateOrderRequest(List.of(courseOne.getId()), PaymentMethod.SEPAY, "0931652105", null),
                        "127.0.0.1"
                ),
                () -> commerceService.createOrder(
                        studentB.getId(),
                        new CreateOrderRequest(List.of(courseTwo.getId()), PaymentMethod.SEPAY, "0931652105", null),
                        "127.0.0.1"
                )
        ));

        assertThat(differentCartResults).hasSize(2);
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from orders where student_id = ? and status in ('PENDING_PAYMENT', 'PAYMENT_REVIEW')",
                Integer.class,
                studentB.getId()
        )).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from orders where student_id = ? and status = 'PAYMENT_FAILED'",
                Integer.class,
                studentB.getId()
        )).isEqualTo(1);
    }

    @Test
    void concurrentMultiCourseOrdersWithReversedCourseOrderNeverDeadlock() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR);
        Course courseOne = createPublishedCourse(instructor, new BigDecimal("200000"));
        Course courseTwo = createPublishedCourse(instructor, new BigDecimal("300000"));
        List<Callable<OrderCreatedResponse>> tasks = new ArrayList<>();

        for (int index = 0; index < 6; index++) {
            User student = createUser(RoleName.STUDENT);
            List<UUID> courseIds = index % 2 == 0
                    ? List.of(courseOne.getId(), courseTwo.getId())
                    : List.of(courseTwo.getId(), courseOne.getId());
            tasks.add(() -> commerceService.createOrder(
                    student.getId(),
                    new CreateOrderRequest(courseIds, PaymentMethod.SEPAY, "0931652105", null),
                    "127.0.0.1"
            ));
        }

        List<OrderCreatedResponse> responses = runConcurrently(tasks);
        assertThat(responses).hasSize(6);
        assertThat(responses).allMatch(response -> response.total().compareTo(new BigDecimal("500000")) == 0);
    }

    @Test
    void concurrentStudentsCompetingForSingleUsePromotionNeverOversell() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR);
        Course course = createPublishedCourse(instructor, new BigDecimal("300000"));
        String promoCode = "ONEONLY" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        UUID promotionId = createPromotion(course.getId(), promoCode, 1);

        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger exhaustedCount = new AtomicInteger();
        List<Callable<Void>> tasks = new ArrayList<>();

        for (int index = 0; index < 5; index++) {
            User student = createUser(RoleName.STUDENT);
            tasks.add(() -> {
                try {
                    commerceService.createOrder(
                            student.getId(),
                            new CreateOrderRequest(List.of(course.getId()), PaymentMethod.SEPAY, "0931652105", promoCode),
                            "127.0.0.1"
                    );
                    successCount.incrementAndGet();
                } catch (BusinessException exception) {
                    if ("PROMOTION_EXHAUSTED".equals(exception.getCode())) {
                        exhaustedCount.incrementAndGet();
                    } else {
                        throw exception;
                    }
                }
                return null;
            });
        }

        runConcurrently(tasks);

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(exhaustedCount.get()).isEqualTo(4);
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from promotion_redemptions where promotion_id = ? and status in ('RESERVED', 'REDEEMED')",
                Integer.class,
                promotionId
        )).isEqualTo(1);
    }

    @Test
    void concurrentDuplicatePaymentWebhooksAreIdempotent() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR);
        User student = createUser(RoleName.STUDENT);
        Course course = createPublishedCourse(instructor, new BigDecimal("250000"));
        String promoCode = "WEBHOOK" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        UUID promotionId = createPromotion(course.getId(), promoCode, 1);

        OrderCreatedResponse created = commerceService.createOrder(
                student.getId(),
                new CreateOrderRequest(List.of(course.getId()), PaymentMethod.SEPAY, "0931652105", promoCode),
                "127.0.0.1"
        );
        String webhookPayload = created.instructions() != null
                ? String.format(
                        "{\"transferType\":\"in\",\"content\":\"%s\",\"transferAmount\":%s}",
                        created.instructions().transferReference(),
                        created.total().toBigInteger()
                )
                : String.format(
                        "{\"notification_type\":\"ORDER_PAID\",\"order\":{\"order_invoice_number\":\"%s\",\"order_amount\":\"%s\"}}",
                        created.orderId(),
                        created.total().toBigInteger()
                );

        List<Callable<Map<String, Object>>> webhookCalls = new ArrayList<>();
        for (int index = 0; index < 5; index++) {
            webhookCalls.add(() -> commerceService.processGatewayWebhook("SEPAY", webhookPayload, Map.of(), Map.of()));
        }

        List<Map<String, Object>> responses = runConcurrently(webhookCalls);
        assertThat(responses).hasSize(5);
        assertThat(jdbcTemplate.queryForObject(
                "select status from orders where id = ?",
                String.class,
                created.orderId()
        )).isEqualTo("PAID");
        assertThat(jdbcTemplate.queryForObject(
                "select status from payments where order_id = ?",
                String.class,
                created.orderId()
        )).isEqualTo("PAID");
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from enrollments where student_id = ? and course_id = ?",
                Integer.class,
                student.getId(),
                course.getId()
        )).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from promotion_redemptions where promotion_id = ? and order_id = ? and status = 'REDEEMED'",
                Integer.class,
                promotionId,
                created.orderId()
        )).isEqualTo(1);
    }

    private <T> List<T> runConcurrently(List<Callable<T>> tasks) throws Exception {
        int count = tasks.size();
        CountDownLatch ready = new CountDownLatch(count);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(count)) {
            List<Future<T>> futures = new ArrayList<>(count);
            for (Callable<T> task : tasks) {
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    if (!start.await(10, TimeUnit.SECONDS)) {
                        throw new IllegalStateException("Concurrent workers timed out waiting to start");
                    }
                    return task.call();
                }));
            }
            if (!ready.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Concurrent workers did not become ready");
            }
            start.countDown();

            List<T> results = new ArrayList<>(count);
            for (Future<T> future : futures) {
                try {
                    results.add(future.get(20, TimeUnit.SECONDS));
                } catch (ExecutionException exception) {
                    if (exception.getCause() instanceof Exception cause) {
                        throw cause;
                    }
                    throw exception;
                }
            }
            return results;
        }
    }

    private User createUser(RoleName roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName, "Integration test role")));
        String suffix = UUID.randomUUID().toString();
        User user = new User("Concurrency " + roleName, suffix + "@edualto.test", "not-a-real-password-hash");
        user.addRole(role);
        user.activate();
        User saved = userRepository.save(user);
        fixtureUserIds.add(saved.getId());
        return saved;
    }

    private Course createPublishedCourse(User instructor, BigDecimal price) {
        String suffix = UUID.randomUUID().toString();
        Course course = new Course(
                UUID.randomUUID(),
                instructor.getId(),
                "Khóa học concurrency " + suffix.substring(0, 6),
                "concurrency-" + suffix,
                null,
                "Mô tả khóa học kiểm thử đồng thời",
                price,
                null,
                CourseLevel.ALL_LEVELS,
                "vi",
                null
        );
        course.setStatus(CourseStatus.PUBLISHED);
        course.setPublishedAt(Instant.now());
        Course saved = courseRepository.save(course);
        fixtureCourseIds.add(saved.getId());
        return saved;
    }

    private UUID createPromotion(UUID courseId, String code, int maxRedemptions) {
        UUID promotionId = promotionRepository.insert(
                courseId,
                new PromotionRequest(
                        "Ưu đãi kiểm thử " + code,
                        code,
                        "FIXED",
                        new BigDecimal("50000"),
                        maxRedemptions,
                        OffsetDateTime.now().minusMinutes(5),
                        OffsetDateTime.now().plusHours(2),
                        "ACTIVE"
                ),
                code
        );
        fixturePromotionIds.add(promotionId);
        return promotionId;
    }
}
