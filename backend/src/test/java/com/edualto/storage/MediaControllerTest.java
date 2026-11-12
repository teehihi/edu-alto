package com.edualto.storage;

import com.edualto.storage.controller.MediaController;
import com.edualto.storage.dto.ObjectMetadata;
import com.edualto.storage.service.StorageService;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class MediaControllerTest {

    @Mock
    private StorageService storageService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new MediaController(storageService)).build();
    }

    @Test
    void blocksLessonResourcesWithoutCallingStorage() throws Exception {
        mockMvc.perform(get("/api/v1/media/lesson-resources/course-1/lesson-1/secret.pdf"))
                .andExpect(status().isNotFound());

        verify(storageService, never()).objectExists(anyString());
        verify(storageService, never()).openObjectStream(anyString());
        verify(storageService, never()).getObjectBytes(anyString());
    }

    @Test
    void blocksCourseVideosWithoutCallingStorage() throws Exception {
        mockMvc.perform(get("/api/v1/media/course-videos/course-1/lesson-1/video.mp4"))
                .andExpect(status().isNotFound());

        verify(storageService, never()).objectExists(anyString());
        verify(storageService, never()).openObjectStream(anyString());
        verify(storageService, never()).getObjectBytes(anyString());
    }

    @Test
    void rejectsPathTraversalWithoutCallingStorage() throws Exception {
        mockMvc.perform(get("/api/v1/media/../lesson-resources/secret.pdf"))
                .andExpect(status().is(anyOf(is(400), is(404))));

        mockMvc.perform(get("/api/v1/media/avatars/../lesson-resources/secret.pdf"))
                .andExpect(status().is(anyOf(is(400), is(404))));

        verify(storageService, never()).objectExists(anyString());
        verify(storageService, never()).openObjectStream(anyString());
        verify(storageService, never()).getObjectBytes(anyString());
    }

    @Test
    void streamsPublicAvatarWithImmutableCacheHeaders() throws Exception {
        String key = "avatars/user-1/pic.webp";
        byte[] payload = "webp-avatar-bytes".getBytes(StandardCharsets.UTF_8);
        when(storageService.objectExists(key)).thenReturn(true);
        when(storageService.getObjectMetadata(key)).thenReturn(new ObjectMetadata("image/webp", payload.length, "\"etag-1\""));
        when(storageService.openObjectStream(key)).thenReturn(new ByteArrayInputStream(payload));

        MvcResult mvcResult = mockMvc.perform(get("/api/v1/media/" + key))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(mvcResult))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "image/webp"))
                .andExpect(header().longValue(HttpHeaders.CONTENT_LENGTH, payload.length))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=31536000, public, immutable"))
                .andExpect(header().string(HttpHeaders.ETAG, "\"etag-1\""))
                .andExpect(content().bytes(payload));

        verify(storageService, never()).getObjectBytes(anyString());
        verify(storageService).openObjectStream(key);
    }

    @Test
    void returnsNotModifiedWhenEtagMatches() throws Exception {
        String key = "courses/thumbnails/inst-1/thumb.webp";
        when(storageService.objectExists(key)).thenReturn(true);
        when(storageService.getObjectMetadata(key)).thenReturn(new ObjectMetadata("image/webp", 1024L, "\"etag-thumb\""));

        mockMvc.perform(get("/api/v1/media/" + key)
                        .header(HttpHeaders.IF_NONE_MATCH, "\"etag-thumb\""))
                .andExpect(status().isNotModified())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=31536000, public, immutable"))
                .andExpect(header().string(HttpHeaders.ETAG, "\"etag-thumb\""));

        verify(storageService, never()).openObjectStream(anyString());
        verify(storageService, never()).getObjectBytes(anyString());
    }
}
