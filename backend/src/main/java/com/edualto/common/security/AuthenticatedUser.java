package com.edualto.common.security;

import java.security.Principal;
import java.util.Collection;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public record AuthenticatedUser(
        UUID id,
        String email,
        Collection<? extends GrantedAuthority> authorities
) implements UserDetails, Principal {

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return "";
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getName() {
        return id != null ? id.toString() : email;
    }
}
