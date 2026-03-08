package ru.krezd.diploma.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.krezd.diploma.dto.CreateQosRequest;
import ru.krezd.diploma.service.SlurmQosService;

/**
 * REST-контроллер для управления QOS в slurmdbd.
 * Все эндпоинты доступны только администраторам.
 */
@RestController
@RequestMapping("/api/slurm")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class SlurmQosController {

    private final SlurmQosService slurmQosService;

    /** GET /api/slurm/tres — список всех TRES из slurmdbd */
    @GetMapping("/tres")
    public ResponseEntity<?> getTresList() {
        try {
            return ResponseEntity.ok(slurmQosService.getTresList());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при получении TRES: " + e.getMessage());
        }
    }

    /** GET /api/slurm/qos — список всех QOS в плоском виде */
    @GetMapping("/qos")
    public ResponseEntity<?> getQosList() {
        try {
            return ResponseEntity.ok(slurmQosService.getQosList());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при получении QOS: " + e.getMessage());
        }
    }

    /** POST /api/slurm/qos — создать новый QOS */
    @PostMapping("/qos")
    public ResponseEntity<?> createQos(@Valid @RequestBody CreateQosRequest request) {
        try {
            slurmQosService.createQos(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body("QOS '" + request.getName() + "' создан");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при создании QOS: " + e.getMessage());
        }
    }

    /** PUT /api/slurm/qos/{name} — изменить лимиты QOS */
    @PutMapping("/qos/{name}")
    public ResponseEntity<?> modifyQos(
            @PathVariable String name,
            @RequestBody CreateQosRequest request) {
        try {
            slurmQosService.modifyQos(name, request);
            return ResponseEntity.ok("QOS '" + name + "' обновлён");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при обновлении QOS: " + e.getMessage());
        }
    }

    /** DELETE /api/slurm/qos/{name} — удалить QOS */
    @DeleteMapping("/qos/{name}")
    public ResponseEntity<?> deleteQos(@PathVariable String name) {
        try {
            slurmQosService.deleteQos(name);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при удалении QOS: " + e.getMessage());
        }
    }
}