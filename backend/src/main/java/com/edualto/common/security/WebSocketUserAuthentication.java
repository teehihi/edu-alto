package com.edualto.common.security;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

public final class WebSocketUserAuthentication extends UsernamePasswordAuthenticationToken {

    private final AuthenticatedUser user;

    public WebSocketUserAuthentication(AuthenticatedUser user) {
        super(user, null, user.getAuthorities());
        this.user = user;
    }

    @Override
    public String getName() {
        return user.getName();
    }

    @Override
    public boolean equals(Object obj) {
        return obj instanceof WebSocketUserAuthentication other && super.equals(other);
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }
}
