package com.edualto.admin.service;

import com.edualto.admin.dto.AdminPermissionDto;
import com.edualto.admin.dto.AdminRoleDetailResponse;
import com.edualto.admin.dto.UpdateRolePermissionsRequest;
import com.edualto.common.config.RedisCacheConfig;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.domain.Permission;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.repository.PermissionRepository;
import com.edualto.user.repository.RoleRepository;
import com.edualto.user.service.UserService;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminRbacService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserService userService;
    private final CacheManager cacheManager;

    public AdminRbacService(
            RoleRepository roleRepository,
            PermissionRepository permissionRepository,
            UserService userService,
            CacheManager cacheManager
    ) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.userService = userService;
        this.cacheManager = cacheManager;
    }

    @Transactional(readOnly = true)
    public List<AdminRoleDetailResponse> getRoles(UUID adminId) {
        userService.requireActiveAdmin(adminId);
        List<Role> roles = roleRepository.findAllWithPermissions();
        return roles.stream()
                .map(this::toRoleDetailResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminRoleDetailResponse getRoleById(UUID adminId, UUID roleId) {
        userService.requireActiveAdmin(adminId);
        Role role = roleRepository.findByIdWithPermissions(roleId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "ROLE_NOT_FOUND", "Không tìm thấy vai trò"));
        return toRoleDetailResponse(role);
    }

    @Transactional(readOnly = true)
    public List<AdminPermissionDto> getAllPermissions(UUID adminId) {
        userService.requireActiveAdmin(adminId);
        return permissionRepository.findAllByOrderByModuleAscNameAsc().stream()
                .map(this::toPermissionDto)
                .toList();
    }

    @Transactional
    public AdminRoleDetailResponse updateRolePermissions(
            UUID adminId,
            UUID roleId,
            UpdateRolePermissionsRequest request
    ) {
        userService.requireActiveAdmin(adminId);
        Role role = roleRepository.findByIdWithPermissions(roleId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "ROLE_NOT_FOUND", "Không tìm thấy vai trò"));

        List<Permission> resolvedPermissions = permissionRepository.findAllByIdIn(request.permissionIds());

        // Safety check: Admin role must retain core admin permissions
        if (role.getName() == RoleName.ADMIN && resolvedPermissions.isEmpty()) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "ADMIN_PERMISSIONS_REQUIRED",
                    "Vai trò Quản trị viên (ADMIN) phải có ít nhất một quyền quản trị"
            );
        }

        if (request.description() != null && !request.description().isBlank()) {
            role.setDescription(request.description().trim());
        }

        Set<Permission> newPermissions = new HashSet<>(resolvedPermissions);
        role.setPermissions(newPermissions);
        Role savedRole = roleRepository.save(role);

        // Evict Redis Cache for this role so the changes take effect immediately
        evictRolePermissionsCache(role.getName().name());

        return toRoleDetailResponse(savedRole);
    }

    private void evictRolePermissionsCache(String roleName) {
        if (cacheManager != null) {
            Cache cache = cacheManager.getCache(RedisCacheConfig.CACHE_ROLE_PERMISSIONS);
            if (cache != null) {
                cache.evict(roleName);
            }
        }
    }

    private AdminRoleDetailResponse toRoleDetailResponse(Role role) {
        long userCount = roleRepository.countUsersByRoleId(role.getId());
        List<AdminPermissionDto> permissionDtos = role.getPermissions().stream()
                .sorted(Comparator.comparing(Permission::getModule).thenComparing(Permission::getName))
                .map(this::toPermissionDto)
                .toList();

        return new AdminRoleDetailResponse(
                role.getId(),
                role.getName().name(),
                role.getDescription(),
                userCount,
                permissionDtos,
                role.getCreatedAt(),
                role.getUpdatedAt()
        );
    }

    private AdminPermissionDto toPermissionDto(Permission p) {
        return new AdminPermissionDto(
                p.getId(),
                p.getName(),
                p.getApiPath(),
                p.getMethod(),
                p.getModule(),
                p.getDescription(),
                p.getCreatedAt()
        );
    }
}
