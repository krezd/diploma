package ru.krezd.diploma.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.krezd.diploma.entity.JobTemplate;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobTemplateRepository extends JpaRepository<JobTemplate, Long> {

    /** Шаблоны пользователя + все публичные шаблоны. */
    @Query("SELECT t FROM JobTemplate t WHERE t.username = :username OR t.isPublic = true ORDER BY t.createdAt DESC")
    List<JobTemplate> findVisibleForUser(@Param("username") String username);

    /** Только собственные шаблоны пользователя. */
    List<JobTemplate> findByUsernameOrderByCreatedAtDesc(String username);

    Optional<JobTemplate> findByIdAndUsername(Long id, String username);
}