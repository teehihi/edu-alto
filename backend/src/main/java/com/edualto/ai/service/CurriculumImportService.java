package com.edualto.ai.service;

import com.edualto.ai.config.AiProperties;
import com.edualto.ai.domain.CurriculumImportJob;
import com.edualto.ai.dto.CurriculumApplyRequest;
import com.edualto.ai.dto.CurriculumApplyResponse;
import com.edualto.ai.dto.CurriculumChapterDto;
import com.edualto.ai.dto.CurriculumImportJobResponse;
import com.edualto.ai.dto.CurriculumImportPreviewDto;
import com.edualto.ai.dto.CurriculumLessonDto;
import com.edualto.ai.infrastructure.DocumentTextExtractor;
import com.edualto.ai.repository.CurriculumImportJobRepository;
import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.LessonType;
import com.edualto.course.dto.CreateLessonRequest;
import com.edualto.course.dto.CreateSectionRequest;
import com.edualto.course.dto.SectionResponse;
import com.edualto.course.service.CourseStructureService;
import com.edualto.user.domain.User;
import com.edualto.user.repository.UserRepository;
import jakarta.validation.Validator;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.HtmlUtils;
import tools.jackson.databind.ObjectMapper;

@Service
public class CurriculumImportService {

    private static final Set<String> EDUCATION_LEVELS = Set.of(
            "PRIMARY", "LOWER_SECONDARY", "UPPER_SECONDARY", "HIGHER_EDUCATION", "VOCATIONAL", "OTHER"
    );
    private final CurriculumImportJobRepository jobs;
    private final CourseStructureService courseStructure;
    private final UserRepository users;
    private final DocumentTextExtractor extractor;
    private final CurriculumImportWorker worker;
    private final AiProperties properties;
    private final ObjectMapper mapper;
    private final Validator validator;
    private final TransactionTemplate transactions;
    private final EducationPolicyService educationPolicy;

    public CurriculumImportService(
            CurriculumImportJobRepository jobs,
            CourseStructureService courseStructure,
            UserRepository users,
            DocumentTextExtractor extractor,
            CurriculumImportWorker worker,
            AiProperties properties,
            ObjectMapper mapper,
            Validator validator,
            PlatformTransactionManager transactionManager,
            EducationPolicyService educationPolicy
    ) {
        this.jobs = jobs;
        this.courseStructure = courseStructure;
        this.users = users;
        this.extractor = extractor;
        this.worker = worker;
        this.properties = properties;
        this.mapper = mapper;
        this.validator = validator;
        this.transactions = new TransactionTemplate(transactionManager);
        this.educationPolicy = educationPolicy;
    }

