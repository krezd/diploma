package ru.krezd.diploma.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "job_templates")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(length = 512)
    private String description;

    /** Владелец шаблона (username). */
    @Column(nullable = false, length = 64)
    private String username;

    /** Публичный шаблон — виден всем пользователям. */
    @Column(nullable = false)
    @Builder.Default
    private boolean isPublic = false;

    /** Режим: CONSTRUCTOR или SCRIPT. */
    @Column(nullable = false, length = 16)
    @Builder.Default
    private String mode = "CONSTRUCTOR";

    /** Сериализованный SlurmJobDescMsg (JSON). */
    @Column(columnDefinition = "TEXT")
    private String jobDescJson;

    /** Bash-скрипт для поля script в /job/submit. */
    @Column(columnDefinition = "TEXT")
    private String scriptTemplate;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}