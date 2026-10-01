package com.edualto.certificate.service;

import com.edualto.certificate.domain.Certificate;
import com.edualto.certificate.dto.CertificateResponse;
import com.edualto.certificate.repository.CertificateRepository;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.service.UserService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CertificateService {
    private final CertificateRepository certificates;
    private final UserService users;

    public CertificateService(CertificateRepository certificates, UserService users) {
        this.certificates = certificates;
        this.users = users;
    }

    @Transactional
    public void issueIfEligible(UUID studentId, UUID courseId) {
        users.requireActiveStudent(studentId);
        if (!certificates.lockActiveEnrollment(studentId, courseId)) {
            return;
        }
        certificates.issueIfEligible(studentId, courseId);
    }

    @Transactional
    public List<CertificateResponse> getMyCertificates(UUID studentId) {
        users.requireActiveStudent(studentId);
        for (UUID courseId : certificates.findActiveCourseIds(studentId)) {
            if (certificates.lockActiveEnrollment(studentId, courseId)) {
                certificates.issueIfEligible(studentId, courseId);
            }
        }
        return certificates.findAllByStudentId(studentId).stream()
                .map(CertificateService::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CertificateResponse getMyCourseCertificate(UUID studentId, UUID courseId) {
        users.requireActiveStudent(studentId);
        return certificates.findByStudentIdAndCourseId(studentId, courseId)
                .map(CertificateService::toResponse)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND,
                        "CERTIFICATE_NOT_FOUND",
                        "Bạn chưa được cấp chứng nhận hoàn thành khóa học này"
                ));
    }

    private static CertificateResponse toResponse(Certificate certificate) {
        return new CertificateResponse(
                certificate.id(),
                certificate.certificateNumber(),
                certificate.courseId(),
                certificate.courseTitle(),
                certificate.studentName(),
                certificate.instructorName(),
                certificate.issuedAt()
        );
    }
}
