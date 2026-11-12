package com.edualto.support.repository;

import com.edualto.support.domain.ContactMessage;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactMessageRepository extends JpaRepository<ContactMessage, UUID> {
}
