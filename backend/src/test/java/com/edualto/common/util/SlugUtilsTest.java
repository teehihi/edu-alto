package com.edualto.common.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SlugUtilsTest {

    @Test
    void toSlugConvertsVietnameseAndSpecialCharacters() {
        String input = "Lập trình Java Spring Boot 3 & Next.js Cơ Bản Đến Nâng Cao!";
        String slug = SlugUtils.toSlug(input);

        assertThat(slug).isEqualTo("lap-trinh-java-spring-boot-3-nextjs-co-ban-den-nang-cao");
    }

    @Test
    void toSlugHandlesVietnameseDD() {
        String input = "Điểm 10 Đào Tạo & Đạt Chuẩn";
        String slug = SlugUtils.toSlug(input);

        assertThat(slug).isEqualTo("diem-10-dao-tao-dat-chuan");
    }

    @Test
    void toSlugCollapsesMultipleHyphensAndTrims() {
        String input = "   ---Khóa   Học---Thiết Kế---UI/UX---   ";
        String slug = SlugUtils.toSlug(input);

        assertThat(slug).isEqualTo("khoa-hoc-thiet-ke-uiux");
    }

    @Test
    void toSlugHandlesNullOrEmpty() {
        assertThat(SlugUtils.toSlug(null)).isEmpty();
        assertThat(SlugUtils.toSlug("")).isEmpty();
        assertThat(SlugUtils.toSlug("   ")).isEmpty();
    }
}
