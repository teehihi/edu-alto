package com.edualto.certificate.repository;

import com.edualto.certificate.domain.Certificate;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class CertificateRepository {
    private static final RowMapper<Certificate> CERTIFICATE_ROW_MAPPER = CertificateRepository::mapCertificate;

    private final JdbcTemplate jdbcTemplate;

    public CertificateRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<UUID> findActiveCourseIds(UUID studentId) {
        return jdbcTemplate.query(
                "select course_id from enrollments where student_id = ? and status = 'ACTIVE' order by course_id",
                (resultSet, rowNumber) -> resultSet.getObject("course_id", UUID.class),
                studentId
        );
    }

    public boolean lockActiveEnrollment(UUID studentId, UUID courseId) {
        List<UUID> enrollmentIds = jdbcTemplate.query(
                "select id from enrollments where student_id = ? and course_id = ? and status = 'ACTIVE' for update",
                (resultSet, rowNumber) -> resultSet.getObject("id", UUID.class),
                studentId,
                courseId
        );
        return !enrollmentIds.isEmpty();
    }

    public Optional<Certificate> issueIfEligible(UUID studentId, UUID courseId) {
        List<Certificate> existing = jdbcTemplate.query(
                "select id, certificate_number, course_id, course_title, student_name, instructor_name, issued_at "
                        + "from certificates where student_id = ? and course_id = ?",
                CERTIFICATE_ROW_MAPPER,
                studentId,
                courseId
        );
        if (!existing.isEmpty()) {
            return Optional.of(existing.getFirst());
        }

        int totalLessons = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from lessons l
                        join sections s on s.id = l.section_id
                        where s.course_id = ? and l.status = 'PUBLISHED'
                          and l.lesson_type in ('TEXT', 'VIDEO', 'QUIZ')
                        """,
                Integer.class,
                courseId
        );
        if (totalLessons == 0) {
            return Optional.empty();
        }

        Integer completedLessons = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from learning_progress p
                        join lessons l on l.id = p.lesson_id and l.status = 'PUBLISHED'
                            and l.lesson_type in ('TEXT', 'VIDEO', 'QUIZ')
                        where p.enrollment_id = (
                            select id from enrollments where student_id = ? and course_id = ? and status = 'ACTIVE'
                        ) and p.course_id = ?
                        """,
                Integer.class,
                studentId,
                courseId,
                courseId
        );
        if (completedLessons != totalLessons) {
            return Optional.empty();
        }

        List<Certificate> inserted = jdbcTemplate.query(
                """
                        insert into certificates (
                            id, student_id, course_id, enrollment_id, certificate_number,
                            student_name, course_title, instructor_name, issued_at, created_at
                        )
                        select ?, u.id, c.id, e.id, ?, u.full_name, c.title, instructor.full_name,
                               current_timestamp, current_timestamp
                        from enrollments e
                        join users u on u.id = e.student_id
                        join courses c on c.id = e.course_id
                        join users instructor on instructor.id = c.instructor_id
                        where e.student_id = ? and e.course_id = ? and e.status = 'ACTIVE'
                        on conflict (enrollment_id) do nothing
                        returning id, certificate_number, course_id, course_title, student_name, instructor_name, issued_at
                        """,
                CERTIFICATE_ROW_MAPPER,
                UUID.randomUUID(),
                "EA-" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT),
                studentId,
                courseId
        );
        if (!inserted.isEmpty()) {
            return Optional.of(inserted.getFirst());
        }
        return findByStudentAndCourse(studentId, courseId);
    }

    public List<Certificate> findAllByStudentId(UUID studentId) {
        return jdbcTemplate.query(
                """
                        select id, certificate_number, course_id, course_title, student_name, instructor_name, issued_at
                        from certificates
                        where student_id = ?
                        order by issued_at desc, id
                        """,
                CERTIFICATE_ROW_MAPPER,
                studentId
        );
    }

    public Optional<Certificate> findByStudentIdAndCourseId(UUID studentId, UUID courseId) {
        return findByStudentAndCourse(studentId, courseId);
    }

    private Optional<Certificate> findByStudentAndCourse(UUID studentId, UUID courseId) {
        List<Certificate> certificates = jdbcTemplate.query(
                "select id, certificate_number, course_id, course_title, student_name, instructor_name, issued_at "
                        + "from certificates where student_id = ? and course_id = ?",
                CERTIFICATE_ROW_MAPPER,
                studentId,
                courseId
        );
        return certificates.stream().findFirst();
    }

    private static Certificate mapCertificate(ResultSet resultSet, int rowNumber) throws SQLException {
        return new Certificate(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("certificate_number"),
                resultSet.getObject("course_id", UUID.class),
                resultSet.getString("course_title"),
                resultSet.getString("student_name"),
                resultSet.getString("instructor_name"),
                resultSet.getTimestamp("issued_at").toInstant()
        );
    }
}
