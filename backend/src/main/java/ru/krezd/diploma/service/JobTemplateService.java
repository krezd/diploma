package ru.krezd.diploma.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import ru.krezd.diploma.dto.job.JobTemplateDTO;
import ru.krezd.diploma.entity.JobTemplate;
import ru.krezd.diploma.repository.JobTemplateRepository;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobTemplateService {

    private final JobTemplateRepository repository;

    /** Возвращает шаблоны, видимые пользователю (свои + публичные). */
    public List<JobTemplateDTO> getVisibleTemplates(String username) {
        return repository.findVisibleForUser(username)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    /** Возвращает только собственные шаблоны пользователя. */
    public List<JobTemplateDTO> getMyTemplates(String username) {
        return repository.findByUsernameOrderByCreatedAtDesc(username)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    /** Создаёт новый шаблон для пользователя. */
    public JobTemplateDTO createTemplate(String username, JobTemplateDTO request) {
        JobTemplate template = JobTemplate.builder()
                .name(request.getName())
                .description(request.getDescription())
                .username(username)
                .isPublic(request.isPublic())
                .mode(request.getMode() != null ? request.getMode() : "CONSTRUCTOR")
                .jobDescJson(request.getJobDescJson())
                .scriptTemplate(request.getScriptTemplate())
                .build();

        JobTemplate saved = repository.save(template);
        log.info("Шаблон '{}' создан пользователем '{}'", saved.getName(), username);
        return toDTO(saved);
    }

    /** Обновляет шаблон. Только владелец или ADMIN. */
    public JobTemplateDTO updateTemplate(Long id, String username, boolean isAdmin, JobTemplateDTO request) {
        JobTemplate template = repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Шаблон #" + id + " не найден"));

        if (!isAdmin && !template.getUsername().equals(username)) {
            throw new AccessDeniedException("Нет прав для изменения шаблона #" + id);
        }

        template.setName(request.getName());
        template.setDescription(request.getDescription());
        template.setPublic(request.isPublic());
        template.setMode(request.getMode() != null ? request.getMode() : template.getMode());
        template.setJobDescJson(request.getJobDescJson());
        template.setScriptTemplate(request.getScriptTemplate());

        JobTemplate saved = repository.save(template);
        log.info("Шаблон #{} обновлён пользователем '{}'", id, username);
        return toDTO(saved);
    }

    /** Удаляет шаблон. Только владелец или ADMIN. */
    public void deleteTemplate(Long id, String username, boolean isAdmin) {
        JobTemplate template = repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Шаблон #" + id + " не найден"));

        if (!isAdmin && !template.getUsername().equals(username)) {
            throw new AccessDeniedException("Нет прав для удаления шаблона #" + id);
        }

        repository.delete(template);
        log.info("Шаблон #{} удалён пользователем '{}'", id, username);
    }

    private JobTemplateDTO toDTO(JobTemplate t) {
        return JobTemplateDTO.builder()
                .id(t.getId())
                .name(t.getName())
                .description(t.getDescription())
                .username(t.getUsername())
                .isPublic(t.isPublic())
                .mode(t.getMode())
                .jobDescJson(t.getJobDescJson())
                .scriptTemplate(t.getScriptTemplate())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }
}