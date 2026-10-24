package com.edualto.common.security;

import com.edualto.user.repository.PermissionRepository;
import java.util.List;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;

@Component
public class PermissionAuthorizationManager implements AuthorizationManager<RequestAuthorizationContext> {

    private static final Logger log = LoggerFactory.getLogger(PermissionAuthorizationManager.class);

    private final PermissionRepository permissionRepository;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public PermissionAuthorizationManager(PermissionRepository permissionRepository) {
        this.permissionRepository = permissionRepository;
    }

    @Override
    public AuthorizationDecision authorize(
            Supplier<? extends Authentication> authenticationSupplier,
            RequestAuthorizationContext context
    ) {
        Authentication authentication = authenticationSupplier.get();
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        String requestPath = context.getRequest().getRequestURI();
        String httpMethod = context.getRequest().getMethod();

        List<String> userRoles = getUserRoles(authentication);

        // Safety fallback: Full Administrator role always bypasses granular checks
        for (String role : userRoles) {
            String cleanRoleName = role.replace("ROLE_", "");
            if ("ADMIN".equalsIgnoreCase(cleanRoleName)) {
                return new AuthorizationDecision(true);
            }
        }

        // Granular RBAC match via Redis-cached permissions per role
        for (String role : userRoles) {
            String cleanRoleName = role.replace("ROLE_", "");
            List<String> permissions = permissionRepository.findPermissionKeysByRoleName(cleanRoleName);
            log.debug("RBAC check: role={}, path={}, method={}, permissionsCount={}",
                    cleanRoleName, requestPath, httpMethod, permissions != null ? permissions.size() : "null");
            if (permissions != null && !permissions.isEmpty()) {
                for (String permission : permissions) {
                    int separator = permission.indexOf(' ');
                    if (separator <= 0 || separator == permission.length() - 1) {
                        continue;
                    }
                    String method = permission.substring(0, separator);
                    String apiPath = permission.substring(separator + 1);
                    if (method.equalsIgnoreCase(httpMethod) && pathMatcher.match(apiPath, requestPath)) {
                        return new AuthorizationDecision(true);
                    }
                }
            }
        }

        return new AuthorizationDecision(false);
    }

    private List<String> getUserRoles(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
    }
}
