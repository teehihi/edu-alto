package com.edualto.admin.repository;

import com.edualto.admin.dto.AdminAnalyticsResponse;
import com.edualto.admin.dto.AdminDashboardSummaryResponse;
import com.edualto.admin.dto.AdminTopCourseDto;
import com.edualto.admin.dto.AdminUserResponse;
import com.edualto.admin.dto.CategoryDistributionDto;
import com.edualto.admin.dto.MonthlyRevenueDto;
import com.edualto.admin.dto.PaymentMethodStatDto;
import com.edualto.storage.service.StorageService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminRepository {

    private final JdbcTemplate jdbc;
    private final StorageService storageService;

    public AdminRepository(JdbcTemplate jdbc, StorageService storageService) {
        this.jdbc = jdbc;
        this.storageService = storageService;
    }

    public AdminDashboardSummaryResponse getDashboardSummary() {
        return getDashboardSummary("30days");
    }

    public AdminDashboardSummaryResponse getDashboardSummary(String timeRange) {
        String range = (timeRange != null && !timeRange.isBlank()) ? timeRange : "30days";
        String dateFilter = switch (range) {
            case "today" -> " AND created_at >= CURRENT_DATE";
            case "7days" -> " AND created_at >= (CURRENT_DATE - INTERVAL '6 days')";
            case "thisYear" -> " AND created_at >= DATE_TRUNC('year', CURRENT_DATE)";
            default -> " AND created_at >= (CURRENT_DATE - INTERVAL '29 days')";
        };

        // 1. Total revenue for selected range
        BigDecimal totalRevenue = jdbc.queryForObject(
                "SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'PAID'" + dateFilter,
                BigDecimal.class
        );
        if (totalRevenue == null) {
            totalRevenue = BigDecimal.ZERO;
        }

        // 2. Pending orders count
        Long pendingOrders = jdbc.queryForObject(
                "SELECT COUNT(*) FROM orders WHERE status = 'PAYMENT_REVIEW'",
                Long.class
        );
        long pendingOrdersCount = pendingOrders != null ? pendingOrders : 0L;

        // 3. Courses stats
        Map<String, Object> courseStats = jdbc.queryForMap(
                "SELECT COUNT(*) as total, " +
                "COUNT(CASE WHEN status = 'PUBLISHED' THEN 1 END) as published, " +
                "COUNT(CASE WHEN status = 'DRAFT' THEN 1 END) as draft " +
                "FROM courses"
        );
        long totalCourses = ((Number) courseStats.getOrDefault("total", 0L)).longValue();
        long publishedCourses = ((Number) courseStats.getOrDefault("published", 0L)).longValue();
        long draftCourses = ((Number) courseStats.getOrDefault("draft", 0L)).longValue();

        // 4. Users stats
        Map<String, Object> userStats = jdbc.queryForMap(
                "SELECT COUNT(DISTINCT u.id) as total, " +
                "COUNT(DISTINCT CASE WHEN r.name = 'STUDENT' THEN u.id END) as students, " +
                "COUNT(DISTINCT CASE WHEN r.name = 'INSTRUCTOR' THEN u.id END) as instructors " +
                "FROM users u " +
                "LEFT JOIN user_roles ur ON u.id = ur.user_id " +
                "LEFT JOIN roles r ON ur.role_id = r.id"
        );
        long totalUsers = ((Number) userStats.getOrDefault("total", 0L)).longValue();
        long totalStudents = ((Number) userStats.getOrDefault("students", 0L)).longValue();
        long totalInstructors = ((Number) userStats.getOrDefault("instructors", 0L)).longValue();

        // 5. Chart revenue stats according to range
        List<MonthlyRevenueDto> monthlyStats = getRevenueStatsForRange(range);

        // 6. Category / Level distribution
        List<CategoryDistributionDto> categoryDistribution = getCategoryDistribution(totalCourses);

        // 7. Top courses
        List<AdminTopCourseDto> topCourses = getTopCourses();

        return new AdminDashboardSummaryResponse(
                totalRevenue,
                pendingOrdersCount,
                totalCourses,
                publishedCourses,
                draftCourses,
                totalUsers,
                totalStudents,
                totalInstructors,
                monthlyStats,
                categoryDistribution,
                topCourses
        );
    }

    private List<MonthlyRevenueDto> getRevenueStatsForRange(String range) {
        if ("today".equalsIgnoreCase(range)) {
            String sql = """
                    SELECT 
                      CASE 
                        WHEN EXTRACT(HOUR FROM o.created_at) < 6 THEN '00h - 06h'
                        WHEN EXTRACT(HOUR FROM o.created_at) < 12 THEN '06h - 12h'
                        WHEN EXTRACT(HOUR FROM o.created_at) < 18 THEN '12h - 18h'
                        ELSE '18h - 24h'
                      END as block_label,
                      COALESCE(SUM(o.total), 0) as revenue,
                      COUNT(o.id) as orders_count
                    FROM orders o
                    WHERE o.status = 'PAID' AND o.created_at >= CURRENT_DATE
                    GROUP BY block_label
                    """;
            Map<String, MonthlyRevenueDto> dbResults = new HashMap<>();
            jdbc.query(sql, rs -> {
                String label = rs.getString("block_label");
                BigDecimal revenue = rs.getBigDecimal("revenue");
                long count = rs.getLong("orders_count");
                dbResults.put(label, new MonthlyRevenueDto(label, revenue, count, false));
            });
            List<String> blocks = List.of("00h - 06h", "06h - 12h", "12h - 18h", "18h - 24h");
            List<MonthlyRevenueDto> list = new ArrayList<>();
            for (String block : blocks) {
                list.add(dbResults.getOrDefault(block, new MonthlyRevenueDto(block, BigDecimal.ZERO, 0L, false)));
            }
            return list;
        }

        if ("7days".equalsIgnoreCase(range)) {
            String sql = """
                    SELECT 
                      TO_CHAR(o.created_at, 'YYYY-MM-DD') as day_key,
                      COALESCE(SUM(o.total), 0) as revenue,
                      COUNT(o.id) as orders_count
                    FROM orders o
                    WHERE o.status = 'PAID' AND o.created_at >= (CURRENT_DATE - INTERVAL '6 days')
                    GROUP BY TO_CHAR(o.created_at, 'YYYY-MM-DD')
                    """;
            Map<String, MonthlyRevenueDto> dbResults = new HashMap<>();
            jdbc.query(sql, rs -> {
                String dayKey = rs.getString("day_key");
                BigDecimal revenue = rs.getBigDecimal("revenue");
                long count = rs.getLong("orders_count");
                dbResults.put(dayKey, new MonthlyRevenueDto(dayKey, revenue, count, false));
            });
            LocalDate now = LocalDate.now();
            List<MonthlyRevenueDto> list = new ArrayList<>();
            for (int i = 6; i >= 0; i--) {
                LocalDate target = now.minusDays(i);
                String dayKey = target.toString();
                String label = target.getDayOfMonth() + "/" + target.getMonthValue();
                boolean isCurrent = (i == 0);
                if (dbResults.containsKey(dayKey)) {
                    MonthlyRevenueDto item = dbResults.get(dayKey);
                    list.add(new MonthlyRevenueDto(label, item.revenue(), item.ordersCount(), isCurrent));
                } else {
                    list.add(new MonthlyRevenueDto(label, BigDecimal.ZERO, 0L, isCurrent));
                }
            }
            return list;
        }

        if ("thisYear".equalsIgnoreCase(range)) {
            String sql = """
                    SELECT 
                      EXTRACT(MONTH FROM o.created_at)::int as month_num,
                      COALESCE(SUM(o.total), 0) as revenue,
                      COUNT(o.id) as orders_count
                    FROM orders o
                    WHERE o.status = 'PAID' AND o.created_at >= DATE_TRUNC('year', CURRENT_DATE)
                    GROUP BY EXTRACT(MONTH FROM o.created_at)
                    """;
            Map<Integer, MonthlyRevenueDto> dbResults = new HashMap<>();
            jdbc.query(sql, rs -> {
                int monthNum = rs.getInt("month_num");
                BigDecimal revenue = rs.getBigDecimal("revenue");
                long count = rs.getLong("orders_count");
                dbResults.put(monthNum, new MonthlyRevenueDto("T" + monthNum, revenue, count, false));
            });
            int currentMonth = LocalDate.now().getMonthValue();
            List<MonthlyRevenueDto> list = new ArrayList<>();
            for (int m = 1; m <= 12; m++) {
                String label = "T" + m;
                boolean isCurrent = (m == currentMonth);
                if (dbResults.containsKey(m)) {
                    MonthlyRevenueDto item = dbResults.get(m);
                    list.add(new MonthlyRevenueDto(label, item.revenue(), item.ordersCount(), isCurrent));
                } else {
                    list.add(new MonthlyRevenueDto(label, BigDecimal.ZERO, 0L, isCurrent));
                }
            }
            return list;
        }

        return getMonthlyRevenueStats();
    }

    private List<MonthlyRevenueDto> getMonthlyRevenueStats() {
        String sql = """
                SELECT 
                  TO_CHAR(o.created_at, 'YYYY-MM') as month_key,
                  TO_CHAR(o.created_at, 'MM') as month_num,
                  COALESCE(SUM(o.total), 0) as revenue,
                  COUNT(o.id) as orders_count
                FROM orders o
                WHERE o.status = 'PAID'
                GROUP BY TO_CHAR(o.created_at, 'YYYY-MM'), TO_CHAR(o.created_at, 'MM')
                ORDER BY month_key ASC
                """;

        Map<String, MonthlyRevenueDto> dbResults = new LinkedHashMap<>();
        jdbc.query(sql, rs -> {
            String monthKey = rs.getString("month_key");
            String monthNum = rs.getString("month_num");
            BigDecimal revenue = rs.getBigDecimal("revenue");
            long count = rs.getLong("orders_count");
            String label = "T" + Integer.parseInt(monthNum);
            dbResults.put(monthKey, new MonthlyRevenueDto(label, revenue, count, false));
        });

        // Ensure 6 recent months are present so the chart is well-proportioned
        LocalDate now = LocalDate.now();
        List<MonthlyRevenueDto> completeList = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate targetDate = now.minusMonths(i);
            String monthKey = String.format("%04d-%02d", targetDate.getYear(), targetDate.getMonthValue());
            String label = "T" + targetDate.getMonthValue();
            boolean isCurrent = (i == 0);

            if (dbResults.containsKey(monthKey)) {
                MonthlyRevenueDto existing = dbResults.get(monthKey);
                completeList.add(new MonthlyRevenueDto(existing.month(), existing.revenue(), existing.ordersCount(), isCurrent));
            } else {
                completeList.add(new MonthlyRevenueDto(label, BigDecimal.ZERO, 0L, isCurrent));
            }
        }

        return completeList;
    }

    private List<CategoryDistributionDto> getCategoryDistribution(long totalCourses) {
        String sql = """
                SELECT level, COUNT(*) as cnt
                FROM courses
                GROUP BY level
                ORDER BY cnt DESC
                """;

        Map<String, String> levelLabels = Map.of(
                "BEGINNER", "Cơ bản / Cho người mới bắt đầu",
                "INTERMEDIATE", "Trung cấp / Ứng dụng thực tế",
                "ADVANCED", "Nâng cao / Chuyên sâu",
                "ALL_LEVELS", "Mọi cấp độ học viên"
        );

        Map<String, String> colors = Map.of(
                "BEGINNER", "bg-[#20B486]",
                "INTERMEDIATE", "bg-[#F5C34D]",
                "ADVANCED", "bg-[#F4866D]",
                "ALL_LEVELS", "bg-[#C77A9A]"
        );

        List<CategoryDistributionDto> list = new ArrayList<>();
        jdbc.query(sql, rs -> {
            String level = rs.getString("level");
            long count = rs.getLong("cnt");
            int percentage = totalCourses > 0 ? (int) Math.round((double) count * 100 / totalCourses) : 0;
            String name = levelLabels.getOrDefault(level, level);
            String color = colors.getOrDefault(level, "bg-[#20B486]");
            list.add(new CategoryDistributionDto(name, count, percentage, color));
        });

        return list;
    }

    private List<AdminTopCourseDto> getTopCourses() {
        String sql = """
                SELECT 
                  c.id,
                  c.title,
                  u.full_name as instructor_name,
                  COUNT(DISTINCT e.id) as students_count,
                  COALESCE(SUM(oi.unit_price), 0) as revenue,
                  COALESCE(AVG(cr.rating), 5.0) as rating
                FROM courses c
                JOIN users u ON c.instructor_id = u.id
                LEFT JOIN enrollments e ON c.id = e.course_id
                LEFT JOIN order_items oi ON c.id = oi.course_id
                LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'PAID'
                LEFT JOIN course_reviews cr ON c.id = cr.course_id AND cr.status = 'PUBLISHED'
                GROUP BY c.id, c.title, u.full_name
                ORDER BY students_count DESC, revenue DESC
                LIMIT 5
                """;

        return jdbc.query(sql, (rs, rowNum) -> new AdminTopCourseDto(
                UUID.fromString(rs.getString("id")),
                rs.getString("title"),
                rs.getString("instructor_name"),
                rs.getLong("students_count"),
                rs.getBigDecimal("revenue"),
                Math.round(rs.getDouble("rating") * 10.0) / 10.0
        ));
    }

    public Page<AdminUserResponse> listUsers(int page, int size, String keyword, String role) {
        StringBuilder countSql = new StringBuilder("""
                SELECT COUNT(DISTINCT u.id)
                FROM users u
                LEFT JOIN user_roles ur ON u.id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.id
                WHERE 1=1
                """);

        StringBuilder dataSql = new StringBuilder("""
                SELECT 
                  u.id,
                  u.full_name,
                  u.email,
                  u.status,
                  u.created_at,
                  p.avatar_key,
                  COALESCE(e_count.cnt, 0) as enrolled_count,
                  COALESCE(t_count.cnt, 0) as teaching_count,
                  STRING_AGG(r.name, ',') as roles
                FROM users u
                LEFT JOIN profiles p ON u.id = p.user_id
                LEFT JOIN user_roles ur ON u.id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.id
                LEFT JOIN (SELECT student_id, COUNT(*) as cnt FROM enrollments GROUP BY student_id) e_count ON u.id = e_count.student_id
                LEFT JOIN (SELECT instructor_id, COUNT(*) as cnt FROM courses GROUP BY instructor_id) t_count ON u.id = t_count.instructor_id
                WHERE 1=1
                """);

        List<Object> params = new ArrayList<>();
        if (keyword != null && !keyword.isBlank()) {
            String pattern = "%" + keyword.trim().toLowerCase() + "%";
            countSql.append(" AND (LOWER(u.full_name) LIKE ? OR LOWER(u.email) LIKE ?)");
            dataSql.append(" AND (LOWER(u.full_name) LIKE ? OR LOWER(u.email) LIKE ?)");
            params.add(pattern);
            params.add(pattern);
        }

        if (role != null && !role.isBlank() && !"ALL".equalsIgnoreCase(role)) {
            countSql.append(" AND r.name = ?");
            dataSql.append(" AND r.name = ?");
            params.add(role.trim().toUpperCase());
        }

        Long totalCount = jdbc.queryForObject(countSql.toString(), Long.class, params.toArray());
        long totalElements = totalCount != null ? totalCount : 0L;

        dataSql.append("""
                 GROUP BY u.id, u.full_name, u.email, u.status, u.created_at, p.avatar_key, e_count.cnt, t_count.cnt
                 ORDER BY u.created_at DESC
                 LIMIT ? OFFSET ?
                """);

        List<Object> queryParams = new ArrayList<>(params);
        queryParams.add(size);
        queryParams.add(page * size);

        List<AdminUserResponse> users = jdbc.query(dataSql.toString(), (rs, rowNum) -> {
            UUID id = UUID.fromString(rs.getString("id"));
            String fullName = rs.getString("full_name");
            String email = rs.getString("email");
            String status = rs.getString("status");
            Timestamp createdAtTs = rs.getTimestamp("created_at");
            Instant createdAt = createdAtTs != null ? createdAtTs.toInstant() : Instant.now();
            String avatarKey = rs.getString("avatar_key");
            String avatarUrl = avatarKey != null && !avatarKey.isBlank() ? storageService.getPublicUrl(avatarKey) : null;
            long enrolledCount = rs.getLong("enrolled_count");
            long teachingCount = rs.getLong("teaching_count");
            String rawRoles = rs.getString("roles");
            List<String> roleList = rawRoles != null && !rawRoles.isBlank()
                    ? Arrays.asList(rawRoles.split(","))
                    : Collections.emptyList();

            return new AdminUserResponse(
                    id,
                    fullName,
                    email,
                    status,
                    roleList,
                    createdAt,
                    enrolledCount,
                    teachingCount,
                    avatarUrl
            );
        }, queryParams.toArray());

        return new PageImpl<>(users, PageRequest.of(page, size), totalElements);
    }

    public AdminAnalyticsResponse getAnalytics() {
        // Payment methods breakdown
        String paymentSql = """
                SELECT 
                  p.provider,
                  COUNT(p.id) as txn_count,
                  COALESCE(SUM(p.amount_minor_units), 0) as total_amount
                FROM payments p
                JOIN orders o ON p.order_id = o.id
                WHERE p.status = 'PAID' OR o.status = 'PAID'
                GROUP BY p.provider
                ORDER BY total_amount DESC
                """;

        Map<String, String> providerLabels = Map.of(
                "VIETQR", "Chuyển khoản Ngân hàng (VietQR)",
                "MOMO", "Ví điện tử MoMo",
                "VNPAY", "Cổng thanh toán VNPay",
                "STRIPE", "Thẻ quốc tế Stripe",
                "SEPAY", "Chuyển khoản SePay"
        );

        Map<String, String> providerColors = Map.of(
                "VIETQR", "bg-[#20B486]",
                "MOMO", "bg-[#F5C34D]",
                "VNPAY", "bg-[#F4866D]",
                "STRIPE", "bg-[#C77A9A]",
                "SEPAY", "bg-[#2563EB]"
        );

        List<PaymentMethodStatDto> paymentMethods = new ArrayList<>();
        BigDecimal totalPaymentsSum = BigDecimal.ZERO;

        List<Map<String, Object>> rows = jdbc.queryForList(paymentSql);
        for (Map<String, Object> row : rows) {
            BigDecimal amt = new BigDecimal(row.get("total_amount").toString());
            totalPaymentsSum = totalPaymentsSum.add(amt);
        }

        for (Map<String, Object> row : rows) {
            String provider = (String) row.get("provider");
            long count = ((Number) row.get("txn_count")).longValue();
            BigDecimal amount = new BigDecimal(row.get("total_amount").toString());
            int percentage = totalPaymentsSum.compareTo(BigDecimal.ZERO) > 0
                    ? amount.multiply(BigDecimal.valueOf(100)).divide(totalPaymentsSum, 0, RoundingMode.HALF_UP).intValue()
                    : 0;

            String label = providerLabels.getOrDefault(provider, provider);
            String color = providerColors.getOrDefault(provider, "bg-[#20B486]");

            paymentMethods.add(new PaymentMethodStatDto(provider, label, count, amount, percentage, color));
        }

        // Learning stats
        Long completedLessons = jdbc.queryForObject(
                "SELECT COUNT(*) FROM learning_progress",
                Long.class
        );
        long completedLessonsCount = completedLessons != null ? completedLessons : 0L;

        Long enrollments = jdbc.queryForObject(
                "SELECT COUNT(*) FROM enrollments",
                Long.class
        );
        long totalEnrollmentsCount = enrollments != null ? enrollments : 0L;

        Long totalLessons = jdbc.queryForObject(
                "SELECT COUNT(*) FROM lessons",
                Long.class
        );
        long lessonsCount = totalLessons != null && totalLessons > 0 ? totalLessons : 1L;

        double courseCompletionRate = 0.0;
        if (totalEnrollmentsCount > 0) {
            double expectedTotal = (double) (lessonsCount * totalEnrollmentsCount);
            courseCompletionRate = Math.round(((double) completedLessonsCount / expectedTotal * 100.0) * 10.0) / 10.0;
        }

        Double avgQuiz = jdbc.queryForObject(
                "SELECT COALESCE(AVG(score), 8.5) FROM quiz_attempts",
                Double.class
        );
        double averageQuizScore = avgQuiz != null ? Math.round(avgQuiz * 10.0) / 10.0 : 8.5;

        Map<String, Object> reviewStats = jdbc.queryForMap(
                "SELECT COUNT(*) as total_reviews, COALESCE(AVG(rating), 5.0) as avg_rating FROM course_reviews"
        );
        long totalReviewsCount = ((Number) reviewStats.getOrDefault("total_reviews", 0L)).longValue();
        double averageCourseRating = Math.round(((Number) reviewStats.getOrDefault("avg_rating", 5.0)).doubleValue() * 10.0) / 10.0;

        return new AdminAnalyticsResponse(
                paymentMethods,
                completedLessonsCount,
                courseCompletionRate,
                averageQuizScore,
                averageCourseRating,
                totalReviewsCount,
                totalEnrollmentsCount
        );
    }
}
