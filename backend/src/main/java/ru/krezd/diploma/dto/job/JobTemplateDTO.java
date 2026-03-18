package ru.krezd.diploma.dto.job;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * DTO для передачи шаблона задания на фронт и обратно.
 * Используется и для запросов (create/update) и для ответов.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobTemplateDTO {

    private Long id;

    private String name;

    private String description;

    /** Только в ответах — имя владельца. */
    private String username;

    @JsonProperty("isPublic")
    private boolean isPublic;

    /** CONSTRUCTOR или SCRIPT. */
    private String mode;

    /** Сериализованный SlurmJobDescMsg (JSON-строка). */
    private String jobDescJson;

    /** Bash-скрипт. */
    private String scriptTemplate;

    private Instant createdAt;
    private Instant updatedAt;
}