package com.edualto.course;

import com.edualto.auth.domain.EmailOtp;
import com.edualto.auth.domain.OtpPurpose;
import com.edualto.auth.repository.EmailOtpRepository;
import com.edualto.auth.repository.RefreshTokenRepository;
import com.edualto.common.config.RedisCacheConfig;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.Lesson;
import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.LessonType;
import com.edualto.course.domain.Section;
import com.edualto.course.dto.CourseCurriculumResponse;
import com.edualto.course.dto.CourseDetailResponse;
import com.edualto.course.repository.CourseRepository;
import com.edualto.course.repository.LessonRepository;
import com.edualto.course.repository.SectionRepository;
import com.edualto.course.service.CourseService;
import com.edualto.course.service.PublicCourseCurriculumService;
import com.edualto.profile.repository.InstructorProfileRepository;
import com.edualto.profile.repository.ProfileRepository;
import com.edualto.profile.repository.StudentProfileRepository;
import com.edualto.storage.service.StorageService;
import com.edualto.storage.dto.ObjectMetadata;
import com.edualto.storage.dto.PresignedUploadUrl;
import com.edualto.user.domain.User;
import com.edualto.user.repository.UserRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import com.edualto.AbstractIntegrationTest;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CourseStructureIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private StudentProfileRepository studentProfileRepository;

    @Autowired
    private InstructorProfileRepository instructorProfileRepository;

    @Autowired
    private EmailOtpRepository emailOtpRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private SectionRepository sectionRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private PublicCourseCurriculumService publicCourseCurriculumService;

    @Autowired
    private CourseService courseService;

    @Autowired
    private CacheManager cacheManager;

    @MockitoBean
    private StorageService storageService;

    @TestConfiguration
    static class InMemoryCacheTestConfig {

        @Bean
        @Primary
        CacheManager testCacheManager() {
            return new ConcurrentMapCacheManager(
                    RedisCacheConfig.CACHE_COURSES_CATALOG,
                    RedisCacheConfig.CACHE_COURSES_DETAIL,
                    RedisCacheConfig.CACHE_COURSES_CURRICULUM,
                    RedisCacheConfig.CACHE_AUTH_SESSIONS,
                    RedisCacheConfig.CACHE_AUTH_REFRESH_TOKENS,
                    RedisCacheConfig.CACHE_ROLE_PERMISSIONS
            );
        }
    }

    @BeforeEach
    void setUp() {
        for (String cacheName : cacheManager.getCacheNames()) {
            Cache cache = cacheManager.getCache(cacheName);
            if (cache != null) {
                cache.clear();
            }
        }
        lessonRepository.deleteAll();
        sectionRepository.deleteAll();
        courseRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        emailOtpRepository.deleteAll();
        studentProfileRepository.deleteAll();
        instructorProfileRepository.deleteAll();
        profileRepository.deleteAll();
        userRepository.deleteAll();
    }

    private String registerAndLogin(String email, String role, String fullName) throws Exception {
        Map<String, Object> registerRequest = new HashMap<>();
        registerRequest.put("email", email);
        registerRequest.put("password", "Pass123456");
        registerRequest.put("confirmPassword", "Pass123456");
        registerRequest.put("fullName", fullName);
        registerRequest.put("role", role);
        if ("INSTRUCTOR".equals(role)) {
            registerRequest.put("expertise", "Công nghệ thông tin");
            registerRequest.put("bio", "Giảng viên lâu năm");
        }

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk());

        Map<String, String> verifyRequest = Map.of("email", email, "otp", "123456");
        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isOk());

        Map<String, String> loginRequest = Map.of("email", email, "password", "Pass123456");
        ResultActions loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk());

        JsonNode jsonNode = objectMapper.readTree(loginResult.andReturn().getResponse().getContentAsString());
        return jsonNode.get("data").get("accessToken").asText();
    }

    private Course createTestCourse(UUID instructorId, String title, String slug) {
        Course course = new Course(
                null,
                instructorId,
                title,
                slug,
                "Tagline",
                "Description",
                BigDecimal.valueOf(299000),
                BigDecimal.valueOf(499000),
                CourseLevel.ALL_LEVELS,
                "vi",
                null
        );
        return courseRepository.save(course);
    }

    @Test
    @DisplayName("End-to-End: Instructor tạo section, tạo lesson, reorder và load course structure")
    void fullCourseStructureFlow_success() throws Exception {
        String token = registerAndLogin("teacher@edualto.com", "INSTRUCTOR", "Giảng viên A");
        User user = userRepository.findByEmail("teacher@edualto.com").orElseThrow();
        Course course = createTestCourse(user.getId(), "Khóa học AI 2026", "khoa-hoc-ai-2026");

        // 1. Tạo Section 1
        Map<String, String> sec1Req = Map.of("title", "Chương 1: Tổng quan AI", "description", "Mô tả chương 1");
        ResultActions sec1Res = mockMvc.perform(post("/api/v1/instructor/courses/" + course.getId() + "/sections")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sec1Req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Chương 1: Tổng quan AI"))
                .andExpect(jsonPath("$.data.position").value(1));

        String sec1Id = objectMapper.readTree(sec1Res.andReturn().getResponse().getContentAsString()).get("data").get("id").asText();

        // 2. Tạo Section 2
        Map<String, String> sec2Req = Map.of("title", "Chương 2: Prompt Engineering", "description", "Mô tả chương 2");
        ResultActions sec2Res = mockMvc.perform(post("/api/v1/instructor/courses/" + course.getId() + "/sections")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sec2Req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.position").value(2));

        String sec2Id = objectMapper.readTree(sec2Res.andReturn().getResponse().getContentAsString()).get("data").get("id").asText();

        // 3. Tạo Lesson 1 trong Section 1
        Map<String, Object> les1Req = new HashMap<>();
        les1Req.put("title", "Bài 1: Giới thiệu AI");
        les1Req.put("content", "Nội dung bài học 1");
        les1Req.put("lessonType", "TEXT");
        les1Req.put("durationSeconds", 420);
        les1Req.put("isPreview", true);

        ResultActions les1Res = mockMvc.perform(post("/api/v1/instructor/courses/" + course.getId() + "/sections/" + sec1Id + "/lessons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(les1Req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Bài 1: Giới thiệu AI"))
                .andExpect(jsonPath("$.data.position").value(1))
                .andExpect(jsonPath("$.data.isPreview").value(true));

        String les1Id = objectMapper.readTree(les1Res.andReturn().getResponse().getContentAsString()).get("data").get("id").asText();

        // 4. Tạo Lesson 2 trong Section 1
        Map<String, Object> les2Req = new HashMap<>();
        les2Req.put("title", "Bài 2: Các mô hình LLM");
        les2Req.put("lessonType", "VIDEO");
        les2Req.put("durationSeconds", 900);
        les2Req.put("isPreview", false);

        ResultActions les2Res = mockMvc.perform(post("/api/v1/instructor/courses/" + course.getId() + "/sections/" + sec1Id + "/lessons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(les2Req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.position").value(2));

        String les2Id = objectMapper.readTree(les2Res.andReturn().getResponse().getContentAsString()).get("data").get("id").asText();

        // 5. Reorder Lessons trong Section 1 (Đảo vị trí Bài 2 lên trước Bài 1)
        Map<String, Object> reorderLessonsReq = Map.of("items", List.of(
                Map.of("id", les2Id, "position", 1),
                Map.of("id", les1Id, "position", 2)
        ));

        mockMvc.perform(put("/api/v1/instructor/courses/" + course.getId() + "/sections/" + sec1Id + "/lessons/reorder")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reorderLessonsReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].id").value(les2Id))
                .andExpect(jsonPath("$.data[0].position").value(1));

        // 6. Reorder Sections (Đảo Chương 2 lên trước Chương 1)
        Map<String, Object> reorderSecReq = Map.of("items", List.of(
                Map.of("id", sec2Id, "position", 1),
                Map.of("id", sec1Id, "position", 2)
        ));

        mockMvc.perform(put("/api/v1/instructor/courses/" + course.getId() + "/sections/reorder")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reorderSecReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].id").value(sec2Id))
                .andExpect(jsonPath("$.data[0].position").value(1));

        // 7. Load toàn bộ Course Structure
        mockMvc.perform(get("/api/v1/instructor/courses/" + course.getId() + "/structure")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalSections").value(2))
                .andExpect(jsonPath("$.data.totalLessons").value(2))
                .andExpect(jsonPath("$.data.totalDurationSeconds").value(1320))
                .andExpect(jsonPath("$.data.sections", hasSize(2)))
                .andExpect(jsonPath("$.data.sections[0].id").value(sec2Id))
                .andExpect(jsonPath("$.data.sections[1].id").value(sec1Id))
                .andExpect(jsonPath("$.data.sections[1].lessons", hasSize(2)));

        // 8. Delete Section 2
        mockMvc.perform(delete("/api/v1/instructor/courses/" + course.getId() + "/sections/" + sec2Id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // Kiểm tra sau khi xóa Section 2: chỉ còn 1 Section và position tự động normalize về 1
        mockMvc.perform(get("/api/v1/instructor/courses/" + course.getId() + "/sections")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id").value(sec1Id))
                .andExpect(jsonPath("$.data[0].position").value(1));
    }

    @Test
    @DisplayName("Bảo mật: Giảng viên B không thể thao tác trên Section/Lesson của Giảng viên A (403)")
    void security_otherInstructorCannotModifySections() throws Exception {
        String tokenA = registerAndLogin("teachera@edualto.com", "INSTRUCTOR", "Giảng viên A");
        String tokenB = registerAndLogin("teacherb@edualto.com", "INSTRUCTOR", "Giảng viên B");

        User userA = userRepository.findByEmail("teachera@edualto.com").orElseThrow();
        Course courseA = createTestCourse(userA.getId(), "Khóa học của A", "khoa-hoc-cua-a");

        // Giảng viên B cố gắng tạo Section trên Course của A -> Bị chặn 403
        Map<String, String> secReq = Map.of("title", "Hack Section", "description", "Mô tả");
        mockMvc.perform(post("/api/v1/instructor/courses/" + courseA.getId() + "/sections")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(secReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Bảo mật: Học viên (STUDENT) không có quyền truy cập endpoint quản lý chương trình học (403)")
    void security_studentCannotAccessInstructorEndpoints() throws Exception {
        String studentToken = registerAndLogin("student@edualto.com", "STUDENT", "Học viên");
        UUID dummyCourseId = UUID.randomUUID();

        Map<String, String> secReq = Map.of("title", "Section", "description", "Desc");
        mockMvc.perform(post("/api/v1/instructor/courses/" + dummyCourseId + "/sections")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(secReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Giảng viên tải video qua URL ký sẵn và chỉ xác nhận được object hợp lệ của bài học")
    void instructorVideoUploadRequiresOwnershipAndVerifiedStorageObject() throws Exception {
        String token = registerAndLogin("video-teacher@edualto.com", "INSTRUCTOR", "Giảng viên video");
        String otherToken = registerAndLogin("video-other@edualto.com", "INSTRUCTOR", "Giảng viên khác");
        User teacher = userRepository.findByEmail("video-teacher@edualto.com").orElseThrow();
        Course course = createTestCourse(teacher.getId(), "Khóa học video", "khoa-hoc-video-upload");
        Section section = sectionRepository.save(Section.create(course.getId(), "Chương 1", null, 1));
        String previousKey = "course-videos/" + course.getId() + "/" + UUID.randomUUID() + "/" + UUID.randomUUID() + ".mp4";
        Lesson lesson = lessonRepository.save(Lesson.create(
                section.getId(), "Video 1", "video-1", null, null,
                LessonType.VIDEO, 1, 60, false, previousKey, LessonStatus.DRAFT));
        String basePath = "/api/v1/instructor/courses/" + course.getId() + "/sections/"
                + section.getId() + "/lessons/" + lesson.getId();
        when(storageService.generatePresignedUploadUrl(anyString(), eq("video/mp4"), eq(1024L), any(Duration.class),
                eq("private, no-store")))
                .thenAnswer(invocation -> new PresignedUploadUrl("https://r2.test/signed-put",
                        invocation.getArgument(0), Instant.now().plusSeconds(900)));

        mockMvc.perform(post(basePath + "/video-upload-url")
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("contentType", "video/mp4", "contentLength", 1024))))
                .andExpect(status().isForbidden());

        ResultActions upload = mockMvc.perform(post(basePath + "/video-upload-url")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("contentType", "video/mp4", "contentLength", 1024))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.uploadUrl").value("https://r2.test/signed-put"));
        String objectKey = objectMapper.readTree(upload.andReturn().getResponse().getContentAsString())
                .get("data").get("objectKey").asText();
        assertThat(objectKey).startsWith("course-videos/" + course.getId() + "/" + lesson.getId() + "/");

        mockMvc.perform(post(basePath + "/video-upload-complete")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("objectKey", objectKey))))
                .andExpect(status().isBadRequest());

        when(storageService.getObjectMetadata(objectKey)).thenReturn(new ObjectMetadata("video/mp4", 1024L, "etag"));
        mockMvc.perform(post(basePath + "/video-upload-complete")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("objectKey", objectKey))))
                .andExpect(status().isOk());
        assertThat(lessonRepository.findById(lesson.getId()).orElseThrow().getMediaKey()).isEqualTo(objectKey);
        verify(storageService).deleteObject(previousKey);

        mockMvc.perform(put(basePath)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("title", "Video cập nhật", "lessonType", "VIDEO"))))
                .andExpect(status().isOk());
        assertThat(lessonRepository.findById(lesson.getId()).orElseThrow().getMediaKey()).isEqualTo(objectKey);

        mockMvc.perform(delete(basePath)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        verify(storageService).deleteObject(objectKey);
    }

    @Test
    @DisplayName("Cache giáo trình và chi tiết khóa học được xóa ngay khi thêm hoặc sắp xếp lại bài học")
    void publicCurriculumCacheEvictedImmediatelyOnLessonCreateAndReorder() throws Exception {
        String token = registerAndLogin("cache-teacher@edualto.com", "INSTRUCTOR", "Giảng viên Cache");
        User teacher = userRepository.findByEmail("cache-teacher@edualto.com").orElseThrow();
        Course course = createTestCourse(teacher.getId(), "Khóa học Cache", "khoa-hoc-cache");
        course.publish();
        course = courseRepository.save(course);

        Section section = sectionRepository.save(Section.create(course.getId(), "Chương 1", null, 1));
        Lesson lesson1 = lessonRepository.save(Lesson.create(
                section.getId(),
                "Bài 1: Mở đầu",
                "bai-1-mo-dau",
                null,
                "Nội dung bài 1",
                LessonType.TEXT,
                1,
                300,
                true,
                null,
                LessonStatus.PUBLISHED
        ));

        // Populate curriculum and detail caches
        CourseCurriculumResponse initialCurriculum = publicCourseCurriculumService.getCurriculum(course.getSlug());
        CourseDetailResponse initialDetail = courseService.getPublicCourseBySlug(course.getSlug());
        assertThat(initialCurriculum.sections()).hasSize(1);
        assertThat(initialCurriculum.sections().getFirst().lessons()).hasSize(1);
        assertThat(initialDetail.slug()).isEqualTo(course.getSlug());

        Cache curriculumCache = cacheManager.getCache(RedisCacheConfig.CACHE_COURSES_CURRICULUM);
        Cache detailCache = cacheManager.getCache(RedisCacheConfig.CACHE_COURSES_DETAIL);
        assertThat(curriculumCache).isNotNull();
        assertThat(detailCache).isNotNull();
        assertThat(curriculumCache.get(course.getSlug())).isNotNull();
        assertThat(detailCache.get(course.getSlug())).isNotNull();

        // Create a second published lesson via endpoint -> must evict both caches
        Map<String, Object> createLessonReq = new HashMap<>();
        createLessonReq.put("title", "Bài 2: Thực hành");
        createLessonReq.put("content", "Nội dung bài 2");
        createLessonReq.put("lessonType", "TEXT");
        createLessonReq.put("durationSeconds", 600);
        createLessonReq.put("isPreview", false);
        createLessonReq.put("status", "PUBLISHED");

        ResultActions createRes = mockMvc.perform(post("/api/v1/instructor/courses/" + course.getId()
                        + "/sections/" + section.getId() + "/lessons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createLessonReq)))
                .andExpect(status().isOk());

        String lesson2Id = objectMapper.readTree(createRes.andReturn().getResponse().getContentAsString())
                .get("data").get("id").asText();

        assertThat(curriculumCache.get(course.getSlug())).isNull();
        assertThat(detailCache.get(course.getSlug())).isNull();

        CourseCurriculumResponse afterCreate = publicCourseCurriculumService.getCurriculum(course.getSlug());
        assertThat(afterCreate.sections().getFirst().lessons()).hasSize(2);
        assertThat(afterCreate.sections().getFirst().lessons().get(0).id()).isEqualTo(lesson1.getId());
        assertThat(afterCreate.sections().getFirst().lessons().get(1).id()).isEqualTo(UUID.fromString(lesson2Id));

        // Populate detail cache again and reorder lessons -> must evict both caches and reflect new order
        courseService.getPublicCourseBySlug(course.getSlug());
        assertThat(curriculumCache.get(course.getSlug())).isNotNull();
        assertThat(detailCache.get(course.getSlug())).isNotNull();

        Map<String, Object> reorderReq = Map.of("items", List.of(
                Map.of("id", lesson2Id, "position", 1),
                Map.of("id", lesson1.getId().toString(), "position", 2)
        ));

        mockMvc.perform(put("/api/v1/instructor/courses/" + course.getId()
                        + "/sections/" + section.getId() + "/lessons/reorder")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reorderReq)))
                .andExpect(status().isOk());

        assertThat(curriculumCache.get(course.getSlug())).isNull();
        assertThat(detailCache.get(course.getSlug())).isNull();

        CourseCurriculumResponse afterReorder = publicCourseCurriculumService.getCurriculum(course.getSlug());
        assertThat(afterReorder.sections().getFirst().lessons()).hasSize(2);
        assertThat(afterReorder.sections().getFirst().lessons().get(0).id()).isEqualTo(UUID.fromString(lesson2Id));
        assertThat(afterReorder.sections().getFirst().lessons().get(1).id()).isEqualTo(lesson1.getId());
    }
}
