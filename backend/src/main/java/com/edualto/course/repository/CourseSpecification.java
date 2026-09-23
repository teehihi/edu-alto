package com.edualto.course.repository;

import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.CourseStatus;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

public final class CourseSpecification {

    private CourseSpecification() {
    }

    public static Specification<Course> buildPublicCatalogSpec(
            String keyword,
            CourseLevel level,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Boolean isFree,
            String language,
            UUID instructorId
    ) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Always only published courses for public catalog
            predicates.add(criteriaBuilder.equal(root.get("status"), CourseStatus.PUBLISHED));

            if (keyword != null && !keyword.isBlank()) {
                String pattern = "%" + keyword.trim().toLowerCase() + "%";
                Predicate titlePredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("title")), pattern);
                Predicate taglinePredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("tagline")), pattern);
                Predicate descriptionPredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), pattern);
                predicates.add(criteriaBuilder.or(titlePredicate, taglinePredicate, descriptionPredicate));
            }

            if (level != null) {
                predicates.add(criteriaBuilder.equal(root.get("level"), level));
            }

            if (Boolean.TRUE.equals(isFree)) {
                predicates.add(criteriaBuilder.equal(root.get("price"), BigDecimal.ZERO));
            } else {
                if (minPrice != null) {
                    predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("price"), minPrice));
                }
                if (maxPrice != null) {
                    predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("price"), maxPrice));
                }
            }

            if (language != null && !language.isBlank()) {
                predicates.add(criteriaBuilder.equal(criteriaBuilder.lower(root.get("language")), language.trim().toLowerCase()));
            }

            if (instructorId != null) {
                predicates.add(criteriaBuilder.equal(root.get("instructorId"), instructorId));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
