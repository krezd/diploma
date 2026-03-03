package ru.krezd.diploma.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.krezd.diploma.dto.slurm.config.SlurmDbConfigResponseDTO;
import ru.krezd.diploma.service.SlurmConfigService;

/**
 * Контроллер для получения конфигурации slurmdbd.
 * Доступен только администраторам.
 */
@RestController
@RequestMapping("/api/slurm")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class SlurmConfigController {

    private final SlurmConfigService slurmConfigService;

    @GetMapping("/db/config")
    public ResponseEntity<?> getDbConfig() {
        try {
            SlurmDbConfigResponseDTO config = slurmConfigService.getConfig();
            return ResponseEntity.ok(config);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при получении конфигурации slurmdbd: " + e.getMessage());
        }
    }
}