package ru.krezd.diploma.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import ru.krezd.diploma.dto.slurm.SlurmOpenapiResponse;
import ru.krezd.diploma.dto.slurm.node.SlurmNodesResponseDTO;
import ru.krezd.diploma.dto.slurm.node.SlurmUpdateNodeRequestDTO;

/**
 * Сервис для работы с узлами SLURM через slurmrestd.
 */
@Service
@Slf4j
public class NodesService {

    @Autowired
    @Qualifier("slurmRestTemplate")
    private RestTemplate slurmRestTemplate;

    @Value("${slurm.rest.address}")
    private String slurmrestdURL;

    @Autowired
    private LinuxUserService linuxUserService;
    // ── Чтение ────────────────────────────────────────────────────────────────

    /**
     * Возвращает список всех узлов кластера.
     */
    public SlurmNodesResponseDTO getNodes(Long updateTime, String flags) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(slurmrestdURL + "nodes");

        if (updateTime != null) {
            builder.queryParam("update_time", updateTime);
        }
        if (flags != null && !flags.isBlank()) {
            builder.queryParam("flags", flags);
        }

        return slurmRestTemplate.getForObject(builder.toUriString(), SlurmNodesResponseDTO.class);
    }

    /**
     * Возвращает информацию о конкретном узле.
     */
    public SlurmNodesResponseDTO getNodeByName(String nodeName, Long updateTime, String flags) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(slurmrestdURL + "node/" + nodeName);

        if (updateTime != null) {
            builder.queryParam("update_time", updateTime);
        }
        if (flags != null && !flags.isBlank()) {
            builder.queryParam("flags", flags);
        }

        return slurmRestTemplate.getForObject(builder.toUriString(), SlurmNodesResponseDTO.class);
    }

    // ── Управление (только ADMIN) ─────────────────────────────────────────────

    /**
     * Обновляет состояние узла (DRAIN, UNDRAIN, DOWN, RESUME и т.д.).
     * Только для администраторов.
     *
     * @param nodeName имя узла
     * @param request  параметры обновления (состояние, причина)
     * @return базовый ответ slurmrestd с meta/errors/warnings
     */
    public SlurmOpenapiResponse updateNode(String nodeName, SlurmUpdateNodeRequestDTO request, String username) {
        String url = slurmrestdURL + "node/" + nodeName;
        log.info("Обновление узла '{}' пользователем '{}': state={}", nodeName, username, request.getState());

        String uid = linuxUserService.getUid(username);
        request.setReasonUid(uid);

        return slurmRestTemplate.exchange(
                url,
                HttpMethod.POST,
                new HttpEntity<>(request),
                SlurmOpenapiResponse.class
        ).getBody();
    }

    /**
     * Удаляет узел из конфигурации SLURM.
     * Только для администраторов.
     *
     * @param nodeName имя узла
     * @return ResponseEntity с результатом операции
     */
    public ResponseEntity<?> deleteNode(String nodeName) {
        try {
            String url = UriComponentsBuilder
                    .fromUriString(slurmrestdURL + "node/" + nodeName)
                    .toUriString();

            ResponseEntity<SlurmOpenapiResponse> response = slurmRestTemplate.exchange(
                    url, HttpMethod.DELETE, null, SlurmOpenapiResponse.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Узел '{}' успешно удалён", nodeName);
            } else {
                log.warn("Удаление узла '{}' вернуло статус {}", nodeName, response.getStatusCode());
            }

            return response;
        } catch (Exception e) {
            log.error("Ошибка при удалении узла '{}': {}", nodeName, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}