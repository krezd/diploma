package ru.krezd.diploma.dto.slurm.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

/**
 * Информация о кластере в slurmdbd.
 * Соответствует схеме v0.0.40_cluster_rec из ответа GET /slurmdb/v0.0.40/config.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmClusterRecDTO {
    private String name;
    private List<String> flags;
    private String nodes;
    private String selectPlugin;
    private Integer rpcVersion;
    private ClusterController controller;

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class ClusterController {
        private String host;
        private Integer port;
    }
}