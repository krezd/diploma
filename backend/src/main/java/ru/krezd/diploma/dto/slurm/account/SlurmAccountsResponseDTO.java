package ru.krezd.diploma.dto.slurm.account;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import ru.krezd.diploma.dto.slurm.SlurmErrorDTO;
import ru.krezd.diploma.dto.slurm.SlurmWarningDTO;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SlurmAccountsResponseDTO {
    private List<SlurmAccountDTO> accounts;
    private List<SlurmErrorDTO> errors;
    private List<SlurmWarningDTO> warnings;
}