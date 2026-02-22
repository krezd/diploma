package ru.krezd.diploma.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import ru.krezd.diploma.dto.slurm.SlurmOpenapiResponse;
import ru.krezd.diploma.dto.slurm.job.SlurmJobDescMsg;
import ru.krezd.diploma.dto.slurm.job.SlurmJobSubmitRequest;
import ru.krezd.diploma.dto.slurm.job.SlurmJobSubmitResponse;
import ru.krezd.diploma.dto.slurm.job.SlurmJobsResponseDTO;

/**
 * Сервис для управления заданиями SLURM через slurmrestd.
 */
@Service
@Slf4j
public class JobsService {

    @Autowired
    @Qualifier("slurmRestTemplate")
    private RestTemplate slurmRestTemplate;

    @Value("${slurm.rest.address}")
    private String slurmrestdURL;

    // ── Чтение ────────────────────────────────────────────────────────────────

    /**
     * Возвращает все задания кластера. Только для администраторов.
     */
    public SlurmJobsResponseDTO getJobs(Long updateTime, String flags) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(slurmrestdURL + "jobs");

        if (updateTime != null) {
            builder.queryParam("update_time", updateTime);
        }
        if (flags != null && !flags.isBlank()) {
            builder.queryParam("flags", flags);
        }

        return slurmRestTemplate.getForObject(builder.toUriString(), SlurmJobsResponseDTO.class);
    }

    /**
     * Возвращает задания конкретного пользователя (фильтрация на стороне бэкенда).
     */
    public SlurmJobsResponseDTO getUserJobs(String username, Long updateTime, String flags) {
        SlurmJobsResponseDTO jobs = getJobs(updateTime, flags);
        if (jobs.getJobs() != null) {
            jobs.setJobs(
                    jobs.getJobs().stream()
                            .filter(job -> username.equals(job.getUserName()))
                            .toList()
            );
        }
        return jobs;
    }

    /**
     * Возвращает задание по его идентификатору.
     */
    public SlurmJobsResponseDTO getJobById(Long jobId, Long updateTime, String flags) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(slurmrestdURL + "job/" + jobId);

        if (updateTime != null) {
            builder.queryParam("update_time", updateTime);
        }
        if (flags != null && !flags.isBlank()) {
            builder.queryParam("flags", flags);
        }

        return slurmRestTemplate.getForObject(builder.toUriString(), SlurmJobsResponseDTO.class);
    }



    // ── Отправка задания ──────────────────────────────────────────────────────

    /**
     * Отправляет новое задание в SLURM.
     * Задание запускается от имени аутентифицированного Linux-пользователя —
     * SlurmAuthInterceptor автоматически подставляет его JWT.
     *
     * @param request описание задания (скрипт + параметры)
     * @return ответ с идентификатором созданного задания
     */
    public SlurmJobSubmitResponse submitJob(SlurmJobSubmitRequest request) {
        String url = slurmrestdURL + "job/submit";
        log.info("Отправка задания в SLURM: name={}", request.getJob() != null ? request.getJob().getName() : "—");

        SlurmJobSubmitResponse response = slurmRestTemplate.postForObject(
                url,
                request,
                SlurmJobSubmitResponse.class
        );

        if (response != null) {
            log.info("Задание принято SLURM: job_id={}", response.getJobId());
        }
        return response;
    }

    // ── Отмена задания ────────────────────────────────────────────────────────

    /**
     * Отменяет задание или отправляет ему сигнал.
     * Пользователь может отменить только своё задание.
     * Администратор может отменить любое задание.
     *
     * @param jobId    идентификатор задания
     * @param username имя аутентифицированного пользователя
     * @param isAdmin  признак роли ADMIN
     * @param signal   сигнал (опционально, по умолчанию SIGKILL)
     * @param flags    флаги отмены (опционально)
     * @throws AccessDeniedException если пользователь пытается отменить чужое задание
     */
    public SlurmOpenapiResponse cancelJob(Long jobId, String username, boolean isAdmin,
                                          String signal, String flags) {
        if (!isAdmin) {
            verifyJobOwnership(jobId, username);
        }

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(slurmrestdURL + "job/" + jobId);

        if (signal != null && !signal.isBlank()) {
            builder.queryParam("signal", signal);
        }
        if (flags != null && !flags.isBlank()) {
            builder.queryParam("flags", flags);
        }

        log.info("Отмена задания job_id={} пользователем '{}'", jobId, username);

        return slurmRestTemplate.exchange(
                builder.toUriString(),
                HttpMethod.DELETE,
                null,
                SlurmOpenapiResponse.class
        ).getBody();
    }

    // ── Обновление задания ────────────────────────────────────────────────────

    /**
     * Обновляет параметры существующего задания. Только для администраторов.
     *
     * @param jobId   идентификатор задания
     * @param request новые параметры задания
     * @return ответ slurmrestd
     */
    public SlurmOpenapiResponse updateJob(Long jobId, SlurmJobDescMsg request) {
        String url = slurmrestdURL + "job/" + jobId;
        log.info("Обновление задания job_id={}", jobId);

        return slurmRestTemplate.exchange(
                url,
                HttpMethod.POST,
                new HttpEntity<>(request),
                SlurmOpenapiResponse.class
        ).getBody();
    }

    // ── Вспомогательные методы ────────────────────────────────────────────────

    /**
     * Проверяет, что пользователь является владельцем задания.
     * Выбрасывает AccessDeniedException если не совпадает.
     */
    private void verifyJobOwnership(Long jobId, String username) {
        SlurmJobsResponseDTO jobResponse = getJobById(jobId, null, null);

        if (jobResponse == null
                || jobResponse.getJobs() == null
                || jobResponse.getJobs().isEmpty()) {
            log.warn("Задание job_id={} не найдено при проверке владения", jobId);
            return; // slurmrestd вернёт 404 при фактическом DELETE
        }

        String jobOwner = jobResponse.getJobs().get(0).getUserName();
        if (!username.equals(jobOwner)) {
            log.warn("Пользователь '{}' попытался отменить задание job_id={}, владелец: '{}'",
                    username, jobId, jobOwner);
            throw new AccessDeniedException(
                    "Нет прав для отмены задания #" + jobId
            );
        }
    }
}