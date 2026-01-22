package ru.krezd.diploma.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.nio.file.attribute.FileTime;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileInfoResponse
{
    private String fileName;
    private Long fileSize;
    private String fileType;
    private String filePath;
    private String lastModified;
}
