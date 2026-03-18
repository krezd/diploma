package ru.krezd.diploma.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import ru.krezd.diploma.dto.job.JobTemplateDTO;
import ru.krezd.diploma.service.JobTemplateService;

import java.util.List;

/**
 * Управление шаблонами заданий SLURM.
 *
 * <ul>
 *   <li>GET  /api/jobs/templates        — шаблоны, видимые пользователю (свои + публичные)</li>
 *   <li>POST /api/jobs/templates        — создать шаблон</li>
 *   <li>PUT  /api/jobs/templates/{id}   — обновить шаблон</li>
 *   <li>DELETE /api/jobs/templates/{id} — удалить шаблон</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/jobs/templates")
@RequiredArgsConstructor
public class JobTemplateController {

    private final JobTemplateService templateService;

    @GetMapping
    public ResponseEntity<List<JobTemplateDTO>> getTemplates(
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(templateService.getVisibleTemplates(userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<JobTemplateDTO> createTemplate(
            @RequestBody JobTemplateDTO request,
            @AuthenticationPrincipal UserDetails userDetails) {

        JobTemplateDTO created = templateService.createTemplate(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobTemplateDTO> updateTemplate(
            @PathVariable Long id,
            @RequestBody JobTemplateDTO request,
            @AuthenticationPrincipal UserDetails userDetails) {

        boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        JobTemplateDTO updated = templateService.updateTemplate(
                id, userDetails.getUsername(), isAdmin, request
        );
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        templateService.deleteTemplate(id, userDetails.getUsername(), isAdmin);
        return ResponseEntity.noContent().build();
    }
}