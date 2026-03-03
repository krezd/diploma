package ru.krezd.diploma.dto.slurm.account;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/** Maps v0.0.40_openapi_error */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SlurmErrorDTO {
    private String description;
    @JsonProperty("error_number")
    private Integer errorNumber;
    private String error;
    private String source;
}