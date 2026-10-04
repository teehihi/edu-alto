package com.edualto.auth.repository;

import com.edualto.auth.domain.EmailOtp;
import com.edualto.auth.domain.OtpPurpose;
import com.edualto.user.domain.User;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface EmailOtpRepository extends JpaRepository<EmailOtp, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<EmailOtp> findFirstByUserAndPurposeOrderByCreatedAtDesc(User user, OtpPurpose purpose);
}
