package ru.krezd.diploma.dto.slurm.qos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * Ответ GET /slurmdb/v0.0.40/tres.
 * Поле "TRES" — верхний регистр, как в slurmrestd.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SlurmTresRawResponseDTO {

    @JsonProperty("TRES")
    private List<SlurmTresItemDTO> tres;
}