package com.edualto.profile.repository;

import com.edualto.profile.domain.Profile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    Optional<Profile> findByCustomHandleIgnoreCase(String customHandle);

    boolean existsByCustomHandleIgnoreCaseAndUserIdNot(String customHandle, UUID userId);

    boolean existsByCustomHandleIgnoreCase(String customHandle);
}
