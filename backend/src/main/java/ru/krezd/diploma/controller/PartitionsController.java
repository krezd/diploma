package ru.krezd.diploma.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.krezd.diploma.dto.slurm.partition.SlurmPartitionsResponseDTO;
import ru.krezd.diploma.service.PartitionsService;

/**
 * Контроллер для получения информации о партициях SLURM.
 * Доступен всем авторизованным пользователям — партиции нужны при отправке заданий.
 */
@RestController
@RequestMapping("/api/slurm")
@RequiredArgsConstructor
public class PartitionsController {

    private final PartitionsService partitionsService;

    /**
     * Возвращает список всех партиций кластера.
     * Пользователи используют эти данные для выбора партиции при отправке задания.
     *
     * @param updateTime фильтровать партиции, изменённые после timestamp (опционально)
     */
    @GetMapping("/partitions")
    public ResponseEntity<SlurmPartitionsResponseDTO> getPartitions(
            @RequestParam(required = false) Long updateTime) {

        return ResponseEntity.ok(partitionsService.getPartitions(updateTime));
    }

    /**
     * Возвращает подробную информацию об одной партиции.
     *
     * @param partitionName имя партиции
     * @param updateTime    фильтровать по timestamp (опционально)
     */
    @GetMapping("/partition/{partitionName}")
    public ResponseEntity<SlurmPartitionsResponseDTO> getPartition(
            @PathVariable String partitionName,
            @RequestParam(required = false) Long updateTime) {

        return ResponseEntity.ok(partitionsService.getPartitionByName(partitionName, updateTime));
    }
}