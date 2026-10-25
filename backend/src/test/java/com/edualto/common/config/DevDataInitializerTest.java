package com.edualto.common.config;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.edualto.course.repository.CourseRepository;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DevDataInitializerTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private DataSource dataSource;

    @Mock
    private Connection connection;

    @Mock
    private Statement statement;

    private DevDataInitializer initializer;

    @BeforeEach
    void setUp() {
        initializer = new DevDataInitializer(courseRepository, dataSource);
    }

    @Test
    @DisplayName("Should skip seeding when database already contains courses")
    void shouldSkipSeedingWhenCoursesAlreadyExist() {
        when(courseRepository.count()).thenReturn(3L);

        initializer.run(null);

        verify(courseRepository).count();
        verifyNoInteractions(dataSource);
    }

    @Test
    @DisplayName("Should execute SQL script and commit when database has no courses")
    void shouldExecuteSeedingWhenCourseCountIsZero() throws SQLException {
        when(courseRepository.count()).thenReturn(0L, 4L);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.getAutoCommit()).thenReturn(true);
        when(connection.createStatement()).thenReturn(statement);
        when(statement.execute(anyString())).thenReturn(true);

        initializer.run(null);

        verify(connection).setAutoCommit(false);
        verify(connection).commit();
        verify(connection).setAutoCommit(true);
        verify(connection, never()).rollback();
    }

    @Test
    @DisplayName("Should rollback transaction when SQL script execution fails")
    void shouldRollbackWhenExecutionFails() throws SQLException {
        when(courseRepository.count()).thenReturn(0L);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.getAutoCommit()).thenReturn(true);
        when(connection.createStatement()).thenThrow(new SQLException("Simulated syntax error"));

        assertDoesNotThrow(() -> initializer.run(null));

        verify(connection).setAutoCommit(false);
        verify(connection).rollback();
        verify(connection).setAutoCommit(true);
        verify(connection, never()).commit();
    }

    @Test
    @DisplayName("Should handle database connection failure gracefully without throwing")
    void shouldHandleDataSourceConnectionFailureGracefully() throws SQLException {
        when(courseRepository.count()).thenReturn(0L);
        when(dataSource.getConnection()).thenThrow(new SQLException("Connection pool exhausted"));

        assertDoesNotThrow(() -> initializer.run(null));

        verify(courseRepository).count();
    }
}
