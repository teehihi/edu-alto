package com.edualto.user.repository;

import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoleRepository extends JpaRepository<Role, UUID> {

    Optional<Role> findByName(RoleName name);

    @Query("SELECT DISTINCT r FROM Role r LEFT JOIN FETCH r.permissions ORDER BY r.name ASC")
    List<Role> findAllWithPermissions();

    @Query("SELECT r FROM Role r LEFT JOIN FETCH r.permissions WHERE r.id = :id")
    Optional<Role> findByIdWithPermissions(@Param("id") UUID id);

    @Query(value = "SELECT COUNT(*) FROM user_roles WHERE role_id = :roleId", nativeQuery = true)
    long countUsersByRoleId(@Param("roleId") UUID roleId);
}
