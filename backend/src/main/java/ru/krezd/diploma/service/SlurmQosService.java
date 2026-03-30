package ru.krezd.diploma.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import ru.krezd.diploma.dto.CreateQosRequest;
// import ru.krezd.diploma.dto.slurm.qos.SlurmDbQosRawResponseDTO; // используется только в закомментированном REST-методе
import ru.krezd.diploma.dto.slurm.qos.SlurmQosListResponseDTO;
import ru.krezd.diploma.dto.slurm.qos.SlurmQosSummaryDTO;
import ru.krezd.diploma.dto.slurm.qos.SlurmTresItemDTO;
import ru.krezd.diploma.dto.slurm.qos.SlurmTresRawResponseDTO;
// REST-enrichment imports (закомментировано, см. getQosListRest ниже)
// import ru.krezd.diploma.dto.slurm.account.SlurmAssociationDTO;
// import ru.krezd.diploma.dto.slurm.account.SlurmAssociationsResponseDTO;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Сервис для управления QOS в slurmdbd.
 *
 * <p>READ  — через REST slurmrestd (GET /slurmdb/v0.0.40/qos).</p>
 * <p>WRITE — через sacctmgr CLI (add/modify/delete qos).</p>
 */
@Service
@Slf4j
public class SlurmQosService {

    @Autowired
    @Qualifier("slurmRestTemplate")
    private RestTemplate slurmRestTemplate;

    @Autowired
    private SlurmCliRunner cliRunner;

    @Value("${slurm.db.address}")
    private String slurmDbAddress;

    // ── READ (CLI) ────────────────────────────────────────────────────────────

    /**
     * Возвращает все QOS из slurmdbd через sacctmgr CLI.
     * {@code sacctmgr -P show qos}
     *
     * <p>CLI-подход используется вместо REST, т.к. эндпоинт /slurmdb/v0.0.40/qos
     * в v0.0.40 не возвращает GrpSubmitJobs, GrpTresMins, GrpTresRunMins.</p>
     */
    /**
     * Формат запроса к sacctmgr — явно перечисляем поля, чтобы получить Description, ID, LimitFactor, MinPrioThresh,
     * которые отсутствуют в выводе по умолчанию. Порядок не важен: заголовок парсится динамически.
     */
    private static final String QOS_FORMAT =
            "Name,ID,Description,Priority,GraceTime,Flags,UsageThres,UsageFactor," +
            "GrpTRES,GrpTRESMins,GrpTRESRunMins,GrpJobs,GrpJobsAccrue,GrpSubmit,GrpWall," +
            "MaxTRES,MaxTRESPerNode,MaxTRESMins,MaxWall," +
            "MaxTRESPU,MaxJobsPU,MaxJobsAccruePU,MaxSubmitPU," +
            "MaxTRESPA,MaxJobsPA,MaxJobsAccruePA,MaxSubmitPA," +
            "MinTRES,LimitFactor,MinPrioThresh";

    public SlurmQosListResponseDTO getQosList() {
        try {
            String output = cliRunner.runSacctmgrShow("-P", "show", "qos", "format=" + QOS_FORMAT);
            List<SlurmQosSummaryDTO> summaries = parseQosFromCliOutput(output);
            return new SlurmQosListResponseDTO(summaries);
        } catch (Exception e) {
            log.error("Не удалось получить QOS через sacctmgr: {}", e.getMessage());
            throw new RuntimeException("Не удалось получить список QOS: " + e.getMessage(), e);
        }
    }

    /**
     * Возвращает QOS, отфильтрованные по набору имён.
     * Используется для отображения лимитов QOS конкретного пользователя.
     */
    public SlurmQosListResponseDTO getQosListByNames(Set<String> names) {
        if (names == null || names.isEmpty()) {
            return new SlurmQosListResponseDTO(List.of());
        }
        SlurmQosListResponseDTO all = getQosList();
        List<SlurmQosSummaryDTO> filtered = all.getQos().stream()
                .filter(q -> q.getName() != null && names.contains(q.getName()))
                .collect(Collectors.toList());
        return new SlurmQosListResponseDTO(filtered);
    }

