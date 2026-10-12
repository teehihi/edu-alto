package com.edualto.quiz.repository;

import com.edualto.quiz.domain.QuizAttemptSession;
import com.edualto.quiz.domain.QuizAttemptSessionStatus;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuizAttemptSessionRepository extends JpaRepository<QuizAttemptSession, UUID> {
    Optional<QuizAttemptSession> findFirstByQuizIdAndStudentIdAndStatusOrderByStartedAtDesc(
            UUID quizId,
            UUID studentId,
            QuizAttemptSessionStatus status
    );

    @Query("""
            select case when count(attemptSession) > 0 then true else false end
            from QuizAttemptSession attemptSession
            where attemptSession.quizId = :quizId
                and attemptSession.status = :activeStatus
                and (
                    (attemptSession.expiresAt is not null and attemptSession.expiresAt > :nowMinusGrace)
                    or (attemptSession.expiresAt is null and attemptSession.startedAt > :staleBefore)
                )
            """)
    boolean existsCurrentSession(
            @Param("quizId") UUID quizId,
            @Param("activeStatus") QuizAttemptSessionStatus activeStatus,
            @Param("nowMinusGrace") Instant nowMinusGrace,
            @Param("staleBefore") Instant staleBefore
    );

    @Modifying
    @Query("""
            update QuizAttemptSession attemptSession
            set attemptSession.status = :expiredStatus, attemptSession.updatedAt = current_timestamp
            where attemptSession.quizId = :quizId
                and attemptSession.status = :activeStatus
                and (
                    (attemptSession.expiresAt is not null and attemptSession.expiresAt <= :nowMinusGrace)
                    or (attemptSession.expiresAt is null and attemptSession.startedAt <= :staleBefore)
                )
            """)
    int expireInactiveSessions(
            @Param("quizId") UUID quizId,
            @Param("activeStatus") QuizAttemptSessionStatus activeStatus,
            @Param("expiredStatus") QuizAttemptSessionStatus expiredStatus,
            @Param("nowMinusGrace") Instant nowMinusGrace,
            @Param("staleBefore") Instant staleBefore
    );
}
