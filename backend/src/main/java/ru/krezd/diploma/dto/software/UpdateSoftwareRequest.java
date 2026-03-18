package ru.krezd.diploma.dto.software;

import lombok.Data;

@Data
public class UpdateSoftwareRequest {
    private String category;
    private String description;
    private String installedBy;
}