package ru.krezd.diploma.dto.software;

import lombok.Data;

@Data
public class RegisterSoftwareRequest {
    private String name;
    private String version;
    private String category;
    private String description;
    /** Содержимое modulefile. Если задано — будет записано в /shared/software/modules/{name}/{version} */
    private String moduleContent;
}