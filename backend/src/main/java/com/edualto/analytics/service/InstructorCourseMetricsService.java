package com.edualto.analytics.service;

import com.edualto.analytics.dto.InstructorCourseMetricsResponse;
import com.edualto.analytics.repository.InstructorCourseMetricsRepository;
import com.edualto.user.service.UserService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InstructorCourseMetricsService {

    private final InstructorCourseMetricsRepository repository;
    private final UserService users;

    public InstructorCourseMetricsService(InstructorCourseMetricsRepository repository, UserService users) {
        this.repository = repository;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<InstructorCourseMetricsResponse> getInstructorCourseMetrics(UUID instructorId) {
        users.requireActiveInstructor(instructorId);
        return repository.findByInstructorId(instructorId);
    }
}
