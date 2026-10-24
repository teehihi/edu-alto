package com.edualto.user.repository;

import com.edualto.common.config.RedisCacheConfig;
import com.edualto.user.domain.Permission;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, UUID> {

    List<Permission> findAllByOrderByModuleAscNameAsc();

    List<Permission> findByModuleOrderByMethodAscApiPathAsc(String module);

    List<Permission> findAllByIdIn(Collection<UUID> ids);

    @Cacheable(value = RedisCacheConfig.CACHE_ROLE_PERMISSIONS, key = "#roleName")
    @Query(value = """
            SELECT CONCAT(p.method, ' ', p.api_path)
            FROM permissions p
            JOIN roles_permissions rp ON p.id = rp.permission_id
            JOIN roles r ON r.id = rp.role_id
            WHERE r.name = :roleName
            """, nativeQuery = true)
    List<String> findPermissionKeysByRoleName(@Param("roleName") String roleName);
}
