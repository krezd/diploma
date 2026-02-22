package ru.krezd.diploma.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import ru.krezd.diploma.dto.slurm.partition.SlurmPartitionsResponseDTO;

/**
 * Сервис для работы с партициями SLURM через slurmrestd.
 */
@Service
@Slf4j
public class PartitionsService {

    @Autowired
    @Qualifier("slurmRestTemplate")
    private RestTemplate slurmRestTemplate;

    @Value("${slurm.rest.address}")
    private String slurmrestdURL;

    /**
     * Возвращает список всех партиций кластера.
     *
     * @param updateTime фильтровать партиции, изменённые после указанного timestamp (опционально)
     * @return DTO со списком партиций и метаданными
     */
    public SlurmPartitionsResponseDTO getPartitions(Long updateTime) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(slurmrestdURL + "partitions");

        if (updateTime != null) {
            builder.queryParam("update_time", updateTime);
        }

        log.debug("Запрос списка партиций: {}", builder.toUriString());

        return slurmRestTemplate.getForObject(
                builder.toUriString(),
                SlurmPartitionsResponseDTO.class
        );
    }

    /**
     * Возвращает информацию о конкретной партиции.
     *
     * @param partitionName имя партиции
     * @param updateTime    фильтровать по timestamp (опционально)
     * @return DTO с данными партиции
     */
    public SlurmPartitionsResponseDTO getPartitionByName(String partitionName, Long updateTime) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(slurmrestdURL + "partition/" + partitionName);

        if (updateTime != null) {
            builder.queryParam("update_time", updateTime);
        }

        log.debug("Запрос партиции '{}': {}", partitionName, builder.toUriString());

        return slurmRestTemplate.getForObject(
                builder.toUriString(),
                SlurmPartitionsResponseDTO.class
        );
    }
}