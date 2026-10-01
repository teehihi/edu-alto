package com.edualto.messaging.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.messaging.dto.ConversationResponse;
import com.edualto.messaging.dto.ConversationStartResponse;
import com.edualto.messaging.dto.MessageResponse;
import com.edualto.messaging.repository.MessagingRepository;
import com.edualto.messaging.repository.MessagingRepository.ConversationState;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MessagingService {
    private final MessagingRepository repository;

    public MessagingService(MessagingRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Page<ConversationResponse> listInstructorConversations(UUID instructorId, int page, int size) {
        requireRole(instructorId, "INSTRUCTOR");
        validatePagination(page, size, 100);
        return new PageImpl<>(repository.listConversations(instructorId, true, page, size),
                PageRequest.of(page, size), repository.countConversations(instructorId, true));
    }

    @Transactional(readOnly = true)
    public Page<ConversationResponse> listStudentConversations(UUID studentId, int page, int size) {
        requireRole(studentId, "STUDENT");
        validatePagination(page, size, 100);
        return new PageImpl<>(repository.listConversations(studentId, false, page, size),
                PageRequest.of(page, size), repository.countConversations(studentId, false));
    }

    @Transactional
    public Page<MessageResponse> openInstructorConversation(UUID instructorId, UUID conversationId, int page, int size) {
        requireRole(instructorId, "INSTRUCTOR");
        validatePagination(page, size, 100);
        ConversationState conversation = requireConversation(conversationId);
        requireInstructorAccess(conversation, instructorId);
        repository.markIncomingRead(conversationId, instructorId);
        return messagePage(conversationId, page, size);
    }

    @Transactional
    public Page<MessageResponse> openStudentConversation(UUID studentId, UUID conversationId, int page, int size) {
        requireRole(studentId, "STUDENT");
        validatePagination(page, size, 100);
        ConversationState conversation = requireConversation(conversationId);
        requireStudentAccess(conversation, studentId);
        repository.markIncomingRead(conversationId, studentId);
        return messagePage(conversationId, page, size);
    }

    @Transactional
    public MessageResponse sendInstructorMessage(UUID instructorId, UUID conversationId, String body) {
        requireRole(instructorId, "INSTRUCTOR");
        ConversationState conversation = requireConversation(conversationId);
        requireInstructorAccess(conversation, instructorId);
        requireRole(conversation.studentId(), "STUDENT");
        return repository.insertMessage(conversationId, instructorId, body);
    }

    @Transactional
    public MessageResponse sendStudentMessage(UUID studentId, UUID conversationId, String body) {
        requireRole(studentId, "STUDENT");
        ConversationState conversation = requireConversation(conversationId);
        requireStudentAccess(conversation, studentId);
        requireRole(conversation.instructorId(), "INSTRUCTOR");
        if (conversation.blockedAt() != null) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "MESSAGING_BLOCKED", "Giảng viên đã tạm dừng nhận tin nhắn từ bạn");
        }
        return repository.insertMessage(conversationId, studentId, body);
    }

    @Transactional
    public ConversationStartResponse startStudentConversation(UUID studentId, UUID instructorId, String body) {
        requireRole(studentId, "STUDENT");
        requireRole(instructorId, "INSTRUCTOR");
        UUID conversationId = repository.openConversation(instructorId, studentId);
        ConversationState conversation = requireConversation(conversationId);
        if (conversation.blockedAt() != null) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "MESSAGING_BLOCKED", "Giảng viên đã tạm dừng nhận tin nhắn từ bạn");
        }
        MessageResponse message = repository.insertMessage(conversationId, studentId, body);
        return new ConversationStartResponse(conversationId, message);
    }

    @Transactional
    public void setBlocked(UUID instructorId, UUID conversationId, boolean blocked) {
        requireRole(instructorId, "INSTRUCTOR");
        ConversationState conversation = requireConversation(conversationId);
        requireInstructorAccess(conversation, instructorId);
        repository.setBlocked(conversationId, blocked);
    }

    @Transactional
    public void hideConversation(UUID instructorId, UUID conversationId) {
        requireRole(instructorId, "INSTRUCTOR");
        ConversationState conversation = requireConversation(conversationId);
        requireInstructorAccess(conversation, instructorId);
        repository.hideForInstructor(conversationId);
    }

    private Page<MessageResponse> messagePage(UUID conversationId, int page, int size) {
        List<MessageResponse> messages = repository.listMessages(conversationId, page, size);
        return new PageImpl<>(messages, PageRequest.of(page, size), repository.countMessages(conversationId));
    }

    private void requireRole(UUID userId, String role) {
        if (!repository.hasActiveRole(userId, role)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, role + "_REQUIRED", "Tài khoản không có quyền thực hiện thao tác này");
        }
    }

    private ConversationState requireConversation(UUID conversationId) {
        return repository.findConversation(conversationId).orElseThrow(() ->
                new BusinessException(HttpStatus.NOT_FOUND, "CONVERSATION_NOT_FOUND", "Không tìm thấy cuộc trò chuyện"));
    }

    private void requireInstructorAccess(ConversationState conversation, UUID instructorId) {
        if (!conversation.instructorId().equals(instructorId) || conversation.hiddenAt() != null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "CONVERSATION_NOT_FOUND", "Không tìm thấy cuộc trò chuyện");
        }
    }

    private void requireStudentAccess(ConversationState conversation, UUID studentId) {
        if (!conversation.studentId().equals(studentId)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "CONVERSATION_NOT_FOUND", "Không tìm thấy cuộc trò chuyện");
        }
    }

    private void validatePagination(int page, int size, int maxSize) {
        if (page < 0 || size < 1 || size > maxSize) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PAGINATION", "Tham số phân trang không hợp lệ");
        }
    }
}