    public CurriculumImportJobResponse create(
            UUID instructorId,
            UUID courseId,
            MultipartFile file,
            String educationLevel,
            String subject,
            String grade,
            String curriculum,
            String schoolYear
    ) {
        checkAccess(instructorId, courseId);
        if (!properties.enabled() || properties.apiKey() == null || properties.apiKey().isBlank()) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "AI_NOT_CONFIGURED",
                    "Tính năng nhập bằng AI chưa được cấu hình. Hãy liên hệ quản trị viên");
        }
        if (educationLevel == null || !EDUCATION_LEVELS.contains(educationLevel)) {
            throw invalid("Hãy chọn cấp học hợp lệ");
        }
        String validatedSubject = profileValue(subject, 160, true, "môn học");
        String validatedGrade = profileValue(grade, 32, false, "lớp hoặc khối");
        String validatedCurriculum = profileValue(curriculum, 255, false, "chương trình hoặc tài liệu tham khảo");
        String validatedSchoolYear = profileValue(schoolYear, 9, true, "năm học");
        if (!validatedSchoolYear.matches("\\d{4}-\\d{4}")
                || Integer.parseInt(validatedSchoolYear.substring(5)) != Integer.parseInt(validatedSchoolYear.substring(0, 4)) + 1) {
            throw invalid("Năm học cần có định dạng như 2026-2027");
        }
        educationPolicy.select(educationLevel, validatedSubject, validatedGrade, validatedSchoolYear);
        worker.reserve();
        boolean submitted = false;
        try {
            String sourceText = extractor.extract(file);
            String profile = mapper.writeValueAsString(Map.of(
                    "educationLevel", educationLevel,
                    "subject", validatedSubject,
                    "grade", validatedGrade,
                    "curriculum", validatedCurriculum,
                    "schoolYear", validatedSchoolYear
            ));
            CurriculumImportJob job = transactions.execute(status -> jobs.save(new CurriculumImportJob(courseId, instructorId)));
            if (job == null) throw new IllegalStateException("Import transaction did not create a job");
            worker.submit(job.getId(), sourceText, profile);
            submitted = true;
            return response(job);
        } finally {
            if (!submitted) worker.releaseReservation();
        }
    }

    @Transactional(readOnly = true)
    public CurriculumImportJobResponse get(UUID instructorId, UUID courseId, UUID jobId) {
        checkAccess(instructorId, courseId);
        CurriculumImportJob job = jobs.findByIdAndCourseIdAndInstructorId(jobId, courseId, instructorId)
                .orElseThrow(this::notFound);
        return response(job);
    }

    @Transactional
    public CurriculumApplyResponse apply(UUID instructorId, UUID courseId, UUID jobId, CurriculumApplyRequest request) {
        checkAccess(instructorId, courseId);
        CurriculumImportJob job = jobs.findOwnedForUpdate(jobId, courseId, instructorId).orElseThrow(this::notFound);
        if (job.getStatus() == CurriculumImportJob.Status.APPLIED) {
            return new CurriculumApplyResponse(job.getChapterCount(), job.getLessonCount());
        }
        if (job.getStatus() != CurriculumImportJob.Status.COMPLETED) {
            throw new BusinessException(HttpStatus.CONFLICT, "CURRICULUM_IMPORT_NOT_READY",
                    "Tài liệu chưa sẵn sàng để thêm vào giáo trình");
        }
        validateApply(request);
        int lessonCount = 0;
        for (CurriculumChapterDto chapter : request.chapters()) {
            SectionResponse section = courseStructure.createSection(instructorId, courseId,
                    new CreateSectionRequest(chapter.title().trim(), nullableTrim(chapter.introduction()),
                            safeContent(chapter.description()), null, null));
            for (CurriculumLessonDto lesson : chapter.lessons()) {
                courseStructure.createLesson(instructorId, courseId, section.id(), new CreateLessonRequest(
                        lesson.title().trim(), null, nullableTrim(lesson.introduction()), safeContent(lesson.description()),
                        LessonType.TEXT, lesson.durationMinutes() == null ? null : lesson.durationMinutes() * 60,
                        false, null, LessonStatus.DRAFT, lesson.objectives()
                ));
                lessonCount++;
            }
        }
        job.apply(request.chapters().size(), lessonCount);
        jobs.save(job);
        return new CurriculumApplyResponse(request.chapters().size(), lessonCount);
    }

    private void validateApply(CurriculumApplyRequest request) {
        if (request == null || !validator.validate(request).isEmpty()) {
            throw invalid("Nội dung nhập chưa hợp lệ. Hãy kiểm tra tiêu đề, số chương, số bài và thời lượng");
        }
        int lessonCount = 0;
        long characterCount = 0;
        for (CurriculumChapterDto chapter : request.chapters()) {
            lessonCount += chapter.lessons().size();
            characterCount += length(chapter.title()) + length(chapter.introduction()) + length(chapter.description());
            for (CurriculumLessonDto lesson : chapter.lessons()) {
                characterCount += length(lesson.title()) + length(lesson.introduction()) + length(lesson.description());
                for (String objective : lesson.objectives()) characterCount += length(objective);
            }
        }
        if (lessonCount > 100 || characterCount > 100000) {
            throw invalid("Mỗi lần nhập chỉ hỗ trợ tối đa 100 bài học và 100.000 ký tự nội dung");
        }
    }

    private void checkAccess(UUID instructorId, UUID courseId) {
        courseStructure.getCourseStructure(instructorId, courseId);
        User user = users.findById(instructorId).orElseThrow(() -> new BusinessException(
                HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));
        if (user.getEmailVerifiedAt() == null) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "EMAIL_VERIFICATION_REQUIRED",
                    "Hãy xác minh email trước khi sử dụng tính năng nhập giáo trình");
        }
    }

    private CurriculumImportJobResponse response(CurriculumImportJob job) {
        CurriculumImportPreviewDto preview = job.getPreviewJson() == null ? null
                : mapper.readValue(job.getPreviewJson(), CurriculumImportPreviewDto.class);
        return new CurriculumImportJobResponse(job.getId(), job.getStatus().name(), preview, job.getMessage());
    }

    private String profileValue(String value, int maxLength, boolean required, String label) {
        String normalized = value == null ? "" : value.trim();
        if ((required && normalized.isEmpty()) || normalized.length() > maxLength) {
            throw invalid("Thông tin " + label + " không hợp lệ hoặc vượt quá giới hạn " + maxLength + " ký tự");
        }
        return normalized;
    }

    private int length(String value) { return value == null ? 0 : value.length(); }

    private String nullableTrim(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String safeContent(String value) {
        String text = nullableTrim(value);
        if (text == null) return null;
        return "<p>" + HtmlUtils.htmlEscape(text).replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>") + "</p>";
    }

    private BusinessException notFound() {
        return new BusinessException(HttpStatus.NOT_FOUND, "CURRICULUM_IMPORT_NOT_FOUND", "Không tìm thấy phiên nhập tài liệu");
    }

    private BusinessException invalid(String message) {
        return new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_CURRICULUM_IMPORT", message);
    }
}
