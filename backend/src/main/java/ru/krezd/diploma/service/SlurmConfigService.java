package ru.krezd.diploma.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import ru.krezd.diploma.dto.slurm.config.SlurmDbConfigResponseDTO;

/**
 * Сервис для получения конфигурации slurmdbd через REST API slurmrestd.
 */
@Service
@Slf4j
public class SlurmConfigService {

    @Autowired
    @Qualifier("slurmRestTemplate")
    private RestTemplate slurmRestTemplate;

    @Value("${slurm.db.address}")
    private String slurmDbAddress;

    /**
     * Возвращает конфигурацию slurmdbd: кластеры, TRES, QOS.
     * Соответствует GET /slurmdb/v0.0.40/config.
     */
    public SlurmDbConfigResponseDTO getConfig() {
        log.debug("Запрос конфигурации slurmdbd: {}config", slurmDbAddress);
        return slurmRestTemplate.getForObject(
                slurmDbAddress + "config",
                SlurmDbConfigResponseDTO.class
        );
    }
}