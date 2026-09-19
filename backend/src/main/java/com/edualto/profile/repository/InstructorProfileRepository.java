package com.edualto.profile.repository;

import com.edualto.profile.domain.InstructorProfile;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstructorProfileRepository extends JpaRepository<InstructorProfile, UUID> {
}
