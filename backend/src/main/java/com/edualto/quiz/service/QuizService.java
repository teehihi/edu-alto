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
import com.edualto.quiz.domain.QuizAttemptActivityEvent;
import com.edualto.quiz.domain.QuizAttemptAnswer;
import com.edualto.quiz.domain.QuizAttemptSession;
import com.edualto.quiz.domain.QuizAttemptSessionQuestion;
import com.edualto.quiz.domain.QuizAttemptSessionStatus;
import com.edualto.quiz.domain.QuizOption;
import com.edualto.quiz.domain.QuizQuestion;
import com.edualto.quiz.dto.CreateQuizRequest;
import com.edualto.quiz.dto.InstructorQuizResponse;
import com.edualto.quiz.dto.QuizAnswerRequest;
import com.edualto.quiz.dto.QuizAttemptActivityEventRequest;
import com.edualto.quiz.dto.QuizAttemptResponse;
import com.edualto.quiz.dto.QuizAttemptSessionResponse;
import com.edualto.quiz.dto.QuizOptionRequest;
import com.edualto.quiz.dto.QuizQuestionRequest;
import com.edualto.quiz.dto.QuizResponse;
import com.edualto.quiz.dto.SubmitQuizRequest;
import com.edualto.quiz.repository.QuizAttemptAnswerRepository;
import com.edualto.quiz.repository.QuizAttemptActivityEventRepository;
import com.edualto.quiz.repository.QuizAttemptRepository;
import com.edualto.quiz.repository.QuizAttemptSessionQuestionRepository;
import com.edualto.quiz.repository.QuizAttemptSessionRepository;
import com.edualto.quiz.repository.QuizRepository;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
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
    private static final Duration SESSION_RESUME_WINDOW = Duration.ofDays(7);
    private static final SecureRandom QUESTION_RANDOM = new SecureRandom();
    private final QuizRepository quizzes;
    private final QuizAttemptRepository attempts;
    private final QuizAttemptAnswerRepository attemptAnswers;
    private final QuizAttemptSessionRepository sessions;
    private final QuizAttemptSessionQuestionRepository sessionQuestions;
    private final QuizAttemptActivityEventRepository activityEvents;
    private final LessonRepository lessons;
    private final SectionRepository sections;
    private final CourseRepository courses;
    private final UserRepository users;
    private final CourseLearningAccessService learningAccess;
    private final EnrollmentService enrollments;
    private final LearningProgressRepository progress;
    private final CertificateService certificates;

    public QuizService(QuizRepository quizzes, QuizAttemptRepository attempts,
            QuizAttemptAnswerRepository attemptAnswers, QuizAttemptSessionRepository sessions,
            QuizAttemptSessionQuestionRepository sessionQuestions,
            QuizAttemptActivityEventRepository activityEvents, LessonRepository lessons,
            SectionRepository sections, CourseRepository courses, UserRepository users,
            CourseLearningAccessService learningAccess, EnrollmentService enrollments,
            LearningProgressRepository progress, CertificateService certificates) {
        this.quizzes = quizzes;
        this.attempts = attempts;
        this.attemptAnswers = attemptAnswers;
        this.sessions = sessions;
        this.sessionQuestions = sessionQuestions;
        this.activityEvents = activityEvents;
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
    public InstructorQuizResponse create(UUID instructorId, UUID lessonId, CreateQuizRequest request) {
        requireRole(instructorId, RoleName.INSTRUCTOR);
        Lesson lesson = lessons.findById(lessonId).orElseThrow(this::lessonNotFound);
        Section section = sections.findById(lesson.getSectionId()).orElseThrow(this::lessonNotFound);
        Course course = courses.findByIdAndInstructorId(section.getCourseId(), instructorId)
                .orElseThrow(() -> notFound("LESSON_NOT_FOUND", "Không tìm thấy bài kiểm tra của bạn"));
        if (course.getStatus() == CourseStatus.ARCHIVED || lesson.getStatus() == LessonStatus.ARCHIVED
                || lesson.getLessonType() != LessonType.QUIZ) {
            throw conflict("QUIZ_LESSON_UNAVAILABLE", "Chỉ có thể tạo bài kiểm tra cho bài học chưa lưu trữ");
        }
        if (quizzes.findByLessonId(lessonId).isPresent()) {
            throw conflict("QUIZ_ALREADY_EXISTS", "Bài học này đã có bài kiểm tra");
        }

        List<QuizQuestion> questions = buildQuestions(request);
        return toInstructorResponse(quizzes.save(new Quiz(lessonId, request.passingScore(),
                request.questionsPerAttempt(), request.durationMinutes(), questions)), true);
    }

    @Transactional(readOnly = true)
    public InstructorQuizResponse getForInstructor(UUID instructorId, UUID lessonId) {
        requireRole(instructorId, RoleName.INSTRUCTOR);
        requireOwnedQuizLesson(instructorId, lessonId);
        Quiz quiz = quizzes.findByLessonId(lessonId).orElseThrow(this::quizNotFound);
        Instant now = Instant.now();
        return toInstructorResponse(quiz, !attempts.existsByQuizId(quiz.getId())
                && !sessions.existsCurrentSession(quiz.getId(), QuizAttemptSessionStatus.IN_PROGRESS,
                        now.minusSeconds(30), now.minus(SESSION_RESUME_WINDOW)));
    }

    @Transactional
    public InstructorQuizResponse update(UUID instructorId, UUID lessonId, CreateQuizRequest request) {
        requireRole(instructorId, RoleName.INSTRUCTOR);
        requireOwnedQuizLesson(instructorId, lessonId);
        Quiz quiz = quizzes.findByLessonId(lessonId).orElseThrow(this::quizNotFound);
        Instant now = Instant.now();
        Instant nowMinusGrace = now.minusSeconds(30);
        Instant staleBefore = now.minus(SESSION_RESUME_WINDOW);
        sessions.expireInactiveSessions(quiz.getId(), QuizAttemptSessionStatus.IN_PROGRESS,
                QuizAttemptSessionStatus.EXPIRED, nowMinusGrace, staleBefore);
        if (attempts.existsByQuizId(quiz.getId()) || sessions.existsCurrentSession(quiz.getId(),
                QuizAttemptSessionStatus.IN_PROGRESS, nowMinusGrace, staleBefore)) {
            throw conflict("QUIZ_HAS_ATTEMPTS", "Không thể sửa bài kiểm tra sau khi đã có lượt làm hoặc phiên đang diễn ra");
        }
        quiz.replaceContent(request.passingScore(), request.questionsPerAttempt(), request.durationMinutes(),
                buildQuestions(request));
        return toInstructorResponse(quizzes.save(quiz), true);
    }

    @Transactional(readOnly = true)
    public QuizResponse getForStudent(UUID studentId, UUID lessonId) {
        requireQuizLesson(lessonId);
        var lesson = learningAccess.requirePublishedLesson(lessonId);
        enrollments.requireEnrollment(studentId, lesson.courseId());
        Quiz quiz = quizzes.findByLessonId(lessonId).orElseThrow(this::quizNotFound);
        Lesson lessonEntity = lessons.findById(lessonId).orElseThrow(this::lessonNotFound);
        return toResponse(quiz, lessonEntity.getTitle());
    }

    @Transactional
    public QuizAttemptSessionResponse start(UUID studentId, UUID lessonId) {
        requireQuizLesson(lessonId);
        var lesson = learningAccess.requirePublishedLesson(lessonId);
        enrollments.requireEnrollment(studentId, lesson.courseId());
        Quiz quiz = quizzes.findByLessonId(lessonId).orElseThrow(this::quizNotFound);
        Instant now = Instant.now();

        QuizAttemptSession session = sessions.findFirstByQuizIdAndStudentIdAndStatusOrderByStartedAtDesc(
                quiz.getId(), studentId, QuizAttemptSessionStatus.IN_PROGRESS).orElse(null);
        if (session != null && isExpired(session, now)) {
            session.markExpired();
            sessions.save(session);
            session = null;
        }
        if (session == null) {
            Instant expiresAt = quiz.getDurationMinutes() == 0
                    ? null
                    : now.plusSeconds(quiz.getDurationMinutes() * 60L);
            session = sessions.save(new QuizAttemptSession(quiz.getId(), studentId, now, expiresAt));
            List<QuizQuestion> selectedQuestions = selectQuestions(quiz);
            List<QuizAttemptSessionQuestion> assignments = new ArrayList<>();
            for (int index = 0; index < selectedQuestions.size(); index++) {
                assignments.add(new QuizAttemptSessionQuestion(
                        session.getId(), selectedQuestions.get(index).getId(), index + 1));
            }
            sessionQuestions.saveAll(assignments);
        }
        return toSessionResponse(session, quiz);
    }

    @Transactional
    public QuizAttemptResponse submit(UUID studentId, UUID lessonId, SubmitQuizRequest request) {
        requireQuizLesson(lessonId);
        var lesson = learningAccess.requirePublishedLesson(lessonId);
        UUID enrollmentId = enrollments.requireEnrollment(studentId, lesson.courseId());
        Quiz quiz = quizzes.findByLessonId(lessonId).orElseThrow(this::quizNotFound);
        QuizAttemptSession session = sessions.findById(request.sessionId())
                .filter(item -> item.getStudentId().equals(studentId)
                        && item.getQuizId().equals(quiz.getId())
                        && item.getStatus() == QuizAttemptSessionStatus.IN_PROGRESS)
                .orElseThrow(() -> conflict("QUIZ_SESSION_INVALID", "Phiên làm bài không còn hợp lệ. Hãy bắt đầu lượt mới."));
        if (isExpired(session, Instant.now())) {
            session.markExpired();
            sessions.save(session);
            throw conflict("QUIZ_TIME_EXPIRED", "Đã hết thời gian làm bài. Hãy bắt đầu lượt mới.");
        }
        List<QuizAttemptSessionQuestion> assignedQuestions = sessionQuestions
                .findBySessionIdOrderByPositionAsc(session.getId());
        if (request.answers().size() > assignedQuestions.size()) {
            throw badRequest("QUIZ_ANSWERS_INVALID", "Số câu trả lời vượt quá số câu trong phiên làm bài");
        }

        Map<UUID, QuizQuestion> questions = new HashMap<>();
        Set<UUID> assignedQuestionIds = new HashSet<>();
        for (QuizAttemptSessionQuestion assignedQuestion : assignedQuestions) {
            assignedQuestionIds.add(assignedQuestion.getQuestionId());
        }
        for (QuizQuestion question : quiz.getQuestions()) {
            if (assignedQuestionIds.contains(question.getId())) {
                questions.put(question.getId(), question);
            }
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

        int total = assignedQuestions.size();
        BigDecimal score = BigDecimal.valueOf(correctCount)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
        QuizAttempt attempt = attempts.save(new QuizAttempt(quiz.getId(), studentId, score, correctCount,
                total, score.compareTo(quiz.getPassingScore()) >= 0));
        List<QuizAttemptAnswer> persistedAnswers = savedAnswers.stream()
                .map(answer -> new QuizAttemptAnswer(attempt.getId(), answer.questionId(), answer.optionId(), answer.correct()))
                .toList();
        attemptAnswers.saveAll(persistedAnswers);
        session.markSubmitted(attempt.getId());
        sessions.save(session);
        List<QuizAttemptActivityEventRequest> submittedEvents = request.activityEvents() == null
                ? List.of()
                : request.activityEvents();
        Instant startedAt = session.getStartedAt();
        List<QuizAttemptActivityEvent> persistedEvents = submittedEvents.stream()
                .map(event -> new QuizAttemptActivityEvent(
                        attempt.getId(), event.eventType(), boundEventTime(event.occurredAt(), startedAt)))
                .toList();
        activityEvents.saveAll(persistedEvents);
        if (attempt.isPassed()) {
            progress.completeIfAbsent(UUID.randomUUID(), enrollmentId, lesson.courseId(), lesson.sectionId(), lesson.id());
            certificates.issueIfEligible(studentId, lesson.courseId());
        }
        return toAttemptResponse(attempt, assignedQuestions, questions, request.answers(), persistedEvents.size());
    }

    private boolean isExpired(QuizAttemptSession session, Instant now) {
        Instant expiry = session.getExpiresAt() == null
                ? session.getStartedAt().plus(SESSION_RESUME_WINDOW)
                : session.getExpiresAt();
        return expiry.plusSeconds(30).isBefore(now);
    }

    private Instant boundEventTime(Instant occurredAt, Instant startedAt) {
        Instant now = Instant.now();
        if (occurredAt.isBefore(startedAt)) return startedAt;
        return occurredAt.isAfter(now) ? now : occurredAt;
    }

    private List<QuizQuestion> selectQuestions(Quiz quiz) {
        List<QuizQuestion> selected = new ArrayList<>(quiz.getQuestions());
        Collections.shuffle(selected, QUESTION_RANDOM);
        if (quiz.getQuestionsPerAttempt() > 0 && quiz.getQuestionsPerAttempt() < selected.size()) {
            selected = new ArrayList<>(selected.subList(0, quiz.getQuestionsPerAttempt()));
        }
        return selected;
    }

    private QuizAttemptSessionResponse toSessionResponse(QuizAttemptSession session, Quiz quiz) {
        Map<UUID, QuizQuestion> questionsById = new HashMap<>();
        for (QuizQuestion question : quiz.getQuestions()) {
            questionsById.put(question.getId(), question);
        }
        List<QuizResponse.Question> responseQuestions = sessionQuestions
                .findBySessionIdOrderByPositionAsc(session.getId()).stream()
                .map(assigned -> toQuestionResponse(questionsById.get(assigned.getQuestionId()), assigned.getPosition()))
                .toList();
        return new QuizAttemptSessionResponse(session.getId(), quiz.getId(), session.getStartedAt(),
                session.getExpiresAt(), quiz.getPassingScore(), responseQuestions);
    }

    private record AnswerFact(UUID questionId, UUID optionId, boolean correct) { }

    private void requireQuizLesson(UUID lessonId) {
        lessons.findById(lessonId).filter(item -> item.getLessonType() == LessonType.QUIZ)
                .orElseThrow(this::quizNotFound);
    }

    private Lesson requireOwnedQuizLesson(UUID instructorId, UUID lessonId) {
        Lesson lesson = lessons.findById(lessonId).orElseThrow(this::lessonNotFound);
        if (lesson.getLessonType() != LessonType.QUIZ) {
            throw quizNotFound();
        }
        Section section = sections.findById(lesson.getSectionId()).orElseThrow(this::lessonNotFound);
        courses.findByIdAndInstructorId(section.getCourseId(), instructorId)
                .orElseThrow(() -> notFound("LESSON_NOT_FOUND", "Không tìm thấy bài kiểm tra của bạn"));
        return lesson;
    }

    private List<QuizQuestion> buildQuestions(CreateQuizRequest request) {
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
        if (request.questionsPerAttempt() > questions.size()) {
            throw badRequest("QUIZ_SAMPLE_COUNT_INVALID", "Số câu mỗi lượt không được vượt quá số câu trong ngân hàng");
        }
        return questions;
    }

    private void requireRole(UUID userId, RoleName role) {
        User user = users.findById(userId).orElseThrow(() -> notFound("USER_NOT_FOUND", "Không tìm thấy tài khoản"));
        if (user.getStatus() != UserStatus.ACTIVE || user.getRoles().stream().noneMatch(item -> item.getName() == role)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "ROLE_REQUIRED", "Bạn không có quyền thực hiện thao tác này");
        }
    }

    private QuizResponse toResponse(Quiz quiz, String lessonTitle) {
        return new QuizResponse(quiz.getId(), quiz.getLessonId(), lessonTitle, quiz.getPassingScore(),
                quiz.getQuestions().size(), quiz.getQuestionsPerAttempt(), quiz.getDurationMinutes(), List.of());
    }

    private QuizResponse.Question toQuestionResponse(QuizQuestion question, int position) {
        return new QuizResponse.Question(question.getId(), question.getPrompt(), position,
                question.getOptions().stream().map(option -> new QuizResponse.Option(option.getId(),
                        option.getLabel(), option.getPosition())).toList());
    }

    private QuizAttemptResponse toAttemptResponse(QuizAttempt attempt,
            List<QuizAttemptSessionQuestion> assignedQuestions, Map<UUID, QuizQuestion> questions,
            List<QuizAnswerRequest> answers, int activityEventCount) {
        Map<UUID, UUID> selectedOptions = new HashMap<>();
        for (QuizAnswerRequest answer : answers) {
            selectedOptions.put(answer.questionId(), answer.optionId());
        }
        List<QuizAttemptResponse.ReviewQuestion> review = assignedQuestions.stream().map(assigned -> {
            QuizQuestion question = questions.get(assigned.getQuestionId());
            UUID selectedOptionId = selectedOptions.get(question.getId());
            QuizOption selectedOption = question.getOptions().stream()
                    .filter(option -> option.getId().equals(selectedOptionId)).findFirst().orElse(null);
            QuizOption correctOption = question.getOptions().stream().filter(QuizOption::isCorrect)
                    .findFirst().orElseThrow();
            return new QuizAttemptResponse.ReviewQuestion(question.getId(), assigned.getPosition(),
                    question.getPrompt(), selectedOption == null ? null : selectedOption.getId(),
                    selectedOption == null ? null : selectedOption.getLabel(), correctOption.getId(),
                    correctOption.getLabel(), selectedOption != null && selectedOption.isCorrect());
        }).toList();
        return new QuizAttemptResponse(attempt.getId(), attempt.getQuizId(), attempt.getScore(),
                attempt.getCorrectAnswers(), attempt.getTotalQuestions(), attempt.isPassed(), attempt.getSubmittedAt(),
                activityEventCount, review);
    }

    private InstructorQuizResponse toInstructorResponse(Quiz quiz, boolean editable) {
        List<InstructorQuizResponse.Question> questions = quiz.getQuestions().stream().map(question ->
                new InstructorQuizResponse.Question(question.getId(), question.getPrompt(), question.getPosition(),
                        question.getOptions().stream().map(option -> new InstructorQuizResponse.Option(
                                option.getId(), option.getLabel(), option.isCorrect(), option.getPosition())).toList()))
                .toList();
        return new InstructorQuizResponse(quiz.getId(), quiz.getLessonId(), quiz.getPassingScore(),
                quiz.getQuestionsPerAttempt(), quiz.getDurationMinutes(), editable, questions);
    }

    private BusinessException lessonNotFound() { return notFound("LESSON_NOT_FOUND", "Không tìm thấy bài học"); }
    private BusinessException quizNotFound() { return notFound("QUIZ_NOT_FOUND", "Không tìm thấy bài kiểm tra"); }
    private BusinessException notFound(String code, String message) { return new BusinessException(HttpStatus.NOT_FOUND, code, message); }
    private BusinessException conflict(String code, String message) { return new BusinessException(HttpStatus.CONFLICT, code, message); }
    private BusinessException badRequest(String code, String message) { return new BusinessException(HttpStatus.BAD_REQUEST, code, message); }
}