    /** Парсит вывод {@code sacctmgr -P show qos} в список DTO. */
    private List<SlurmQosSummaryDTO> parseQosFromCliOutput(String output) {
        if (output == null || output.isBlank()) return List.of();
        String[] lines = output.split("\n");
        if (lines.length < 2) return List.of();

        // Первая строка — заголовки
        Map<String, Integer> colIdx = new HashMap<>();
        String[] headers = lines[0].split("\\|", -1);
        for (int i = 0; i < headers.length; i++) {
            colIdx.put(headers[i].trim(), i);
        }

        List<SlurmQosSummaryDTO> result = new ArrayList<>();
        for (int row = 1; row < lines.length; row++) {
            String line = lines[row].trim();
            if (line.isBlank()) continue;
            String[] cols = line.split("\\|", -1);
            SlurmQosSummaryDTO dto = buildQosDtoFromCols(cols, colIdx);
            if (dto.getName() != null && !dto.getName().isBlank()) {
                result.add(dto);
            }
        }
        return result;
    }

    private SlurmQosSummaryDTO buildQosDtoFromCols(String[] cols, Map<String, Integer> idx) {
        SlurmQosSummaryDTO dto = new SlurmQosSummaryDTO();
        dto.setId(qosParseId(col(cols, idx, "ID")));
        dto.setName(col(cols, idx, "Name"));
        dto.setDescription(qosParseStr(col(cols, idx, "Descr")));
        dto.setPriority(qosParseUint(col(cols, idx, "Priority")));
        dto.setFlags(qosParseFlags(col(cols, idx, "Flags")));
        dto.setGraceTime(qosParseGraceTime(col(cols, idx, "GraceTime")));
        dto.setUsageFactor(qosParseDouble(col(cols, idx, "UsageFactor")));
        // sacctmgr выводит "UsageThres", не "UsageThreshold"
        dto.setUsageThreshold(qosParseDouble(col(cols, idx, "UsageThres")));
        dto.setLimitFactor(qosParseDouble(col(cols, idx, "LimitFactor")));
        dto.setMinPrioThreshold(qosParseUint(col(cols, idx, "MinPrioThres")));

        // Групповые лимиты
        dto.setGrpJobs(qosParseUint(col(cols, idx, "GrpJobs")));
        dto.setGrpJobsAccrue(qosParseUint(col(cols, idx, "GrpJobsAccrue")));
        // sacctmgr выводит "GrpSubmit", не "GrpSubmitJobs"
        dto.setGrpSubmitJobs(qosParseUint(col(cols, idx, "GrpSubmit")));
        dto.setGrpWallMinutes(qosParseWall(col(cols, idx, "GrpWall")));
        dto.setGrpTres(qosParseTres(col(cols, idx, "GrpTRES")));
        dto.setGrpTresMins(qosParseTres(col(cols, idx, "GrpTRESMins")));
        dto.setGrpTresRunMins(qosParseTres(col(cols, idx, "GrpTRESRunMins")));

        // Лимиты на пользователя (sacctmgr использует суффикс PU = PerUser)
        dto.setMaxJobsPerUser(qosParseUint(col(cols, idx, "MaxJobsPU")));
        dto.setMaxJobsAccruePerUser(qosParseUint(col(cols, idx, "MaxJobsAccruePU")));
        dto.setMaxSubmitJobsPerUser(qosParseUint(col(cols, idx, "MaxSubmitPU")));
        dto.setMaxTresPerUser(qosParseTres(col(cols, idx, "MaxTRESPU")));

        // Лимиты на аккаунт (sacctmgr использует суффикс PA = PerAccount)
        dto.setMaxJobsPerAccount(qosParseUint(col(cols, idx, "MaxJobsPA")));
        dto.setMaxJobsAccruePerAccount(qosParseUint(col(cols, idx, "MaxJobsAccruePA")));
        dto.setMaxSubmitJobsPerAccount(qosParseUint(col(cols, idx, "MaxSubmitPA")));
        dto.setMaxTresPerAccount(qosParseTres(col(cols, idx, "MaxTRESPA")));

        // Лимиты на задание
        dto.setMaxWallDurationPerJobMinutes(qosParseWall(col(cols, idx, "MaxWall")));
        dto.setMaxTresPerJob(qosParseTres(col(cols, idx, "MaxTRES")));
        dto.setMaxTresPerNode(qosParseTres(col(cols, idx, "MaxTRESPerNode")));
        dto.setMaxTresMinsPerJob(qosParseTres(col(cols, idx, "MaxTRESMins")));
        // sacctmgr выводит "MinTRES", не "MinTRESPerJob"
        dto.setMinTresPerJob(qosParseTres(col(cols, idx, "MinTRES")));

        return dto;
    }

