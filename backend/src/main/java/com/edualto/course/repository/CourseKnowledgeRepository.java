package com.edualto.course.repository;

import com.edualto.course.dto.CourseKnowledgePassageDto;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CourseKnowledgeRepository {
    private static final Pattern WORDS = Pattern.compile("[\\p{L}\\p{N}]{2,40}");
    private static final Set<String> STOP_WORDS = Set.of("tôi", "bạn", "cho", "của", "các", "những", "mình", "muốn", "cần", "về",
            "thì", "là", "và", "hay", "với", "trên", "trong", "này", "đó", "để", "được", "không", "hãy", "giúp", "nào", "thế",
            "tóm", "tắt", "khóa", "học", "bài", "tìm", "phù", "hợp", "the", "and", "for", "what", "how", "can", "you");
    private final NamedParameterJdbcTemplate jdbc;

    public CourseKnowledgeRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<CourseKnowledgePassageDto> retrieve(UUID userId, boolean canViewOwned, UUID courseId, String query) {
        List<String> terms = WORDS.matcher(query.toLowerCase(Locale.ROOT)).results().map(match -> match.group())
                .filter(word -> !STOP_WORDS.contains(word)).distinct().limit(16).toList();
        String search = terms.stream().map(word -> word + ":*").collect(Collectors.joining(" | "));
        MapSqlParameterSource params = new MapSqlParameterSource("userId", userId).addValue("search", search).addValue("canViewOwned", canViewOwned);
        String scope = courseId == null ? "" : " AND c.id = :courseId ";
        if (courseId != null) params.addValue("courseId", courseId);
        String courseVector = "to_tsvector('simple', coalesce(c.title,'') || ' ' || coalesce(c.description,''))";
        String lessonVector = "to_tsvector('simple', coalesce(l.title,'') || ' ' || coalesce(l.description,'') || ' ' || coalesce(l.content,''))";
        String courseMatch = search.isEmpty() ? "" : " AND " + courseVector + " @@ to_tsquery('simple', :search) ";
        String lessonMatch = search.isEmpty() ? "" : " AND " + lessonVector + " @@ to_tsquery('simple', :search) ";
        String courseOrder = search.isEmpty() ? "c.updated_at DESC" : "ts_rank(" + courseVector + ", to_tsquery('simple', :search)) DESC";
        String lessonOrder = search.isEmpty() ? "s.position, l.position" : "ts_rank(" + lessonVector + ", to_tsquery('simple', :search)) DESC";
        List<CourseKnowledgePassageDto> result = new ArrayList<>();
        result.addAll(jdbc.query("""
                SELECT c.id, c.title, c.slug, c.instructor_id, c.status, left(c.description, 5000) AS body
                FROM courses c JOIN users u ON u.id = c.instructor_id
                WHERE ((c.status = 'PUBLISHED' AND u.status = 'ACTIVE' AND u.email_verified_at IS NOT NULL)
                  OR (:canViewOwned AND c.instructor_id = :userId AND c.status <> 'ARCHIVED'))
                """ + scope + courseMatch + " ORDER BY " + courseOrder + " LIMIT 4", params,
                (row, number) -> new CourseKnowledgePassageDto("course:" + row.getString("id"), row.getString("title"),
                        "DRAFT".equals(row.getString("status")) && canViewOwned && userId.equals(row.getObject("instructor_id", UUID.class))
                                ? "/instructor/courses/" + row.getString("id") + "/chapters/overview"
                                : "/courses/" + row.getString("slug"), plain(row.getString("body")))));
        if (search.isEmpty() && courseId == null) return List.copyOf(result);
        String body = search.isEmpty() ? "left(coalesce(l.description,'') || ' ' || coalesce(l.content,''), 5000)"
                : "ts_headline('simple', regexp_replace(coalesce(l.description,'') || ' ' || coalesce(l.content,''), '<[^>]*>', ' ', 'g'), "
                        + "to_tsquery('simple', :search), 'MaxWords=200, MinWords=60, MaxFragments=3')";
        result.addAll(jdbc.query("""
                SELECT l.id, c.title AS course_title, l.title, c.instructor_id, c.id AS course_id, c.slug,
                EXISTS (SELECT 1 FROM enrollments access_e WHERE access_e.course_id = c.id
                  AND access_e.student_id = :userId AND access_e.status = 'ACTIVE') AS enrolled,
                """ + body + """ 
                AS body FROM lessons l JOIN sections s ON s.id = l.section_id
                JOIN courses c ON c.id = s.course_id JOIN users u ON u.id = c.instructor_id
                WHERE l.lesson_type IN ('TEXT', 'VIDEO') AND l.status <> 'ARCHIVED'
                AND ((:canViewOwned AND c.instructor_id = :userId AND c.status <> 'ARCHIVED') OR
                  (c.status = 'PUBLISHED' AND l.status = 'PUBLISHED' AND u.status = 'ACTIVE' AND u.email_verified_at IS NOT NULL
                    AND (l.is_preview = true OR EXISTS (SELECT 1 FROM enrollments e
                      WHERE e.course_id = c.id AND e.student_id = :userId AND e.status = 'ACTIVE'))))
                """ + scope + lessonMatch + " ORDER BY " + lessonOrder + " LIMIT 6", params,
                (row, number) -> new CourseKnowledgePassageDto("lesson:" + row.getString("id"),
                        row.getString("course_title") + " — " + row.getString("title"),
                        canViewOwned && userId.equals(row.getObject("instructor_id", UUID.class))
                                ? "/instructor/courses/" + row.getString("course_id") + "/chapters/overview"
                                : row.getBoolean("enrolled") ? "/learning/lessons/" + row.getString("id")
                                : "/courses/" + row.getString("slug") + "#curriculum", plain(row.getString("body")))));
        return List.copyOf(result);
    }

    private static String plain(String text) {
        return text == null ? "" : text.replaceAll("<[^>]*>", " ").replace("&nbsp;", " ")
                .replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&").strip();
    }
}
