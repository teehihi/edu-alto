package com.edualto.admin.service;

import com.edualto.profile.domain.InstructorProfile;
import com.edualto.profile.domain.Profile;
import com.edualto.profile.domain.StudentProfile;
import com.edualto.profile.repository.InstructorProfileRepository;
import com.edualto.profile.repository.ProfileRepository;
import com.edualto.profile.repository.StudentProfileRepository;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.repository.RoleRepository;
import com.edualto.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdminAccountInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountInitializer.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ProfileRepository profileRepository;
    private final InstructorProfileRepository instructorProfileRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;

    public AdminAccountInitializer(
            UserRepository userRepository,
            RoleRepository roleRepository,
            ProfileRepository profileRepository,
            InstructorProfileRepository instructorProfileRepository,
            StudentProfileRepository studentProfileRepository,
            PasswordEncoder passwordEncoder,
            @Value("${edualto.admin.email:admin@edualto.vn}") String adminEmail,
            @Value("${edualto.admin.password:}") String adminPassword
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.profileRepository = profileRepository;
        this.instructorProfileRepository = instructorProfileRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail != null ? adminEmail.trim().toLowerCase() : "";
        this.adminPassword = adminPassword != null ? adminPassword.trim() : "";
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (adminPassword.isBlank() || adminEmail.isBlank()) {
            log.info("Bỏ qua khởi tạo tài khoản quản trị viên: Chưa cấu hình EDUALTO_ADMIN_PASSWORD.");
            return;
        }

        Role adminRole = roleRepository.findByName(RoleName.ADMIN)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.ADMIN, "Quản trị viên hệ thống")));
        Role instructorRole = roleRepository.findByName(RoleName.INSTRUCTOR)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.INSTRUCTOR, "Giảng viên")));
        Role studentRole = roleRepository.findByName(RoleName.STUDENT)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.STUDENT, "Học viên")));

        User user = userRepository.findByEmail(adminEmail).orElse(null);
        if (user == null) {
            user = new User("Quản trị viên EduAlto", adminEmail, passwordEncoder.encode(adminPassword));
            user.activate();
            user.addRole(adminRole);
            user.addRole(instructorRole);
            user.addRole(studentRole);
            user = userRepository.save(user);
            log.info("Đã tạo mới tài khoản quản trị viên hệ thống: {}", adminEmail);
        } else {
            user.changePassword(passwordEncoder.encode(adminPassword));
            user.activate();
            user.addRole(adminRole);
            user.addRole(instructorRole);
            user.addRole(studentRole);
            userRepository.save(user);
            log.info("Đã đồng bộ mật khẩu và vai trò cho tài khoản quản trị viên: {}", adminEmail);
        }

        final User savedUser = user;
        if (!profileRepository.existsById(savedUser.getId())) {
            Profile profile = new Profile(savedUser.getId(), "Quản trị viên nền tảng EduAlto", "Tài khoản quản trị điều hành hệ thống.", null);
            profileRepository.save(profile);
        }

        if (!instructorProfileRepository.existsById(savedUser.getId())) {
            InstructorProfile instructorProfile = new InstructorProfile(savedUser.getId(), "Công nghệ thông tin & Giáo dục trực tuyến");
            instructorProfileRepository.save(instructorProfile);
        }

        if (!studentProfileRepository.existsById(savedUser.getId())) {
            StudentProfile studentProfile = new StudentProfile(savedUser.getId(), "Quản trị toàn diện hệ thống EduAlto");
            studentProfileRepository.save(studentProfile);
        }
    }
}
