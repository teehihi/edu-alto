package com.edualto.quiz.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.certificate.service.CertificateService;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.domain.Lesson;
import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.LessonType;
import com.edualto.course.domain.Section;
import com.edualto.course.repository.CourseRepository;
import com.edualto.course.repository.LessonRepository;
import com.edualto.course.repository.SectionRepository;
import com.edualto.course.service.CourseLearningAccessService;
import com.edualto.enrollment.service.EnrollmentService;
import com.edualto.learning.repository.LearningProgressRepository;
import com.edualto.quiz.domain.Quiz;
import com.edualto.quiz.domain.QuizAttempt;
import com.edualto.quiz.domain.QuizAttemptAnswer;
import com.edualto.quiz.domain.QuizOption;
import com.edualto.quiz.domain.QuizQuestion;
import com.edualto.quiz.dto.CreateQuizRequest;
import com.edualto.quiz.dto.QuizAnswerRequest;
import com.edualto.quiz.dto.QuizAttemptResponse;
import com.edualto.quiz.dto.QuizOptionRequest;
import com.edualto.quiz.dto.QuizQuestionRequest;
import com.edualto.quiz.dto.QuizResponse;
import com.edualto.quiz.dto.SubmitQuizRequest;
import com.edualto.quiz.repository.QuizAttemptAnswerRepository;
import com.edualto.quiz.repository.QuizAttemptRepository;
import com.edualto.quiz.repository.QuizRepository;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class QuizService {
    private final QuizRepository quizzes;
    private final QuizAttemptRepository attempts;
    private final QuizAttemptAnswerRepository attemptAnswers;
    private final LessonRepository lessons;
    private final SectionRepository sections;
    private final CourseRepository courses;
    private final UserRepository users;
    private final CourseLearningAccessService learningAccess;
    private final EnrollmentService enrollments;
    private final LearningProgressRepository progress;
    private final CertificateService certificates;

    public QuizService(QuizRepository quizzes, QuizAttemptRepository attempts,
            QuizAttemptAnswerRepository attemptAnswers, LessonRepository lessons,
            SectionRepository sections, CourseRepository courses, UserRepository users,
            CourseLearningAccessService learningAccess, EnrollmentService enrollments,
            LearningProgressRepository progress, CertificateService certificates) {
        this.quizzes = quizzes;
        this.attempts = attempts;
        this.attemptAnswers = attemptAnswers;
        this.lessons = lessons;
        this.sections = sections;
        this.courses = courses;
        this.users = users;
        this.learningAccess = learningAccess;
        this.enrollments = enrollments;
        this.progress = progress;
        this.certificates = certificates;
    }

    @Transactional
    public QuizResponse create(UUID instructorId, UUID lessonId, CreateQuizRequest request) {
        requireRole(instructorId, RoleName.INSTRUCTOR);
        Lesson lesson = lessons.findById(lessonId).orElseThrow(this::lessonNotFound);
        Section section = sections.findById(lesson.getSectionId()).orElseThrow(this::lessonNotFound);
        Course course = courses.findByIdAndInstructorId(section.getCourseId(), instructorId)
                .orElseThrow(() -> notFound("LESSON_NOT_FOUND", "Không tìm thấy bài kiểm tra của bạn"));
        if (course.getStatus() != CourseStatus.PUBLISHED || lesson.getStatus() != LessonStatus.PUBLISHED
                || lesson.getLessonType() != LessonType.QUIZ) {
            throw conflict("QUIZ_LESSON_NOT_PUBLISHED", "Bài kiểm tra cần thuộc bài học kiểm tra đang xuất bản");
        }
        if (quizzes.findByLessonId(lessonId).isPresent()) {
            throw conflict("QUIZ_ALREADY_EXISTS", "Bài học này đã có bài kiểm tra");
        }

        List<QuizQuestion> questions = new ArrayList<>();
        for (int questionIndex = 0; questionIndex < request.questions().size(); questionIndex++) {
            QuizQuestionRequest questionRequest = request.questions().get(questionIndex);
            long correctCount = questionRequest.options().stream().filter(QuizOptionRequest::correct).count();
            if (correctCount != 1) {
                throw badRequest("QUIZ_REQUIRES_ONE_CORRECT_OPTION", "Mỗi câu hỏi phải có đúng một đáp án đúng");
            }
            List<QuizOption> options = new ArrayList<>();
            for (int optionIndex = 0; optionIndex < questionRequest.options().size(); optionIndex++) {
                QuizOptionRequest option = questionRequest.options().get(optionIndex);
                options.add(new QuizOption(option.label().trim(), option.correct(), optionIndex + 1));
            }
            questions.add(new QuizQuestion(questionRequest.prompt().trim(), questionIndex + 1, options));
        }
        return toResponse(quizzes.save(new Quiz(lessonId, request.passingScore(), questions)));
    }

    @Transactional(readOnly = true)
    public QuizResponse getForStudent(UUID studentId, UUID lessonId) {
        requireQuizLesson(lessonId);
        var lesson = learningAccess.requirePublishedLesson(lessonId);
        enrollments.requireEnrollment(studentId, lesson.courseId());
        Quiz quiz = quizzes.findByLessonId(lessonId).orElseThrow(this::quizNotFound);
        return toResponse(quiz);
    }

    @Transactional
    public QuizAttemptResponse submit(UUID studentId, UUID lessonId, SubmitQuizRequest request) {
        requireQuizLesson(lessonId);
        var lesson = learningAccess.requirePublishedLesson(lessonId);
        UUID enrollmentId = enrollments.requireEnrollment(studentId, lesson.courseId());
        Quiz quiz = quizzes.findByLessonId(lessonId).orElseThrow(this::quizNotFound);
        if (request.answers().size() != quiz.getQuestions().size()) {
            throw badRequest("QUIZ_ANSWERS_INCOMPLETE", "Hãy trả lời đầy đủ tất cả câu hỏi");
        }

        Map<UUID, QuizQuestion> questions = new HashMap<>();
        for (QuizQuestion question : quiz.getQuestions()) {
            questions.put(question.getId(), question);
        }
        Set<UUID> answeredQuestionIds = new HashSet<>();
        List<AnswerFact> savedAnswers = new ArrayList<>();
        int correctCount = 0;
        for (QuizAnswerRequest answer : request.answers()) {
            if (!answeredQuestionIds.add(answer.questionId())) {
                throw badRequest("QUIZ_ANSWER_DUPLICATE", "Mỗi câu hỏi chỉ được trả lời một lần");
            }
            QuizQuestion question = questions.get(answer.questionId());
            if (question == null) {
                throw badRequest("QUIZ_QUESTION_INVALID", "Câu trả lời có câu hỏi không thuộc bài kiểm tra này");
            }
            QuizOption option = question.getOptions().stream()
                    .filter(item -> item.getId().equals(answer.optionId()))
                    .findFirst()
                    .orElseThrow(() -> badRequest("QUIZ_OPTION_INVALID", "Đáp án không thuộc câu hỏi đã chọn"));
            boolean correct = option.isCorrect();
            if (correct) {
                correctCount++;
            }
            savedAnswers.add(new AnswerFact(question.getId(), option.getId(), correct));
        }

        int total = quiz.getQuestions().size();
        BigDecimal score = BigDecimal.valueOf(correctCount)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
        QuizAttempt attempt = attempts.save(new QuizAttempt(quiz.getId(), studentId, score, correctCount,
                total, score.compareTo(quiz.getPassingScore()) >= 0));
        List<QuizAttemptAnswer> persistedAnswers = savedAnswers.stream()
                .map(answer -> new QuizAttemptAnswer(attempt.getId(), answer.questionId(), answer.optionId(), answer.correct()))
                .toList();
        attemptAnswers.saveAll(persistedAnswers);
        if (attempt.isPassed()) {
            progress.completeIfAbsent(UUID.randomUUID(), enrollmentId, lesson.courseId(), lesson.sectionId(), lesson.id());
            certificates.issueIfEligible(studentId, lesson.courseId());
        }
        return toAttemptResponse(attempt);
    }

    private record AnswerFact(UUID questionId, UUID optionId, boolean correct) { }

    private void requireQuizLesson(UUID lessonId) {
        lessons.findById(lessonId).filter(item -> item.getLessonType() == LessonType.QUIZ)
                .orElseThrow(this::quizNotFound);
    }

    private void requireRole(UUID userId, RoleName role) {
        User user = users.findById(userId).orElseThrow(() -> notFound("USER_NOT_FOUND", "Không tìm thấy tài khoản"));
        if (user.getStatus() != UserStatus.ACTIVE || user.getRoles().stream().noneMatch(item -> item.getName() == role)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "ROLE_REQUIRED", "Bạn không có quyền thực hiện thao tác này");
        }
    }

    private QuizResponse toResponse(Quiz quiz) {
        List<QuizResponse.Question> questions = quiz.getQuestions().stream().map(question ->
                new QuizResponse.Question(question.getId(), question.getPrompt(), question.getPosition(),
                        question.getOptions().stream().map(option -> new QuizResponse.Option(option.getId(),
                                option.getLabel(), option.getPosition())).toList())).toList();
        return new QuizResponse(quiz.getId(), quiz.getLessonId(), quiz.getPassingScore(), questions);
    }

    private QuizAttemptResponse toAttemptResponse(QuizAttempt attempt) {
        return new QuizAttemptResponse(attempt.getId(), attempt.getQuizId(), attempt.getScore(),
                attempt.getCorrectAnswers(), attempt.getTotalQuestions(), attempt.isPassed(), attempt.getSubmittedAt());
    }

    private BusinessException lessonNotFound() { return notFound("LESSON_NOT_FOUND", "Không tìm thấy bài học"); }
    private BusinessException quizNotFound() { return notFound("QUIZ_NOT_FOUND", "Không tìm thấy bài kiểm tra"); }
    private BusinessException notFound(String code, String message) { return new BusinessException(HttpStatus.NOT_FOUND, code, message); }
    private BusinessException conflict(String code, String message) { return new BusinessException(HttpStatus.CONFLICT, code, message); }
    private BusinessException badRequest(String code, String message) { return new BusinessException(HttpStatus.BAD_REQUEST, code, message); }
}
