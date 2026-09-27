package com.edualto.common.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CookieHelperTest {

    @Test
    void buildsLocalRefreshCookieWithLaxAndWithoutSecure() {
        CookieHelper helper = new CookieHelper(false, "", "Lax", 14);
        MockHttpServletResponse response = new MockHttpServletResponse();

        helper.setRefreshTokenCookie(response, "token-value");

        String header = response.getHeader("Set-Cookie");
        assertTrue(header.contains("edualto.refresh=token-value"));
        assertTrue(header.contains("Path=/api/v1/auth"));
        assertTrue(header.contains("HttpOnly"));
        assertTrue(header.contains("SameSite=Lax"));
        assertTrue(header.contains("Max-Age=1209600"));
        assertTrue(!header.contains("; Secure"));
    }

    @Test
    void supportsSecureCrossSiteCookieAndClearing() {
        CookieHelper helper = new CookieHelper(true, ".example.com", "None", 14);
        MockHttpServletResponse response = new MockHttpServletResponse();

        helper.setRefreshTokenCookie(response, "token-value");
        helper.clearRefreshTokenCookie(response);

        assertEquals(2, response.getHeaders("Set-Cookie").size());
        String setHeader = response.getHeaders("Set-Cookie").get(0);
        String clearHeader = response.getHeaders("Set-Cookie").get(1);
        assertTrue(setHeader.contains("SameSite=None"));
        assertTrue(setHeader.contains("; Secure"));
        assertTrue(setHeader.contains("Domain=.example.com"));
        assertTrue(clearHeader.contains("edualto.refresh="));
        assertTrue(clearHeader.contains("Max-Age=0"));
        assertTrue(clearHeader.contains("SameSite=None"));
        assertTrue(clearHeader.contains("; Secure"));
    }

    @Test
    void rejectsSameSiteNoneWithoutSecure() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> new CookieHelper(false, "", "None", 14)
        );

        assertTrue(exception.getMessage().contains("AUTH_COOKIE_SECURE=true"));
    }

    @Test
    void rejectsUnsupportedSameSiteValue() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> new CookieHelper(true, "", "Invalid", 14)
        );

        assertTrue(exception.getMessage().contains("Lax, Strict, or None"));
    }
}
