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

import ru.krezd.diploma.dto.job.BatchJobSubmitRequest;
import ru.krezd.diploma.dto.slurm.SlurmOpenapiResponse;
import ru.krezd.diploma.dto.slurm.job.JobUsageStatsDTO;
import ru.krezd.diploma.dto.slurm.job.SlurmDbJobDTO;
import ru.krezd.diploma.dto.slurm.job.SlurmDbJobsResponseDTO;
import ru.krezd.diploma.dto.slurm.job.SlurmDbTresDTO;
import ru.krezd.diploma.dto.slurm.job.SlurmJobDescMsg;
import ru.krezd.diploma.dto.slurm.job.SlurmJobSubmitResponse;
import ru.krezd.diploma.dto.slurm.job.SlurmJobsResponseDTO;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

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

    @Value("${slurm.db.address}")
    private String slurmdbURL;

    @Autowired
    private FilesService filesService;

    @Value("${root.path}")
    private Path rootPath;

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



    // ── Отправка задания через sbatch CLI ─────────────────────────────────────

    /**
     * Отправляет новое задание в SLURM через sbatch CLI.
     * Генерирует batch-скрипт с #SBATCH директивами и запускает от имени пользователя.
     *
     * @param request параметры задания и тело скрипта
     * @param username имя аутентифицированного пользователя
     * @return ответ с идентификатором созданного задания
     */
    public SlurmJobSubmitResponse submitJob(BatchJobSubmitRequest request, String username) {
        // 1. Генерируем уникальный идентификатор для папки задания
        String jobFolder = generateJobFolder(request.getName(), username);
        Path jobDir = rootPath.resolve(username).resolve(jobFolder);
        Path outputDir = jobDir.resolve("output");

        try {
            filesService.createDirByUser(outputDir.toString(), username);
            log.info("Создана директория задания: {}", jobDir);
        } catch (Exception e) {
            log.warn("Не удалось создать директорию: {}", e.getMessage());
        }

        // 2. Определяем рабочую директорию
        String workDir;
        String reqWorkDir = request.getWorkingDirectory();
        if (reqWorkDir != null && !reqWorkDir.isBlank()) {
            workDir = reqWorkDir.startsWith("/")
                    ? reqWorkDir
                    : rootPath.resolve(reqWorkDir).normalize().toString();
        } else {
            workDir = rootPath.resolve(username).toString();
        }

        // 3. Строим batch-скрипт
        String scriptContent;
        if (request.isRawMode()) {
            // В rawMode скрипт уже содержит #SBATCH директивы — используем как есть
            scriptContent = request.getScriptBody() != null ? request.getScriptBody() : "#!/bin/bash\n";
        } else {
            String jobName = (request.getName() != null && !request.getName().isBlank())
                    ? request.getName() : jobFolder;
            StringBuilder script = new StringBuilder("#!/bin/bash\n");
            script.append("#SBATCH --job-name=").append(jobName).append("\n");
            if (request.getPartition() != null)
                script.append("#SBATCH --partition=").append(request.getPartition()).append("\n");
            if (request.getAccount() != null)
                script.append("#SBATCH --account=").append(request.getAccount()).append("\n");
            if (request.getQos() != null)
                script.append("#SBATCH --qos=").append(request.getQos()).append("\n");
            if (request.getComment() != null)
                script.append("#SBATCH --comment=\"").append(request.getComment()).append("\"\n");
            if (request.getNodes() != null)
                script.append("#SBATCH --nodes=").append(request.getNodes()).append("\n");
            if (request.getNtasks() != null)
                script.append("#SBATCH --ntasks=").append(request.getNtasks()).append("\n");
            if (request.getNtasksPerNode() != null)
                script.append("#SBATCH --ntasks-per-node=").append(request.getNtasksPerNode()).append("\n");
            if (request.getCpusPerTask() != null)
                script.append("#SBATCH --cpus-per-task=").append(request.getCpusPerTask()).append("\n");
            if (request.getTimeLimitMinutes() != null)
                script.append("#SBATCH --time=").append(request.getTimeLimitMinutes()).append("\n");
            if (request.getMemMbPerNode() != null)
                script.append("#SBATCH --mem=").append(request.getMemMbPerNode()).append("M\n");
            if (request.getMemMbPerCpu() != null)
                script.append("#SBATCH --mem-per-cpu=").append(request.getMemMbPerCpu()).append("M\n");
            if (request.getGres() != null)
                script.append("#SBATCH --gres=").append(request.getGres()).append("\n");
            if (request.getDependency() != null)
                script.append("#SBATCH --dependency=").append(request.getDependency()).append("\n");
            if (request.getArray() != null)
                script.append("#SBATCH --array=").append(request.getArray()).append("\n");
            if (request.getReservation() != null)
                script.append("#SBATCH --reservation=").append(request.getReservation()).append("\n");
            if (request.getConstraints() != null)
                script.append("#SBATCH --constraint=").append(request.getConstraints()).append("\n");
            if (Boolean.TRUE.equals(request.getExclusive()))
                script.append("#SBATCH --exclusive\n");
            if (request.getMailUser() != null)
                script.append("#SBATCH --mail-user=").append(request.getMailUser()).append("\n");
            if (request.getMailType() != null && !request.getMailType().isEmpty())
                script.append("#SBATCH --mail-type=").append(String.join(",", request.getMailType())).append("\n");
            script.append("#SBATCH --chdir=").append(workDir).append("\n");
            script.append("#SBATCH --output=").append(outputDir).append("/stdout.log\n");
            script.append("#SBATCH --error=").append(outputDir).append("/stderr.log\n");
            script.append("\n");
            if (request.getScriptBody() != null) {
                script.append(request.getScriptBody());
            }
            scriptContent = script.toString();
        }

        // 4. Сохраняем скрипт в папку задания
        Path scriptPath = jobDir.resolve("job.sh");
        try {
            Files.writeString(scriptPath, scriptContent);
            scriptPath.toFile().setExecutable(true, false);
        } catch (Exception e) {
            throw new RuntimeException("Не удалось записать скрипт задания: " + e.getMessage(), e);
        }

        // 5. Запускаем sbatch от имени пользователя
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "sudo", "-u", username, "sbatch", "--parsable", scriptPath.toString());
            pb.redirectErrorStream(false);
            Process process = pb.start();

            String stdout = new BufferedReader(new InputStreamReader(process.getInputStream()))
                    .lines().collect(Collectors.joining("\n")).trim();
            String stderr = new BufferedReader(new InputStreamReader(process.getErrorStream()))
                    .lines().collect(Collectors.joining("\n")).trim();
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                String errMsg = stderr.isBlank() ? stdout : stderr;
                log.error("sbatch завершился с ошибкой (exit {}): {}", exitCode, errMsg);
                throw new RuntimeException("sbatch завершился с ошибкой: " + errMsg);
            }

            // --parsable вывод: "12345" или "12345;cluster"
            String jobIdStr = stdout.split(";")[0].trim();
            long jobId = Long.parseLong(jobIdStr);

            log.info("Задание принято SLURM: job_id={}, folder={}", jobId, jobFolder);

            SlurmJobSubmitResponse response = new SlurmJobSubmitResponse();
            response.setJobId((int) jobId);
            return response;

        } catch (NumberFormatException e) {
            throw new RuntimeException("Не удалось разобрать job_id из вывода sbatch", e);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Ошибка при запуске sbatch: " + e.getMessage(), e);
        }
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
     * Обновляет параметры существующего задания.
     * Администратор может изменить любое задание.
     * Обычный пользователь — только своё.
     *
     * @param jobId    идентификатор задания
     * @param request  новые параметры задания
     * @param username имя аутентифицированного пользователя
     * @param isAdmin  признак роли ADMIN
     * @return ответ slurmrestd
     */
    public SlurmOpenapiResponse updateJob(Integer jobId, SlurmJobDescMsg request,
                                          String username, boolean isAdmin) {
        if (!isAdmin) {
            verifyJobOwnership((long) jobId, username);
        }
        String url = slurmrestdURL + "job/" + jobId;
        log.info("Обновление задания job_id={} пользователем '{}'", jobId, username);

        return slurmRestTemplate.exchange(
                url,
                HttpMethod.POST,
                new HttpEntity<>(request),
                SlurmOpenapiResponse.class
        ).getBody();
    }

    // ── Архивные задачи (slurmdbd) ────────────────────────────────────────────

    /**
     * Возвращает все завершённые задания из slurmdbd.
     * Только для администраторов.
     *
     * @param startTime фильтр по времени начала (unix timestamp или строка типа "2024-01-01")
     * @param endTime   фильтр по времени завершения
     * @param state     CSV список статусов (COMPLETED,FAILED,CANCELLED и т.д.)
     */
    public SlurmDbJobsResponseDTO getArchivedJobs(String startTime, String endTime, String state) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(slurmdbURL + "jobs");

        // slurmdbd без start_time возвращает только задания начиная с полуночи текущего дня.
        // Устанавливаем дефолт 30 дней назад, если не задан.
        String effectiveStart = (startTime != null && !startTime.isBlank())
                ? startTime
                : String.valueOf(Instant.now().minus(30, ChronoUnit.DAYS).getEpochSecond());
        builder.queryParam("start_time", effectiveStart);

        if (endTime != null && !endTime.isBlank()) {
            builder.queryParam("end_time", endTime);
        }
        if (state != null && !state.isBlank()) {
            builder.queryParam("state", state);
        }

        return slurmRestTemplate.getForObject(builder.toUriString(), SlurmDbJobsResponseDTO.class);
    }

    /**
     * Возвращает завершённые задания конкретного пользователя из slurmdbd.
     *
     * @param username  имя пользователя
     * @param startTime фильтр по времени начала
     * @param endTime   фильтр по времени завершения
     */
    public SlurmDbJobsResponseDTO getUserArchivedJobs(String username,
                                                       String startTime, String endTime) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(slurmdbURL + "jobs")
                .queryParam("users", username);

        String effectiveStart = (startTime != null && !startTime.isBlank())
                ? startTime
                : String.valueOf(Instant.now().minus(30, ChronoUnit.DAYS).getEpochSecond());
        builder.queryParam("start_time", effectiveStart);

        if (endTime != null && !endTime.isBlank()) {
            builder.queryParam("end_time", endTime);
        }

        return slurmRestTemplate.getForObject(builder.toUriString(), SlurmDbJobsResponseDTO.class);
    }

    /**
     * Возвращает архивное задание по идентификатору из slurmdbd.
     */
    public SlurmDbJobsResponseDTO getArchivedJobById(Long jobId) {
        String url = slurmdbURL + "job/" + jobId;
        return slurmRestTemplate.getForObject(url, SlurmDbJobsResponseDTO.class);
    }

    // ── Usage статистика ──────────────────────────────────────────────────────

    /**
     * Возвращает агрегированную usage-статистику по всем заданиям за период.
     * Только для администраторов.
     *
     * @param startTime начало периода (unix timestamp или строка даты, опционально — дефолт 30 дней назад)
     * @param endTime   конец периода (опционально — дефолт сейчас)
     */
    public JobUsageStatsDTO getJobUsageStats(String startTime, String endTime) {
        SlurmDbJobsResponseDTO response = getArchivedJobs(startTime, endTime, null);
        List<SlurmDbJobDTO> jobs = response != null && response.getJobs() != null
                ? response.getJobs()
                : Collections.emptyList();
        return aggregateStats(jobs, startTime, endTime);
    }

    /**
     * Возвращает агрегированную usage-статистику по заданиям конкретного пользователя за период.
     *
     * @param username  имя пользователя
     * @param startTime начало периода (опционально)
     * @param endTime   конец периода (опционально)
     */
    public JobUsageStatsDTO getUserJobUsageStats(String username, String startTime, String endTime) {
        SlurmDbJobsResponseDTO response = getUserArchivedJobs(username, startTime, endTime);
        List<SlurmDbJobDTO> jobs = response != null && response.getJobs() != null
                ? response.getJobs()
                : Collections.emptyList();
        return aggregateStats(jobs, startTime, endTime);
    }

    /**
     * Агрегирует статистику из списка архивных заданий.
     */
    private JobUsageStatsDTO aggregateStats(List<SlurmDbJobDTO> jobs,
                                             String startTime, String endTime) {
        Map<String, Long> byStatus = new HashMap<>();
        double totalCpuHours = 0.0;
        double totalMemGbHours = 0.0;
        long waitTimeSum = 0;
        int waitTimeCount = 0;
        long elapsedSum = 0;
        int elapsedCount = 0;
        long failedNonZero = 0;

        for (SlurmDbJobDTO job : jobs) {
            // Статусы
            List<String> states = job.getState() != null ? job.getState().getCurrent() : null;
            String primaryState = (states != null && !states.isEmpty()) ? states.getFirst() : "UNKNOWN";
            byStatus.merge(primaryState, 1L, Long::sum);

            // Время выполнения и ожидания
            SlurmDbJobDTO.Time time = job.getTime();
            if (time != null) {
                if (time.getElapsed() != null && time.getElapsed() > 0) {
                    elapsedSum += time.getElapsed();
                    elapsedCount++;
                }
                Long start = time.getStart();
                Long submission = time.getSubmission();
                if (start != null && submission != null && start > 0 && submission > 0 && start >= submission) {
                    waitTimeSum += (start - submission);
                    waitTimeCount++;
                }
            }

            // CPU-часы и RAM·часы из TRES allocated
            if (job.getTres() != null && job.getTres().getAllocated() != null && time != null) {
                int elapsed = Objects.requireNonNullElse(time.getElapsed(), 0);
                for (SlurmDbTresDTO tres : job.getTres().getAllocated()) {
                    if ("cpu".equalsIgnoreCase(tres.getType()) && tres.getCount() != null) {
                        totalCpuHours += (tres.getCount() * elapsed) / 3600.0;
                    }
                    if ("mem".equalsIgnoreCase(tres.getType()) && tres.getCount() != null) {
                        // count в mem TRES — мегабайты
                        totalMemGbHours += (tres.getCount() * elapsed) / 3600.0 / 1024.0;
                    }
                }
            }

            // Ненулевой exit code
            if (job.getExitCode() != null
                    && job.getExitCode().getReturnCode() != null
                    && Boolean.TRUE.equals(job.getExitCode().getReturnCode().getSet())
                    && job.getExitCode().getReturnCode().getNumber() != null
                    && job.getExitCode().getReturnCode().getNumber() != 0) {
                failedNonZero++;
            }
        }

        // Определяем границы периода для ответа
        long periodStartTs = startTime != null && !startTime.isBlank()
                ? tryParseTimestamp(startTime)
                : Instant.now().minus(30, ChronoUnit.DAYS).getEpochSecond();
        long periodEndTs = endTime != null && !endTime.isBlank()
                ? tryParseTimestamp(endTime)
                : Instant.now().getEpochSecond();

        return JobUsageStatsDTO.builder()
                .periodStart(periodStartTs)
                .periodEnd(periodEndTs)
                .totalJobs(jobs.size())
                .jobsByStatus(byStatus)
                .totalCpuHours(Math.round(totalCpuHours * 100.0) / 100.0)
                .totalMemGbHours(Math.round(totalMemGbHours * 100.0) / 100.0)
                .avgWaitTimeSeconds(waitTimeCount > 0 ? (double) waitTimeSum / waitTimeCount : 0.0)
                .avgElapsedSeconds(elapsedCount > 0 ? (double) elapsedSum / elapsedCount : 0.0)
                .failedWithNonZeroExit(failedNonZero)
                .build();
    }

    /**
     * Пытается разобрать строку как unix timestamp (число) или возвращает 0.
     */
    private long tryParseTimestamp(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            return 0L;
        }
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

        String jobOwner = jobResponse.getJobs().getFirst().getUserName();
        if (!username.equals(jobOwner)) {
            log.warn("Пользователь '{}' попытался отменить задание job_id={}, владелец: '{}'",
                    username, jobId, jobOwner);
            throw new AccessDeniedException(
                    "Нет прав для отмены задания #" + jobId
            );
        }
    }

    private String generateJobFolder(String name, String username) {
        StringBuilder sb = new StringBuilder();
        if (name != null && !name.isBlank()) {
            sb.append(sanitize(name)).append("-");
        } else {
            sb.append(sanitize(username)).append("-");
        }
        sb.append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss"))).append("-");
        sb.append(String.format("%04d", ThreadLocalRandom.current().nextInt(10000)));
        return sb.toString();
    }

    private String sanitize(String input) {
        return input.replaceAll("[^a-zA-Z0-9]", "_").toLowerCase();
    }

}