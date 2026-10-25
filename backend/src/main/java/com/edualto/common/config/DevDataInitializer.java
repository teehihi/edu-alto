package com.edualto.common.config;

import java.sql.Connection;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;
import com.edualto.course.repository.CourseRepository;

/**
 * Initializes realistic sample course and commerce data in local/dev environments.
 * Strictly locked to 'dev' and 'local' profiles so it never executes in test or production.
 */
@Component
@Profile({"dev", "local"})
@Order(100)
public class DevDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataInitializer.class);
    private static final String SEED_SCRIPT_PATH = "db/dev-data/seed-dev-courses.sql";

    private final CourseRepository courseRepository;
    private final DataSource dataSource;

    public DevDataInitializer(CourseRepository courseRepository, DataSource dataSource) {
        this.courseRepository = courseRepository;
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        long courseCount = courseRepository.count();
        if (courseCount > 0) {
            log.info("DevDataInitializer: Database already contains {} course(s). Skipping dev data seeding.", courseCount);
            return;
        }

        log.info("DevDataInitializer: No courses found. Seeding initial dev courses data from '{}'...", SEED_SCRIPT_PATH);

        try (Connection connection = dataSource.getConnection()) {
            boolean originalAutoCommit = connection.getAutoCommit();
            try {
                connection.setAutoCommit(false);
                ClassPathResource resource = new ClassPathResource(SEED_SCRIPT_PATH);
                ScriptUtils.executeSqlScript(connection, resource);
                connection.commit();
                log.info("DevDataInitializer: Successfully completed dev data seeding. New course count: {}", courseRepository.count());
            } catch (Exception ex) {
                connection.rollback();
                log.error("DevDataInitializer: Error during execution of '{}'. Transaction rolled back.", SEED_SCRIPT_PATH, ex);
            } finally {
                connection.setAutoCommit(originalAutoCommit);
            }
        } catch (Exception ex) {
            log.error("DevDataInitializer: Could not acquire database connection for dev seeding.", ex);
        }
    }
}
