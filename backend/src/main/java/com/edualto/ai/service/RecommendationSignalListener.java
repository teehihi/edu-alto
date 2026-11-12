package com.edualto.ai.service;

import com.edualto.ai.repository.RecommendationRepository;
import com.edualto.learning.domain.CourseWishlistEvent;
import com.edualto.learning.domain.LearningActivityRecordedEvent;
import com.edualto.learning.domain.LearningActivityType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class RecommendationSignalListener {

    private static final Logger log = LoggerFactory.getLogger(RecommendationSignalListener.class);

    private final RecommendationRepository repository;

    public RecommendationSignalListener(RecommendationRepository repository) {
        this.repository = repository;
    }

    @EventListener
    public void onLearningActivityRecorded(LearningActivityRecordedEvent event) {
        if (event == null || event.studentId() == null || event.activityType() == null) {
            return;
        }
        try {
            String signalType = mapSignalType(event.activityType());
            if (signalType == null) {
                return;
            }
            double weight = mapSignalWeight(event.activityType());
            repository.insertSignal(
                    event.studentId(),
                    event.courseId(),
                    event.lessonId(),
                    signalType,
                    event.sourceId(),
                    weight,
                    event.metadata(),
                    event.occurredAt()
            );
            repository.invalidateUserSnapshots(event.studentId(), null);
        } catch (RuntimeException ex) {
            log.warn("Không thể ghi nhận learning signal từ sự kiện {}: {}", event.activityType(), ex.getMessage());
        }
    }

    @EventListener
    public void onCourseWishlistChanged(CourseWishlistEvent event) {
        if (event == null || event.userId() == null || event.courseId() == null) {
            return;
        }
        try {
            repository.insertSignal(
                    event.userId(),
                    event.courseId(),
                    null,
                    event.added() ? "COURSE_WISHLISTED" : "COURSE_UNWISHLISTED",
                    null,
                    event.added() ? 3.0 : -1.0,
                    null,
                    event.occurredAt()
            );
            repository.invalidateUserSnapshots(event.userId(), "COURSE");
        } catch (RuntimeException ex) {
            log.warn("Không thể ghi nhận wishlist signal cho khóa học {}: {}", event.courseId(), ex.getMessage());
        }
    }

    private String mapSignalType(LearningActivityType type) {
        return switch (type) {
            case COURSE_ENROLLED -> "COURSE_ENROLLED";
            case COURSE_COMPLETED -> "COURSE_COMPLETED";
            case LESSON_COMPLETED -> "LESSON_COMPLETED";
            case QUIZ_SUBMITTED -> "QUIZ_SUBMITTED";
            case ASSIGNMENT_GRADED -> "ASSIGNMENT_GRADED";
            default -> null;
        };
    }

    private double mapSignalWeight(LearningActivityType type) {
        return switch (type) {
            case COURSE_ENROLLED -> 4.0;
            case COURSE_COMPLETED -> 3.0;
            case QUIZ_SUBMITTED -> 2.0;
            case ASSIGNMENT_GRADED -> 2.0;
            case LESSON_COMPLETED -> 1.5;
            default -> 1.0;
        };
    }
}