    // ── CLI parse helpers ─────────────────────────────────────────────────────

    private static String col(String[] cols, Map<String, Integer> idx, String name) {
        Integer i = idx.get(name);
        return (i != null && i < cols.length) ? cols[i].trim() : null;
    }

    private static Long qosParseUint(String s) {
        if (s == null || s.isBlank() || s.equalsIgnoreCase("N")) return null;
        if (s.equalsIgnoreCase("UNLIMITED")) return -1L;
        try { return Long.parseLong(s); } catch (NumberFormatException e) { return null; }
    }

    private static Integer qosParseId(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Integer.parseInt(s); } catch (NumberFormatException e) { return null; }
    }

    private static String qosParseStr(String s) {
        return (s == null || s.isBlank() || s.equalsIgnoreCase("N")) ? null : s;
    }

    private static String qosParseTres(String s) {
        return (s == null || s.isBlank() || s.equalsIgnoreCase("N")) ? null : s;
    }

    private static List<String> qosParseFlags(String s) {
        if (s == null || s.isBlank() || s.equalsIgnoreCase("N")) return List.of();
        return Arrays.stream(s.split(","))
                .map(String::trim)
                .filter(f -> !f.isEmpty())
                .collect(Collectors.toList());
    }

    private static Double qosParseDouble(String s) {
        if (s == null || s.isBlank() || s.equalsIgnoreCase("N")) return null;
        if (s.equalsIgnoreCase("UNLIMITED")) return -1.0;
        try { return Double.parseDouble(s); } catch (NumberFormatException e) { return null; }
    }

    /**
     * Парсит GraceTime: сначала как целое число (секунды), затем как HH:MM:SS.
     * "N" / пусто → null, "UNLIMITED" → -1.
     */
    private static Integer qosParseGraceTime(String s) {
        if (s == null || s.isBlank() || s.equalsIgnoreCase("N")) return null;
        if (s.equalsIgnoreCase("UNLIMITED")) return -1;
        try { return Integer.parseInt(s); } catch (NumberFormatException ignore) {}
        try {
            String[] parts = s.split(":");
            if (parts.length == 3) {
                return Integer.parseInt(parts[0]) * 3600
                        + Integer.parseInt(parts[1]) * 60
                        + Integer.parseInt(parts[2]);
            }
        } catch (NumberFormatException ignore) {}
        return null;
    }

    /**
     * Парсит wall-time формат sacctmgr (HH:MM:SS или D-HH:MM:SS) в минуты.
     * "N" / пусто → null, "UNLIMITED" → -1.
     */
    private static Long qosParseWall(String s) {
        if (s == null || s.isBlank() || s.equalsIgnoreCase("N")) return null;
        if (s.equalsIgnoreCase("UNLIMITED")) return -1L;
        try {
            long days = 0;
            String timeStr = s;
            if (s.contains("-")) {
                String[] dp = s.split("-", 2);
                days = Long.parseLong(dp[0]);
                timeStr = dp[1];
            }
            String[] parts = timeStr.split(":");
            long h = Long.parseLong(parts[0]);
            long m = parts.length > 1 ? Long.parseLong(parts[1]) : 0;
            return days * 24 * 60 + h * 60 + m;
        } catch (Exception e) { return null; }
    }

    // ── СТАРЫЙ REST-метод (закомментирован, см. getQosList выше) ─────────────
    /*
    public SlurmQosListResponseDTO getQosListRest() {
        SlurmDbQosRawResponseDTO raw = slurmRestTemplate.getForObject(
                slurmDbAddress + "qos",
                SlurmDbQosRawResponseDTO.class
        );
        // Поля GrpSubmitJobs, GrpTresMins, GrpTresRunMins обогащались из /associations,
        // но это не давало нужного результата т.к. это лимиты ассоциации, а не QOS.
        List<SlurmQosSummaryDTO> summaries = List.of();
        if (raw != null && raw.getQos() != null) {
            summaries = raw.getQos().stream()
                    .map(SlurmQosSummaryDTO::from)
                    .collect(Collectors.toList());
        }
        return new SlurmQosListResponseDTO(summaries);
    }
    */

    /**
     * Возвращает все TRES из slurmdbd.
     * GET /slurmdb/v0.0.40/tres
     */
    public List<SlurmTresItemDTO> getTresList() {
        SlurmTresRawResponseDTO raw = slurmRestTemplate.getForObject(
                slurmDbAddress + "tres",
                SlurmTresRawResponseDTO.class
        );
        return (raw != null && raw.getTres() != null) ? raw.getTres() : List.of();
    }

    // ── WRITE (CLI) ───────────────────────────────────────────────────────────

    /**
     * Создаёт новый QOS через sacctmgr.
     * {@code sacctmgr -i add qos name=<n> [параметры...]}
     */
    public void createQos(CreateQosRequest req) {
        try {
            List<String> args = new ArrayList<>(List.of("add", "qos", "name=" + req.getName()));
            if (req.getDescription() != null && !req.getDescription().isBlank()) {
                args.add("description=" + req.getDescription());
            }
            appendQosArgs(args, req);
            cliRunner.runSacctmgr(args.toArray(String[]::new));
            log.info("Создан QOS: {}", req.getName());
        } catch (Exception e) {
            throw new RuntimeException("Не удалось создать QOS '" + req.getName() + "': " + e.getMessage(), e);
        }
    }

    /**
     * Изменяет существующий QOS через sacctmgr.
     * Только не-null поля включаются в команду.
     * {@code sacctmgr -i modify qos where name=<n> set [...]}
     */
    public void modifyQos(String qosName, CreateQosRequest req) {
        try {
            List<String> args = new ArrayList<>(List.of(
                    "modify", "qos", "where", "name=" + qosName, "set"));
            if (req.getDescription() != null) {
                args.add("description=" + req.getDescription());
            }
            appendQosArgs(args, req);
            cliRunner.runSacctmgr(args.toArray(String[]::new));
            log.info("Обновлён QOS: {}", qosName);
        } catch (Exception e) {
            throw new RuntimeException("Не удалось обновить QOS '" + qosName + "': " + e.getMessage(), e);
        }
    }

    /**
     * Удаляет QOS через sacctmgr.
     * {@code sacctmgr -i delete qos where name=<n>}
     */
    public void deleteQos(String qosName) {
        try {
            cliRunner.runSacctmgr("delete", "qos", "where", "name=" + qosName);
            log.info("Удалён QOS: {}", qosName);
        } catch (Exception e) {
            throw new RuntimeException("Не удалось удалить QOS '" + qosName + "': " + e.getMessage(), e);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Добавляет все параметры QOS в список аргументов sacctmgr.
     * Только не-null и непустые значения включаются.
     *
     * <p>Числовые лимиты: -1 преобразуется в UNLIMITED через {@link SlurmCliRunner#minutesToHhMmSs}
     * только для wall-time полей; для числовых полей -1 передаётся как есть (sacctmgr интерпретирует
     * -1 как UNLIMITED для числовых параметров).</p>
     */
    private void appendQosArgs(List<String> args, CreateQosRequest req) {
        // Основные параметры
        if (req.getPriority() != null)          args.add("priority=" + req.getPriority());
        if (req.getFlags() != null && !req.getFlags().isEmpty())
                                                 args.add("flags=" + String.join(",", req.getFlags()));
        if (req.getGraceTime() != null)          args.add("gracetime=" + req.getGraceTime());
        if (req.getUsageFactor() != null)        args.add("usagefactor=" + req.getUsageFactor());
        if (req.getUsageThreshold() != null)     args.add("usagethreshold=" + req.getUsageThreshold());
        if (req.getLimitFactor() != null)        args.add("limitfactor=" + req.getLimitFactor());
        if (req.getMinPrioThreshold() != null)   args.add("minpriothresh=" + req.getMinPrioThreshold());

        // Групповые лимиты QOS
        if (req.getGrpJobs() != null)            args.add("grpjobs=" + req.getGrpJobs());
        if (req.getGrpJobsAccrue() != null)      args.add("grpjobsaccrue=" + req.getGrpJobsAccrue());
        if (req.getGrpSubmitJobs() != null)      args.add("grpsubmitjobs=" + req.getGrpSubmitJobs());
        if (req.getGrpWallMinutes() != null)
                                                 args.add("grpwall=" + SlurmCliRunner.minutesToHhMmSs(req.getGrpWallMinutes()));
        if (notBlank(req.getGrpTres()))          args.add("grptres=" + req.getGrpTres().trim());
        if (notBlank(req.getGrpTresMins()))      args.add("grptresmins=" + req.getGrpTresMins().trim());
        if (notBlank(req.getGrpTresRunMins()))   args.add("grptresrunmins=" + req.getGrpTresRunMins().trim());

        // Лимиты на пользователя
        if (req.getMaxJobsPerUser() != null)            args.add("maxjobsperuser=" + req.getMaxJobsPerUser());
        if (req.getMaxJobsAccruePerUser() != null)      args.add("maxjobsaccrueperuser=" + req.getMaxJobsAccruePerUser());
        if (req.getMaxSubmitJobsPerUser() != null)      args.add("maxsubmitjobsperuser=" + req.getMaxSubmitJobsPerUser());
        if (notBlank(req.getMaxTresPerUser()))          args.add("maxtresperuser=" + req.getMaxTresPerUser().trim());

        // Лимиты на аккаунт
        if (req.getMaxJobsPerAccount() != null)         args.add("maxjobsperaccount=" + req.getMaxJobsPerAccount());
        if (req.getMaxJobsAccruePerAccount() != null)   args.add("maxjobsaccrueperaccount=" + req.getMaxJobsAccruePerAccount());
        if (req.getMaxSubmitJobsPerAccount() != null)   args.add("maxsubmitjobsperaccount=" + req.getMaxSubmitJobsPerAccount());
        if (notBlank(req.getMaxTresPerAccount()))       args.add("maxtresperaccount=" + req.getMaxTresPerAccount().trim());

        // Лимиты на задание
        if (notBlank(req.getMaxTresPerJob()))           args.add("maxtresperjob=" + req.getMaxTresPerJob().trim());
        if (notBlank(req.getMaxTresPerNode()))          args.add("maxtrespernode=" + req.getMaxTresPerNode().trim());
        if (notBlank(req.getMaxTresMinsPerJob()))       args.add("maxtresminsperjob=" + req.getMaxTresMinsPerJob().trim());
        if (req.getMaxWallDurationPerJobMinutes() != null)
                                                        args.add("maxwalldurationperjob=" +
                                                                SlurmCliRunner.minutesToHhMmSs(req.getMaxWallDurationPerJobMinutes()));

        // Минимальные лимиты
        if (notBlank(req.getMinTresPerJob()))           args.add("mintresperjob=" + req.getMinTresPerJob().trim());
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}