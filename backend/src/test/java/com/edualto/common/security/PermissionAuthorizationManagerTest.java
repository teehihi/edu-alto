package com.edualto.common.security;

import com.edualto.user.repository.PermissionRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class PermissionAuthorizationManagerTest {

    @Mock
    private PermissionRepository permissionRepository;

    private PermissionAuthorizationManager authorizationManager;

    @BeforeEach
    void setUp() {
        authorizationManager = new PermissionAuthorizationManager(permissionRepository);
    }

    @Test
    void authorize_adminAlwaysGranted() {
        MockHttpServletRequest request = new MockHttpServletRequest("DELETE", "/api/v1/any/endpoint");
        UsernamePasswordAuthenticationToken authentication = UsernamePasswordAuthenticationToken.authenticated(
                "admin", "", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        AuthorizationDecision decision = authorizationManager.authorize(
                () -> authentication,
                new RequestAuthorizationContext(request));

        assertThat(decision).isNotNull();
        assertThat(decision.isGranted()).isTrue();
    }

    @Test
    void authorize_matchesCachedPermission() {
        Mockito.when(permissionRepository.findPermissionKeysByRoleName("INSTRUCTOR"))
                .thenReturn(List.of("GET /api/v1/instructor/courses/**"));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/instructor/courses/123/sections");
        UsernamePasswordAuthenticationToken authentication = UsernamePasswordAuthenticationToken.authenticated(
                "instructor", "", List.of(new SimpleGrantedAuthority("ROLE_INSTRUCTOR")));

        AuthorizationDecision decision = authorizationManager.authorize(
                () -> authentication,
                new RequestAuthorizationContext(request));

        assertThat(decision).isNotNull();
        assertThat(decision.isGranted()).isTrue();
    }

    @Test
    void authorize_deniesWhenMethodDoesNotMatch() {
        Mockito.when(permissionRepository.findPermissionKeysByRoleName("INSTRUCTOR"))
                .thenReturn(List.of("GET /api/v1/instructor/courses/**"));

        MockHttpServletRequest request = new MockHttpServletRequest("DELETE", "/api/v1/instructor/courses/123");
        UsernamePasswordAuthenticationToken authentication = UsernamePasswordAuthenticationToken.authenticated(
                "instructor", "", List.of(new SimpleGrantedAuthority("ROLE_INSTRUCTOR")));

        AuthorizationDecision decision = authorizationManager.authorize(
                () -> authentication,
                new RequestAuthorizationContext(request));

        assertThat(decision).isNotNull();
        assertThat(decision.isGranted()).isFalse();
    }

    @Test
    void authorize_deniesUnauthenticated() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/instructor/courses");
        AuthorizationDecision decision = authorizationManager.authorize(
                () -> null,
                new RequestAuthorizationContext(request));

        assertThat(decision).isNotNull();
        assertThat(decision.isGranted()).isFalse();
    }
}
