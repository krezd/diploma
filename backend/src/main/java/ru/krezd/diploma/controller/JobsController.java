package ru.krezd.diploma.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import ru.krezd.diploma.dto.slurm.SlurmOpenapiResponse;
import ru.krezd.diploma.dto.slurm.job.SlurmJobDescMsg;
import ru.krezd.diploma.dto.slurm.job.SlurmJobSubmitRequest;
import ru.krezd.diploma.dto.slurm.job.SlurmJobSubmitResponse;
import ru.krezd.diploma.dto.slurm.job.SlurmJobsResponseDTO;
import ru.krezd.diploma.service.JobsService;

/**
 * Контроллер для управления заданиями SLURM.
 *
 * <p>Разграничение ролей:
 * <ul>
 *   <li>ADMIN — просмотр всех заданий, обновление любого задания</li>
 *   <li>Любой авторизованный — просмотр своих заданий, отправка и отмена своих заданий</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/slurm")
@RequiredArgsConstructor
public class JobsController {

    private final JobsService jobsService;

    // ── Чтение ────────────────────────────────────────────────────────────────

    /**
     * Возвращает все задания кластера. Только для администраторов.
     */
    @GetMapping("/jobs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SlurmJobsResponseDTO> getJobs(
            @RequestParam(required = false) Long updateTime,
            @RequestParam(required = false) String flags) {

        return ResponseEntity.ok(jobsService.getJobs(updateTime, flags));
    }

    /**
     * Возвращает задания текущего пользователя.
     */
    @GetMapping("/user/jobs")
    public ResponseEntity<SlurmJobsResponseDTO> getUserJobs(
            @RequestParam(required = false) Long updateTime,
            @RequestParam(required = false) String flags,
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(
                jobsService.getUserJobs(userDetails.getUsername(), updateTime, flags)
        );
    }

    /**
     * Возвращает задание по идентификатору.
     * Доступно всем авторизованным пользователям.
     */
    @GetMapping("/job/{jobId}")
    public ResponseEntity<SlurmJobsResponseDTO> getJobById(
            @PathVariable Long jobId,
            @RequestParam(required = false) Long updateTime,
            @RequestParam(required = false) String flags) {

        return ResponseEntity.ok(jobsService.getJobById(jobId, updateTime, flags));
    }

    // ── Отправка задания ──────────────────────────────────────────────────────

    /**
     * Отправляет новое задание в очередь SLURM.
     * Задание выполняется от имени аутентифицированного пользователя.
     * Доступно всем авторизованным пользователям.
     *
     * @param request описание задания (bash-скрипт + параметры)
     * @return идентификатор принятого задания
     */
    @PostMapping("/job/submit")
    public ResponseEntity<SlurmJobSubmitResponse> submitJob(
            @RequestBody SlurmJobSubmitRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        SlurmJobSubmitResponse response = jobsService.submitJob(request);
        return ResponseEntity.ok(response);
    }

    // ── Отмена задания ────────────────────────────────────────────────────────

    /**
     * Отменяет задание или отправляет ему сигнал.
     * Обычный пользователь может отменить только своё задание.
     * Администратор может отменить любое задание.
     *
     * @param jobId    идентификатор задания
     * @param signal   POSIX-сигнал (опционально, по умолчанию SIGKILL)
     * @param flags    флаги отмены (опционально): BATCH_JOB, ARRAY_TASK, FULL_JOB и др.
     */
    @DeleteMapping("/job/{jobId}")
    public ResponseEntity<SlurmOpenapiResponse> cancelJob(
            @PathVariable Long jobId,
            @RequestParam(required = false) String signal,
            @RequestParam(required = false) String flags,
            @AuthenticationPrincipal UserDetails userDetails) {

        boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        SlurmOpenapiResponse response = jobsService.cancelJob(
                jobId, userDetails.getUsername(), isAdmin, signal, flags
        );
        return ResponseEntity.ok(response);
    }

    // ── Обновление задания ────────────────────────────────────────────────────

    /**
     * Обновляет параметры существующего задания (приоритет, лимиты, etc.).
//     * Только для администраторов.
     *
     * @param jobId   идентификатор задания
     * @param request новые параметры задания
     */
    @PostMapping("/job/{jobId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SlurmOpenapiResponse> updateJob(
            @PathVariable Long jobId,
            @RequestBody SlurmJobDescMsg request) {

        return ResponseEntity.ok(jobsService.updateJob(jobId, request));
    }
}