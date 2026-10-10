package com.edualto.user.repository;

import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query(
            value = """
                    select distinct instructorUser from User instructorUser join instructorUser.roles assignedRole
                    where assignedRole.name = :roleName and instructorUser.status = :status
                    order by instructorUser.createdAt desc
                    """,
            countQuery = """
                    select count(distinct instructorUser.id) from User instructorUser join instructorUser.roles assignedRole
                    where assignedRole.name = :roleName and instructorUser.status = :status
                    """
    )
    Page<User> findAllByRoleAndStatus(
            @Param("roleName") RoleName roleName,
            @Param("status") UserStatus status,
            Pageable pageable
    );
}
