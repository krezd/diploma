package ru.krezd.diploma.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import ru.krezd.diploma.dto.slurm.diag.SlurmDiagResponse;
import ru.krezd.diploma.dto.slurm.ping.SlurmPingResponse;

/**
 * Сервис для получения диагностической информации о кластере SLURM.
 * Доступен только администраторам.
 */
@Service
@Slf4j
public class SlurmDiagnosticService {

    @Autowired
    @Qualifier("slurmRestTemplate")
    private RestTemplate slurmRestTemplate;

    @Value("${slurm.rest.address}")
    private String slurmrestdURL;

    /**
     * Возвращает диагностику и статистику планировщика SLURM (slurmctld).
     * Включает счётчики заданий, метрики циклов планировщика и backfill-планировщика.
     *
     * @return DTO со статистикой планировщика
     */
    public SlurmDiagResponse getDiagnostics() {
        String url = slurmrestdURL + "diag";
        log.debug("Запрос диагностики SLURM: {}", url);

        return slurmRestTemplate.getForObject(url, SlurmDiagResponse.class);
    }

    /**
     * Выполняет ping-проверку доступности контроллеров SLURM (slurmctld).
     *
     * @return DTO с результатами ping для каждого контроллера
     */
    public SlurmPingResponse getPing() {
        String url = slurmrestdURL + "ping";
        log.debug("Ping-запрос к SLURM: {}", url);

        return slurmRestTemplate.getForObject(url, SlurmPingResponse.class);
    }
}