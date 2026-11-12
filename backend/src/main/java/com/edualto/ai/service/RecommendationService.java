package com.edualto.ai.service;

import com.edualto.ai.dto.CourseRecommendationItemResponse;
import com.edualto.ai.dto.CourseRecommendationsResponse;
import com.edualto.ai.dto.LearningNextItemResponse;
import com.edualto.ai.dto.LearningNextRecommendationsResponse;
import com.edualto.ai.dto.LearningPreferencesResponse;
import com.edualto.ai.dto.RecommendationFeedbackRequest;
import com.edualto.ai.dto.UpdateLearningPreferencesRequest;
import com.edualto.ai.infrastructure.VietnameseTextSimilarityScorer;
import com.edualto.ai.repository.RecommendationRepository;
import com.edualto.ai.repository.RecommendationRepository.CachedSnapshotHeader;
import com.edualto.ai.repository.RecommendationRepository.CachedSnapshotItemRow;
import com.edualto.ai.repository.RecommendationRepository.CandidateCourseRow;
import com.edualto.ai.repository.RecommendationRepository.NextLessonCandidateRow;
import com.edualto.ai.repository.RecommendationRepository.SignalCourseRow;
import com.edualto.ai.repository.RecommendationRepository.SnapshotItemWriteRow;
import com.edualto.ai.repository.RecommendationRepository.StudentPreferencesRow;
import com.edualto.ai.repository.RecommendationRepository.WeakQuizTopicRow;
import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.dto.CourseInstructorSummaryResponse;
import com.edualto.storage.service.StorageService;
import com.edualto.user.service.UserService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecommendationService {

    public static final String ALGORITHM_VERSION = "rule-tfidf-v1";
    private static final String SCOPE_COURSE = "COURSE";
    private static final String SCOPE_LEARNING_NEXT = "LEARNING_NEXT";
    private static final Duration COURSE_SNAPSHOT_TTL = Duration.ofMinutes(30);
    private static final Duration LEARNING_SNAPSHOT_TTL = Duration.ofMinutes(15);
    private static final int MAX_CANDIDATE_COURSES = 200;
    private static final int MAX_SNAPSHOT_ITEMS = 12;

    private static final List<String> DEFAULT_SUGGESTED_TOPICS = List.of(
            "Lập trình Web",
            "Java & Spring Boot",
            "React & Next.js",
            "UI/UX Design",
            "Cơ sở dữ liệu & SQL",
            "Phân tích dữ liệu",
            "Trí tuệ nhân tạo & ML",
            "Tiếng Anh giao tiếp",
            "Kỹ năng mềm"
    );

    private final RecommendationRepository repository;
    private final UserService userService;
    private final StorageService storageService;
    private final Clock clock;

    @Autowired
    public RecommendationService(
            RecommendationRepository repository,
            UserService userService,
            StorageService storageService
    ) {
        this(repository, userService, storageService, Clock.systemUTC());
    }

    public RecommendationService(
            RecommendationRepository repository,
            UserService userService,
            StorageService storageService,
            Clock clock
    ) {
        this.repository = repository;
        this.userService = userService;
        this.storageService = storageService;
        this.clock = clock;
    }

    @Transactional
    public CourseRecommendationsResponse recommendCourses(UUID userId, UUID contextCourseId, int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), MAX_SNAPSHOT_ITEMS);
        List<CandidateCourseRow> publishedCourses = repository.findPublishedCourses(MAX_CANDIDATE_COURSES);
        if (publishedCourses.isEmpty()) {
            return new CourseRecommendationsResponse(
                    null,
                    ALGORITHM_VERSION,
                    userId != null,
                    true,
                    false,
                    Instant.now(clock),
                    List.of()
            );
        }

        Map<UUID, CandidateCourseRow> coursesById = publishedCourses.stream()
                .collect(Collectors.toMap(CandidateCourseRow::id, Function.identity(), (a, b) -> a, LinkedHashMap::new));
        CandidateCourseRow contextCourse = contextCourseId != null ? coursesById.get(contextCourseId) : null;

        if (userId == null) {
            List<ScoredCourse> ranked = scoreCoursesWithoutPersonalization(
                    publishedCourses,
                    contextCourse,
                    Set.of(),
                    Set.of(),
                    null
            );
            List<CourseRecommendationItemResponse> items = ranked.stream()
                    .limit(safeLimit)
                    .map(scored -> toCourseItemResponse(null, scored))
                    .toList();
            return new CourseRecommendationsResponse(
                    null,
                    ALGORITHM_VERSION,
                    false,
                    true,
                    false,
                    Instant.now(clock),
                    items
            );
        }

        userService.requireById(userId);
        StudentPreferencesRow prefs = repository.findUserPreferences(userId);
        Set<UUID> enrolledCourseIds = new HashSet<>(repository.findActiveEnrolledCourseIds(userId));
        Set<UUID> dismissedCourseIds = new HashSet<>(repository.findDismissedTargetIds(userId, "COURSE"));

        if (!prefs.personalizationEnabled()) {
            List<ScoredCourse> ranked = scoreCoursesWithoutPersonalization(
                    publishedCourses,
                    contextCourse,
                    enrolledCourseIds,
                    dismissedCourseIds,
                    userId
            );
            List<CourseRecommendationItemResponse> items = ranked.stream()
                    .limit(safeLimit)
                    .map(scored -> toCourseItemResponse(null, scored))
                    .toList();
            return new CourseRecommendationsResponse(
                    null,
                    ALGORITHM_VERSION,
                    false,
                    false,
                    prefs.onboardingCompleted(),
                    Instant.now(clock),
                    items
            );
        }

        CachedSnapshotHeader cachedHeader = repository.findValidSnapshot(
                userId,
                SCOPE_COURSE,
                contextCourseId,
                ALGORITHM_VERSION
        );
        if (cachedHeader != null) {
            List<CachedSnapshotItemRow> cachedRows = repository.findSnapshotItems(cachedHeader.snapshotId(), MAX_SNAPSHOT_ITEMS);
            List<CourseRecommendationItemResponse> validCachedItems = new ArrayList<>();
            for (CachedSnapshotItemRow cachedItem : cachedRows) {
                CandidateCourseRow course = coursesById.get(cachedItem.courseId());
                if (course == null
                        || Objects.equals(course.id(), contextCourseId)
                        || enrolledCourseIds.contains(course.id())
                        || dismissedCourseIds.contains(course.id())
                        || Objects.equals(course.instructorId(), userId)) {
                    continue;
                }
                validCachedItems.add(toCourseItemResponse(cachedItem, course));
                if (validCachedItems.size() >= safeLimit) {
                    break;
                }
            }
            if (!validCachedItems.isEmpty() || publishedCourses.stream().noneMatch(c -> isEligibleCourse(c, userId, contextCourseId, enrolledCourseIds, dismissedCourseIds))) {
                return new CourseRecommendationsResponse(
                        cachedHeader.snapshotId(),
                        cachedHeader.algorithmVersion(),
                        true,
                        true,
                        prefs.onboardingCompleted(),
                        cachedHeader.generatedAt(),
                        validCachedItems
                );
            }
        }

        List<ScoredCourse> ranked = scoreCoursesForUser(
                userId,
                publishedCourses,
                contextCourse,
                prefs,
                enrolledCourseIds,
                dismissedCourseIds
        );

        Instant now = Instant.now(clock);
        UUID snapshotId = UUID.randomUUID();
        List<ScoredCourse> toPersist = ranked.stream().limit(MAX_SNAPSHOT_ITEMS).toList();
        List<SnapshotItemWriteRow> writeRows = new ArrayList<>(toPersist.size());
        List<CourseRecommendationItemResponse> responseItems = new ArrayList<>(Math.min(safeLimit, toPersist.size()));

        for (int index = 0; index < toPersist.size(); index++) {
            ScoredCourse scored = toPersist.get(index);
            UUID itemId = UUID.randomUUID();
            writeRows.add(new SnapshotItemWriteRow(
                    itemId,
                    "COURSE",
                    scored.course().id(),
                    scored.course().id(),
                    null,
                    index + 1,
                    scored.score(),
                    scored.tier(),
                    scored.reasonCode(),
                    scored.reasonText(),
                    null,
                    "/courses/" + scored.course().slug()
            ));
            if (index < safeLimit) {
                responseItems.add(toCourseItemResponse(itemId, scored));
            }
        }

        repository.saveSnapshot(
                snapshotId,
                userId,
                SCOPE_COURSE,
                contextCourseId,
                ALGORITHM_VERSION,
                now,
                now.plus(COURSE_SNAPSHOT_TTL),
                writeRows
        );

        return new CourseRecommendationsResponse(
                snapshotId,
                ALGORITHM_VERSION,
                true,
                true,
                prefs.onboardingCompleted(),
                now,
                responseItems
        );
    }

    @Transactional
    public LearningNextRecommendationsResponse recommendNextLearning(UUID userId, int limit) {
        Objects.requireNonNull(userId, "userId must not be null");
        userService.requireById(userId);
        int safeLimit = Math.min(Math.max(limit, 1), 10);

        StudentPreferencesRow prefs = repository.findUserPreferences(userId);
        if (!prefs.personalizationEnabled()) {
            return new LearningNextRecommendationsResponse(
                    null,
                    ALGORITHM_VERSION,
                    false,
                    Instant.now(clock),
                    List.of()
            );
        }

        List<WeakQuizTopicRow> weakQuizzes = repository.findWeakQuizTopics(userId);
        List<NextLessonCandidateRow> nextCandidates = repository.findNextLessonCandidates(userId);
        Map<UUID, NextLessonCandidateRow> courseMetaByCourseId = nextCandidates.stream()
                .collect(Collectors.toMap(NextLessonCandidateRow::courseId, Function.identity(), (a, b) -> a));
        Set<UUID> dismissedLessonTargets = new HashSet<>(repository.findDismissedTargetIds(userId, "LESSON"));
        dismissedLessonTargets.addAll(repository.findDismissedTargetIds(userId, "QUIZ_REVIEW"));

        CachedSnapshotHeader cachedHeader = repository.findValidSnapshot(
                userId,
                SCOPE_LEARNING_NEXT,
                null,
                ALGORITHM_VERSION
        );
        if (cachedHeader != null) {
            List<CachedSnapshotItemRow> cachedItems = repository.findSnapshotItems(cachedHeader.snapshotId(), 10);
            Set<UUID> activeEnrolledIds = new HashSet<>(repository.findActiveEnrolledCourseIds(userId));
            List<LearningNextItemResponse> mapped = cachedItems.stream()
                    .filter(item -> activeEnrolledIds.contains(item.courseId()))
                    .filter(item -> !dismissedLessonTargets.contains(item.targetId()))
                    .limit(safeLimit)
                    .map(item -> toLearningNextResponse(item, courseMetaByCourseId.get(item.courseId()), weakQuizzes))
                    .toList();
            if (!mapped.isEmpty() || (weakQuizzes.isEmpty() && nextCandidates.isEmpty())) {
                return new LearningNextRecommendationsResponse(
                        cachedHeader.snapshotId(),
                        cachedHeader.algorithmVersion(),
                        true,
                        cachedHeader.generatedAt(),
                        mapped
                );
            }
        }

        List<ScoredLearningNext> scoredItems = scoreNextLearningItems(
                weakQuizzes,
                nextCandidates,
                dismissedLessonTargets
        );

        Instant now = Instant.now(clock);
        UUID snapshotId = UUID.randomUUID();
        List<ScoredLearningNext> toPersist = scoredItems.stream().limit(10).toList();
        List<SnapshotItemWriteRow> writeRows = new ArrayList<>(toPersist.size());
        List<LearningNextItemResponse> responseItems = new ArrayList<>(Math.min(safeLimit, toPersist.size()));

        for (int index = 0; index < toPersist.size(); index++) {
            ScoredLearningNext scored = toPersist.get(index);
            UUID itemId = UUID.randomUUID();
            writeRows.add(new SnapshotItemWriteRow(
                    itemId,
                    scored.itemType(),
                    scored.lessonId(),
                    scored.courseId(),
                    scored.lessonId(),
                    index + 1,
                    scored.score(),
                    scored.tier(),
                    scored.reasonCode(),
                    scored.reasonText(),
                    scored.estimatedMinutes(),
                    scored.targetUrl()
            ));
            if (index < safeLimit) {
                responseItems.add(new LearningNextItemResponse(
                        itemId,
                        scored.itemType(),
                        scored.lessonId(),
                        scored.courseId(),
                        scored.courseTitle(),
                        scored.courseSlug(),
                        scored.lessonId(),
                        scored.lessonTitle(),
                        scored.sectionTitle(),
                        scored.targetUrl(),
                        scored.actionLabel(),
                        scored.score(),
                        scored.tier(),
                        scored.reasonCode(),
                        scored.reasonText(),
                        scored.estimatedMinutes(),
                        scored.completedLessons(),
                        scored.totalLessons()
                ));
            }
        }

        repository.saveSnapshot(
                snapshotId,
                userId,
                SCOPE_LEARNING_NEXT,
                null,
                ALGORITHM_VERSION,
                now,
                now.plus(LEARNING_SNAPSHOT_TTL),
                writeRows
        );

        return new LearningNextRecommendationsResponse(
                snapshotId,
                ALGORITHM_VERSION,
                true,
                now,
                responseItems
        );
    }

    @Transactional(readOnly = true)
    public LearningPreferencesResponse getPreferences(UUID userId) {
        Objects.requireNonNull(userId, "userId must not be null");
        userService.requireById(userId);
        StudentPreferencesRow row = repository.findUserPreferences(userId);
        CourseLevel preferredLevel = parseCourseLevelNullable(row.preferredLevel());
        return new LearningPreferencesResponse(
                row.preferredTopics(),
                preferredLevel,
                row.learningGoal(),
                row.weeklyTargetHours(),
                row.personalizationEnabled(),
                row.onboardingCompleted(),
                buildSuggestedTopics()
        );
    }

    @Transactional
    public LearningPreferencesResponse updatePreferences(UUID userId, UpdateLearningPreferencesRequest request) {
        Objects.requireNonNull(userId, "userId must not be null");
        Objects.requireNonNull(request, "request must not be null");
        userService.requireById(userId);

        List<String> normalizedTopics = sanitizeTopics(request.preferredTopics());
        String normalizedGoal = trimToNull(request.learningGoal());
        CourseLevel preferredLevel = request.preferredLevel();
        boolean personalizationEnabled = request.personalizationEnabled() == null
                ? true
                : request.personalizationEnabled();
        boolean onboardingCompleted = !normalizedTopics.isEmpty() || normalizedGoal != null;

        repository.upsertUserPreferences(
                userId,
                normalizedTopics,
                preferredLevel != null ? preferredLevel.name() : null,
                normalizedGoal,
                request.weeklyTargetHours(),
                personalizationEnabled,
                onboardingCompleted
        );
        repository.insertSignal(
                userId,
                null,
                null,
                "PREFERENCES_UPDATED",
                null,
                2.0,
                null,
                Instant.now(clock)
        );
        repository.invalidateUserSnapshots(userId, SCOPE_COURSE);

        return new LearningPreferencesResponse(
                normalizedTopics,
                preferredLevel,
                normalizedGoal,
                request.weeklyTargetHours(),
                personalizationEnabled,
                onboardingCompleted,
                buildSuggestedTopics()
        );
    }

    @Transactional
    public void recordFeedback(UUID userId, RecommendationFeedbackRequest request) {
        Objects.requireNonNull(userId, "userId must not be null");
        Objects.requireNonNull(request, "request must not be null");
        userService.requireById(userId);

        repository.insertFeedback(
                userId,
                request.snapshotId(),
                request.recommendationItemId(),
                request.targetType(),
                request.targetId(),
                request.feedbackType()
        );

        Instant now = Instant.now(clock);
        if ("COURSE".equals(request.targetType()) && "CLICKED".equals(request.feedbackType())) {
            if (repository.existsCourse(request.targetId())) {
                repository.insertSignal(
                        userId,
                        request.targetId(),
                        null,
                        "RECOMMENDATION_CLICKED",
                        null,
                        1.2,
                        null,
                        now
                );
            }
        } else if ("DISMISSED".equals(request.feedbackType())) {
            UUID courseIdForSignal = "COURSE".equals(request.targetType()) && repository.existsCourse(request.targetId())
                    ? request.targetId()
                    : null;
            repository.insertSignal(
                    userId,
                    courseIdForSignal,
                    null,
                    "RECOMMENDATION_DISMISSED",
                    null,
                    -2.0,
                    null,
                    now
            );
            String scopeToInvalidate = "COURSE".equals(request.targetType()) ? SCOPE_COURSE : SCOPE_LEARNING_NEXT;
            repository.invalidateUserSnapshots(userId, scopeToInvalidate);
        }
    }

    @Transactional
    public void recordCourseViewSignal(UUID userId, UUID courseId) {
        if (userId == null || courseId == null) {
            return;
        }
        userService.requireById(userId);
        if (!repository.existsCourse(courseId)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học");
        }
        repository.insertSignal(
                userId,
                courseId,
                null,
                "COURSE_VIEWED",
                null,
                1.0,
                null,
                Instant.now(clock)
        );
        repository.invalidateUserSnapshots(userId, SCOPE_COURSE);
    }

    private List<ScoredCourse> scoreCoursesWithoutPersonalization(
            List<CandidateCourseRow> publishedCourses,
            CandidateCourseRow contextCourse,
            Set<UUID> enrolledCourseIds,
            Set<UUID> dismissedCourseIds,
            UUID userId
    ) {
        Map<UUID, Map<String, Double>> rawTfByCourse = new HashMap<>(publishedCourses.size());
        for (CandidateCourseRow course : publishedCourses) {
            rawTfByCourse.put(
                    course.id(),
                    VietnameseTextSimilarityScorer.buildWeightedTermFrequency(
                            course.title(),
                            course.tagline(),
                            course.description()
                    )
            );
        }
        Map<String, Double> idf = VietnameseTextSimilarityScorer.computeIdf(rawTfByCourse.values());
        Map<String, Double> contextVector = contextCourse != null
                ? VietnameseTextSimilarityScorer.toTfIdfVector(rawTfByCourse.get(contextCourse.id()), idf)
                : Map.of();

        long maxEnrollments = publishedCourses.stream()
                .mapToLong(CandidateCourseRow::enrollmentCount)
                .max()
                .orElse(1L);

        List<ScoredCourse> results = new ArrayList<>();
        for (CandidateCourseRow course : publishedCourses) {
            if (!isEligibleCourse(course, userId, contextCourse != null ? contextCourse.id() : null, enrolledCourseIds, dismissedCourseIds)) {
                continue;
            }
            Map<String, Double> courseVector = VietnameseTextSimilarityScorer.toTfIdfVector(rawTfByCourse.get(course.id()), idf);
            double contextSim = contextCourse != null
                    ? VietnameseTextSimilarityScorer.cosineSimilarity(contextVector, courseVector) * 2.5
                    : 0.0;
            double sameInstructorBonus = (contextCourse != null && Objects.equals(course.instructorId(), contextCourse.instructorId()))
                    ? 0.25
                    : 0.0;
            double popularity = computePopularityScore(course, maxEnrollments);
            double totalScore = roundScore(contextSim + sameInstructorBonus + popularity);

            if (contextCourse != null && contextSim >= 0.22) {
                results.add(new ScoredCourse(
                        course,
                        totalScore,
                        "CONTENT_SIMILARITY",
                        "RELATED_COURSE_SIMILARITY",
                        "Nội dung liên quan đến khóa học \"" + truncate(contextCourse.title(), 55) + "\""
                ));
            } else {
                FallbackReason fallback = buildPopularityFallbackReason(course);
                results.add(new ScoredCourse(
                        course,
                        totalScore,
                        "POPULAR_FALLBACK",
                        fallback.code(),
                        fallback.text()
                ));
            }
        }

        results.sort(Comparator
                .comparingDouble(ScoredCourse::score).reversed()
                .thenComparing(sc -> sc.course().enrollmentCount(), Comparator.reverseOrder())
                .thenComparing(sc -> sc.course().publishedAt(), Comparator.nullsLast(Comparator.reverseOrder())));
        return results;
    }

    private List<ScoredCourse> scoreCoursesForUser(
            UUID userId,
            List<CandidateCourseRow> publishedCourses,
            CandidateCourseRow contextCourse,
            StudentPreferencesRow prefs,
            Set<UUID> enrolledCourseIds,
            Set<UUID> dismissedCourseIds
    ) {
        Map<UUID, Map<String, Double>> rawTfByCourse = new HashMap<>(publishedCourses.size());
        for (CandidateCourseRow course : publishedCourses) {
            rawTfByCourse.put(
                    course.id(),
                    VietnameseTextSimilarityScorer.buildWeightedTermFrequency(
                            course.title(),
                            course.tagline(),
                            course.description()
                    )
            );
        }
        Map<String, Double> idf = VietnameseTextSimilarityScorer.computeIdf(rawTfByCourse.values());

        Map<UUID, Map<String, Double>> tfIdfByCourse = new HashMap<>(publishedCourses.size());
        for (CandidateCourseRow course : publishedCourses) {
            tfIdfByCourse.put(
                    course.id(),
                    VietnameseTextSimilarityScorer.toTfIdfVector(rawTfByCourse.get(course.id()), idf)
            );
        }

        // Tier 1: Onboarding preference vector
        Map<String, Double> onboardingWeights = new LinkedHashMap<>();
        for (String topic : prefs.preferredTopics()) {
            onboardingWeights.merge(topic, 2.5, Double::sum);
        }
        if (prefs.learningGoal() != null && !prefs.learningGoal().isBlank()) {
            onboardingWeights.merge(prefs.learningGoal(), 1.5, Double::sum);
        }
        Map<String, Double> onboardingVector = VietnameseTextSimilarityScorer.toTfIdfVector(
                VietnameseTextSimilarityScorer.buildWeightedTermFrequency(onboardingWeights),
                idf
        );

        // Tier 2a: Behavioral anchor vectors from enrollments, wishlists, views, completed lessons
        List<SignalCourseRow> signalCourses = repository.findPositiveSignalCourses(userId);
        List<AnchorCourseVector> anchorVectors = new ArrayList<>();
        for (SignalCourseRow signal : signalCourses) {
            Map<String, Double> vec = tfIdfByCourse.containsKey(signal.courseId())
                    ? tfIdfByCourse.get(signal.courseId())
                    : VietnameseTextSimilarityScorer.toTfIdfVector(
                            VietnameseTextSimilarityScorer.buildWeightedTermFrequency(
                                    signal.title(),
                                    signal.tagline(),
                                    signal.description()
                            ),
                            idf
                    );
            double recencyBoost = computeRecencyBoost(signal.latestAt());
            double normalizedWeight = Math.min(2.0, 0.7 + Math.log1p(Math.max(0.0, signal.totalWeight())) * 0.45) * recencyBoost;
            anchorVectors.add(new AnchorCourseVector(signal.courseId(), signal.title(), signal.level(), vec, normalizedWeight));
        }

        // Tier 2b: Weak-skill gap vector from failed/low-score quizzes
        List<WeakQuizTopicRow> weakQuizzes = repository.findWeakQuizTopics(userId);
        Map<String, Double> weakSkillWeights = new LinkedHashMap<>();
        String primaryWeakTopic = null;
        for (WeakQuizTopicRow weak : weakQuizzes) {
            String label = weak.lessonTitle() != null && !weak.lessonTitle().isBlank()
                    ? weak.lessonTitle()
                    : weak.sectionTitle();
            if (primaryWeakTopic == null && label != null) {
                primaryWeakTopic = label;
            }
            weakSkillWeights.merge(
                    (weak.lessonTitle() != null ? weak.lessonTitle() : "") + " "
                            + (weak.sectionTitle() != null ? weak.sectionTitle() : "") + " "
                            + (weak.courseTitle() != null ? weak.courseTitle() : ""),
                    1.0,
                    Double::sum
            );
        }
        Map<String, Double> weakSkillVector = VietnameseTextSimilarityScorer.toTfIdfVector(
                VietnameseTextSimilarityScorer.buildWeightedTermFrequency(weakSkillWeights),
                idf
        );

        Map<String, Double> contextVector = contextCourse != null
                ? tfIdfByCourse.getOrDefault(contextCourse.id(), Map.of())
                : Map.of();

        long maxEnrollments = publishedCourses.stream()
                .mapToLong(CandidateCourseRow::enrollmentCount)
                .max()
                .orElse(1L);

        CourseLevel preferredLevel = parseCourseLevelNullable(prefs.preferredLevel());
        UUID contextId = contextCourse != null ? contextCourse.id() : null;

        List<ScoredCourse> results = new ArrayList<>();
        for (CandidateCourseRow course : publishedCourses) {
            if (!isEligibleCourse(course, userId, contextId, enrolledCourseIds, dismissedCourseIds)) {
                continue;
            }

            Map<String, Double> candidateVec = tfIdfByCourse.getOrDefault(course.id(), Map.of());
            String combinedText = course.title() + " "
                    + (course.tagline() != null ? course.tagline() : "") + " "
                    + (course.description() != null ? course.description() : "");

            // Tier 1 score
            double onboardingSim = VietnameseTextSimilarityScorer.cosineSimilarity(onboardingVector, candidateVec);
            String matchedTopic = VietnameseTextSimilarityScorer.findBestMatchingTopic(prefs.preferredTopics(), combinedText);
            double topicBonus = matchedTopic != null ? 0.35 : 0.0;
            double levelMatchBonus = (preferredLevel != null
                    && (preferredLevel.name().equals(course.level()) || preferredLevel == CourseLevel.ALL_LEVELS))
                    ? 0.25
                    : 0.0;
            double onboardingScore = onboardingSim * 3.2 + topicBonus + (onboardingSim > 0 || matchedTopic != null ? levelMatchBonus : 0.0);

            // Tier 2a behavior content similarity score
            double bestBehaviorScore = 0.0;
            String bestAnchorTitle = null;
            for (AnchorCourseVector anchor : anchorVectors) {
                if (Objects.equals(anchor.courseId(), course.id())) {
                    continue;
                }
                double sim = VietnameseTextSimilarityScorer.cosineSimilarity(anchor.vector(), candidateVec);
                double weightedSim = sim * 2.5 * anchor.weight();
                if (weightedSim > bestBehaviorScore) {
                    bestBehaviorScore = weightedSim;
                    bestAnchorTitle = anchor.title();
                }
            }

            // Tier 2b skill gap boost
            double weakSkillScore = VietnameseTextSimilarityScorer.cosineSimilarity(weakSkillVector, candidateVec) * 3.0;

            // Context similarity boost (e.g., on Course Detail page)
            double contextScore = contextCourse != null
                    ? VietnameseTextSimilarityScorer.cosineSimilarity(contextVector, candidateVec) * 2.2
                            + (Objects.equals(course.instructorId(), contextCourse.instructorId()) ? 0.25 : 0.0)
                    : 0.0;

            // Tier 3 popularity/quality score
            double popularityScore = computePopularityScore(course, maxEnrollments);

            double totalScore = roundScore(onboardingScore + bestBehaviorScore + weakSkillScore + contextScore + popularityScore);

            ScoredCourse decision = selectDominantReason(
                    course,
                    totalScore,
                    onboardingScore,
                    matchedTopic,
                    prefs.learningGoal(),
                    weakSkillScore,
                    primaryWeakTopic,
                    bestBehaviorScore,
                    bestAnchorTitle,
                    contextScore,
                    contextCourse
            );
            results.add(decision);
        }

        results.sort(Comparator
                .comparingDouble(ScoredCourse::score).reversed()
                .thenComparing(sc -> sc.course().enrollmentCount(), Comparator.reverseOrder())
                .thenComparing(sc -> sc.course().publishedAt(), Comparator.nullsLast(Comparator.reverseOrder())));
        return results;
    }

    private ScoredCourse selectDominantReason(
            CandidateCourseRow course,
            double totalScore,
            double onboardingScore,
            String matchedTopic,
            String learningGoal,
            double weakSkillScore,
            String primaryWeakTopic,
            double behaviorScore,
            String anchorTitle,
            double contextScore,
            CandidateCourseRow contextCourse
    ) {
        if (weakSkillScore >= 0.35 && weakSkillScore >= onboardingScore && weakSkillScore >= behaviorScore) {
            String topicNote = primaryWeakTopic != null
                    ? "chủ đề \"" + truncate(primaryWeakTopic, 48) + "\""
                    : "kiến thức còn yếu";
            return new ScoredCourse(
                    course,
                    totalScore,
                    "SKILL_GAP",
                    "SKILL_GAP_BOOST",
                    "Giúp củng cố " + topicNote + " từ kết quả luyện tập gần đây"
            );
        }

        if (onboardingScore >= 0.30 && onboardingScore >= behaviorScore) {
            String reasonText = matchedTopic != null
                    ? "Phù hợp với chủ đề bạn quan tâm: " + truncate(matchedTopic, 50)
                    : (learningGoal != null && !learningGoal.isBlank()
                            ? "Phù hợp với mục tiêu học tập \"" + truncate(learningGoal, 50) + "\""
                            : "Phù hợp với sở thích học tập bạn đã chọn");
            return new ScoredCourse(
                    course,
                    totalScore,
                    "ONBOARDING_MATCH",
                    "ONBOARDING_TOPIC_MATCH",
                    reasonText
            );
        }

        if (behaviorScore >= 0.25 && behaviorScore >= contextScore && anchorTitle != null) {
            return new ScoredCourse(
                    course,
                    totalScore,
                    "CONTENT_SIMILARITY",
                    "BEHAVIOR_CONTENT_MATCH",
                    "Tương đồng với khóa học \"" + truncate(anchorTitle, 55) + "\" bạn đang quan tâm"
            );
        }

        if (contextCourse != null && contextScore >= 0.22) {
            return new ScoredCourse(
                    course,
                    totalScore,
                    "CONTENT_SIMILARITY",
                    "RELATED_COURSE_SIMILARITY",
                    "Nội dung liên quan đến khóa học \"" + truncate(contextCourse.title(), 55) + "\""
            );
        }

        FallbackReason fallback = buildPopularityFallbackReason(course);
        return new ScoredCourse(
                course,
                totalScore,
                "POPULAR_FALLBACK",
                fallback.code(),
                fallback.text()
        );
    }

    private List<ScoredLearningNext> scoreNextLearningItems(
            List<WeakQuizTopicRow> weakQuizzes,
            List<NextLessonCandidateRow> nextCandidates,
            Set<UUID> dismissedLessonTargets
    ) {
        List<ScoredLearningNext> items = new ArrayList<>();
        Set<UUID> addedLessonIds = new HashSet<>();

        for (WeakQuizTopicRow weak : weakQuizzes) {
            if (dismissedLessonTargets.contains(weak.lessonId()) || !addedLessonIds.add(weak.lessonId())) {
                continue;
            }
            double best10 = weak.bestScore() != null ? weak.bestScore() / 10.0 : 0.0;
            double pass10 = weak.passingScore() / 10.0;
            double score = roundScore(0.97 - (best10 * 0.005));
            String reasonText = String.format(
                    Locale.US,
                    "Bạn đạt %.1f/10 ở bài kiểm tra \"%s\" (cần %.1f/10) — hãy ôn tập và làm lại để nắm chắc kiến thức",
                    best10,
                    truncate(weak.lessonTitle(), 50),
                    pass10
            );
            items.add(new ScoredLearningNext(
                    "QUIZ_REVIEW",
                    weak.courseId(),
                    weak.courseTitle(),
                    weak.courseSlug(),
                    weak.lessonId(),
                    weak.lessonTitle(),
                    weak.sectionTitle(),
                    "/learning/lessons/" + weak.lessonId(),
                    "Ôn tập & làm lại",
                    score,
                    "QUIZ_REVIEW",
                    "REVIEW_WEAK_QUIZ",
                    reasonText,
                    estimateMinutes(weak.durationSeconds()),
                    0,
                    0
            ));
        }

        for (NextLessonCandidateRow next : nextCandidates) {
            if (dismissedLessonTargets.contains(next.lessonId()) || !addedLessonIds.add(next.lessonId())) {
                continue;
            }
            boolean isQuiz = "QUIZ".equals(next.lessonType());
            double recencyBonus = next.lastActivityAt() != null
                    ? Math.max(0.0, 0.08 - ChronoUnit.DAYS.between(next.lastActivityAt(), Instant.now(clock)) * 0.005)
                    : 0.0;
            double progressRatio = next.totalLessons() > 0
                    ? (double) next.completedLessons() / next.totalLessons()
                    : 0.0;
            double baseScore = isQuiz ? 0.86 : 0.80;
            double score = roundScore(baseScore + recencyBonus + progressRatio * 0.05);

            String itemType = isQuiz ? "QUIZ_REVIEW" : "LESSON";
            String tier = isQuiz ? "QUIZ_REVIEW" : "NEXT_IN_COURSE";
            String reasonCode;
            String reasonText;
            String actionLabel;

            if (isQuiz && !next.hasQuizAttempt()) {
                reasonCode = "QUIZ_READY";
                reasonText = "Bạn đã hoàn thành phần kiến thức trước đó trong \""
                        + truncate(next.courseTitle(), 45)
                        + "\" — hãy làm bài kiểm tra \""
                        + truncate(next.lessonTitle(), 45)
                        + "\"";
                actionLabel = "Làm bài kiểm tra";
            } else if (next.completedLessons() > 0) {
                reasonCode = "CONTINUE_NEXT_LESSON";
                reasonText = "Bạn đã hoàn thành "
                        + next.completedLessons()
                        + "/"
                        + next.totalLessons()
                        + " bài trong \""
                        + truncate(next.courseTitle(), 45)
                        + "\" — bài \""
                        + truncate(next.lessonTitle(), 45)
                        + "\" là bước tiếp theo";
                actionLabel = "Học tiếp bài này";
            } else {
                reasonCode = "START_FIRST_LESSON";
                reasonText = "Bắt đầu bài học đầu tiên \""
                        + truncate(next.lessonTitle(), 48)
                        + "\" trong khóa học bạn vừa đăng ký";
                actionLabel = "Bắt đầu học";
            }

            items.add(new ScoredLearningNext(
                    itemType,
                    next.courseId(),
                    next.courseTitle(),
                    next.courseSlug(),
                    next.lessonId(),
                    next.lessonTitle(),
                    next.sectionTitle(),
                    "/learning/lessons/" + next.lessonId(),
                    actionLabel,
                    score,
                    tier,
                    reasonCode,
                    reasonText,
                    estimateMinutes(next.durationSeconds()),
                    next.completedLessons(),
                    next.totalLessons()
            ));
        }

        items.sort(Comparator.comparingDouble(ScoredLearningNext::score).reversed());
        return items;
    }

    private LearningNextItemResponse toLearningNextResponse(
            CachedSnapshotItemRow cached,
            NextLessonCandidateRow candidateMeta,
            List<WeakQuizTopicRow> weakQuizzes
    ) {
        String courseTitle = candidateMeta != null ? candidateMeta.courseTitle() : "";
        String courseSlug = candidateMeta != null ? candidateMeta.courseSlug() : "";
        String lessonTitle = candidateMeta != null ? candidateMeta.lessonTitle() : "";
        String sectionTitle = candidateMeta != null ? candidateMeta.sectionTitle() : "";
        long completed = candidateMeta != null ? candidateMeta.completedLessons() : 0;
        long total = candidateMeta != null ? candidateMeta.totalLessons() : 0;

        for (WeakQuizTopicRow weak : weakQuizzes) {
            if (Objects.equals(weak.lessonId(), cached.lessonId())) {
                courseTitle = weak.courseTitle();
                courseSlug = weak.courseSlug();
                lessonTitle = weak.lessonTitle();
                sectionTitle = weak.sectionTitle();
                break;
            }
        }

        String actionLabel = "QUIZ_REVIEW".equals(cached.itemType())
                ? ("REVIEW_WEAK_QUIZ".equals(cached.reasonCode()) ? "Ôn tập & làm lại" : "Làm bài kiểm tra")
                : ("START_FIRST_LESSON".equals(cached.reasonCode()) ? "Bắt đầu học" : "Học tiếp bài này");

        return new LearningNextItemResponse(
                cached.itemId(),
                cached.itemType(),
                cached.targetId(),
                cached.courseId(),
                courseTitle,
                courseSlug,
                cached.lessonId(),
                lessonTitle,
                sectionTitle,
                cached.targetUrl() != null ? cached.targetUrl() : "/learning/lessons/" + cached.lessonId(),
                actionLabel,
                cached.score(),
                cached.tier(),
                cached.reasonCode(),
                cached.reasonText(),
                cached.estimatedMinutes(),
                completed,
                total
        );
    }

    private CourseRecommendationItemResponse toCourseItemResponse(UUID itemId, ScoredCourse scored) {
        CandidateCourseRow course = scored.course();
        return new CourseRecommendationItemResponse(
                itemId,
                course.id(),
                course.title(),
                course.slug(),
                course.tagline(),
                resolvePublicUrl(course.thumbnailKey()),
                course.price(),
                course.originalPrice(),
                parseCourseLevelDefault(course.level()),
                course.language(),
                parseCourseStatus(course.status()),
                course.publishedAt(),
                buildInstructorSummary(course),
                scored.score(),
                scored.tier(),
                scored.reasonCode(),
                scored.reasonText()
        );
    }

    private CourseRecommendationItemResponse toCourseItemResponse(
            CachedSnapshotItemRow cached,
            CandidateCourseRow course
    ) {
        return new CourseRecommendationItemResponse(
                cached.itemId(),
                course.id(),
                course.title(),
                course.slug(),
                course.tagline(),
                resolvePublicUrl(course.thumbnailKey()),
                course.price(),
                course.originalPrice(),
                parseCourseLevelDefault(course.level()),
                course.language(),
                parseCourseStatus(course.status()),
                course.publishedAt(),
                buildInstructorSummary(course),
                cached.score(),
                cached.tier(),
                cached.reasonCode(),
                cached.reasonText()
        );
    }

    private CourseInstructorSummaryResponse buildInstructorSummary(CandidateCourseRow course) {
        return new CourseInstructorSummaryResponse(
                course.instructorId(),
                course.instructorName() != null ? course.instructorName() : "Giảng viên EduAlto",
                resolvePublicUrl(course.instructorAvatarKey()),
                course.instructorHeadline(),
                course.instructorCustomHandle()
        );
    }

    private String resolvePublicUrl(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        return storageService.getPublicUrl(key);
    }

    private boolean isEligibleCourse(
            CandidateCourseRow course,
            UUID userId,
            UUID contextCourseId,
            Set<UUID> enrolledCourseIds,
            Set<UUID> dismissedCourseIds
    ) {
        if (contextCourseId != null && contextCourseId.equals(course.id())) {
            return false;
        }
        if (userId != null && Objects.equals(course.instructorId(), userId)) {
            return false;
        }
        if (enrolledCourseIds.contains(course.id()) || dismissedCourseIds.contains(course.id())) {
            return false;
        }
        return "PUBLISHED".equals(course.status());
    }

    private double computePopularityScore(CandidateCourseRow course, long maxEnrollments) {
        double enrollmentNorm = maxEnrollments > 0
                ? Math.log1p(course.enrollmentCount()) / Math.log1p(Math.max(1L, maxEnrollments))
                : 0.0;
        double ratingNorm = course.reviewCount() > 0 ? (course.averageRating() / 5.0) : 0.0;
        double recencyBonus = course.publishedAt() != null
                ? Math.max(0.0, 1.0 - (ChronoUnit.DAYS.between(course.publishedAt(), Instant.now(clock)) / 365.0)) * 0.25
                : 0.1;
        return (enrollmentNorm * 0.45) + (ratingNorm * 0.35) + recencyBonus;
    }

    private double computeRecencyBoost(Instant latestAt) {
        if (latestAt == null) {
            return 0.8;
        }
        long ageDays = Math.max(0L, ChronoUnit.DAYS.between(latestAt, Instant.now(clock)));
        return Math.max(0.5, 1.0 - (ageDays / 180.0) * 0.5);
    }

    private FallbackReason buildPopularityFallbackReason(CandidateCourseRow course) {
        if (course.reviewCount() > 0 && course.averageRating() >= 4.0) {
            String formattedRating = String.format(Locale.US, "%.1f", course.averageRating());
            return new FallbackReason(
                    "HIGH_RATED_COURSE",
                    "Được học viên đánh giá cao (" + formattedRating + "/5 sao)"
            );
        }
        if (course.enrollmentCount() > 0) {
            return new FallbackReason(
                    "POPULAR_COURSE",
                    "Khóa học nổi bật với " + course.enrollmentCount() + " học viên đã tham gia"
            );
        }
        return new FallbackReason(
                "NEW_PUBLISHED_COURSE",
                "Khóa học mới cập nhật nổi bật trên EduAlto"
        );
    }

    private List<String> buildSuggestedTopics() {
        return new ArrayList<>(new LinkedHashSet<>(DEFAULT_SUGGESTED_TOPICS));
    }

    private List<String> sanitizeTopics(List<String> topics) {
        if (topics == null || topics.isEmpty()) {
            return List.of();
        }
        Set<String> deduplicated = new LinkedHashSet<>();
        for (String topic : topics) {
            if (topic != null && !topic.isBlank()) {
                deduplicated.add(topic.trim());
            }
        }
        return new ArrayList<>(deduplicated);
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private CourseLevel parseCourseLevelNullable(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return CourseLevel.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private CourseLevel parseCourseLevelDefault(String raw) {
        CourseLevel parsed = parseCourseLevelNullable(raw);
        return parsed != null ? parsed : CourseLevel.ALL_LEVELS;
    }

    private CourseStatus parseCourseStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return CourseStatus.PUBLISHED;
        }
        try {
            return CourseStatus.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return CourseStatus.PUBLISHED;
        }
    }

    private Integer estimateMinutes(Integer durationSeconds) {
        if (durationSeconds == null || durationSeconds <= 0) {
            return 5;
        }
        return Math.max(1, (int) Math.ceil(durationSeconds / 60.0));
    }

    private double roundScore(double raw) {
        return Math.round(raw * 1000.0) / 1000.0;
    }

    private String truncate(String text, int maxLength) {
        if (text == null) {
            return "";
        }
        String trimmed = text.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, Math.max(1, maxLength - 1)).trim() + "…";
    }

    private record AnchorCourseVector(
            UUID courseId,
            String title,
            String level,
            Map<String, Double> vector,
            double weight
    ) {
    }

    private record ScoredCourse(
            CandidateCourseRow course,
            double score,
            String tier,
            String reasonCode,
            String reasonText
    ) {
    }

    private record FallbackReason(String code, String text) {
    }

    private record ScoredLearningNext(
            String itemType,
            UUID courseId,
            String courseTitle,
            String courseSlug,
            UUID lessonId,
            String lessonTitle,
            String sectionTitle,
            String targetUrl,
            String actionLabel,
            double score,
            String tier,
            String reasonCode,
            String reasonText,
            Integer estimatedMinutes,
            long completedLessons,
            long totalLessons
    ) {
    }
}
