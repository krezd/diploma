package ru.krezd.diploma.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.krezd.diploma.dto.slurm.diag.SlurmDiagResponse;
import ru.krezd.diploma.dto.slurm.ping.SlurmPingResponse;
import ru.krezd.diploma.service.SlurmDiagnosticService;

/**
 * Контроллер для получения диагностики кластера SLURM.
 * Все методы доступны только администраторам —
 * диагностика содержит детальную техническую информацию о работе планировщика.
 */
@RestController
@RequestMapping("/api/slurm")
@RequiredArgsConstructor
public class SlurmDiagnosticController {

    private final SlurmDiagnosticService slurmDiagnosticService;

    /**
     * Возвращает статистику планировщика SLURM:
     * счётчики заданий (submitted, running, pending, failed и т.д.),
     * метрики цикла планирования и backfill-цикла.
     * Только для администраторов.
     */
    @GetMapping("/diag")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SlurmDiagResponse> getDiagnostics() {
        return ResponseEntity.ok(slurmDiagnosticService.getDiagnostics());
    }

    /**
     * Проверяет доступность контроллеров SLURM (slurmctld).
     * Возвращает статус и задержку для каждого контроллера.
     * Только для администраторов.
     */
    @GetMapping("/ping")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SlurmPingResponse> getPing() {
        return ResponseEntity.ok(slurmDiagnosticService.getPing());
    }
}