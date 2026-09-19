package com.edualto.profile.repository;

import com.edualto.profile.domain.StudentProfile;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, UUID> {
}
