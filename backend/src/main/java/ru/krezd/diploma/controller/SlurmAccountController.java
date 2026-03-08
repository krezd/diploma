package ru.krezd.diploma.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.krezd.diploma.dto.AssociateUserRequest;
import ru.krezd.diploma.dto.CreateAccountRequest;
import ru.krezd.diploma.dto.SetAssociationLimitsRequest;
import ru.krezd.diploma.dto.SetAssociationQosRequest;
import ru.krezd.diploma.dto.slurm.account.SlurmAccountsResponseDTO;
import ru.krezd.diploma.dto.slurm.account.SlurmAssociationsResponseDTO;
import ru.krezd.diploma.service.SlurmAccountService;

/**
 * REST-контроллер для управления аккаунтами и ассоциациями slurmdbd.
 * Все эндпоинты доступны только администраторам.
 */
@RestController
@RequestMapping("/api/slurm")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class SlurmAccountController {

    private final SlurmAccountService slurmAccountService;

    // ── Аккаунты ────────────────────────────────────────────────────────────

    @GetMapping("/accounts")
    public ResponseEntity<?> getAccounts() {
        try {
            SlurmAccountsResponseDTO response = slurmAccountService.getAccounts();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при получении аккаунтов: " + e.getMessage());
        }
    }

    @PostMapping("/accounts")
    public ResponseEntity<?> createAccount(@Valid @RequestBody CreateAccountRequest request) {
        try {
            slurmAccountService.createAccount(
                    request.getName(),
                    request.getDescription(),
                    request.getOrganization()
            );
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body("Аккаунт '" + request.getName() + "' успешно создан");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при создании аккаунта: " + e.getMessage());
        }
    }

    @DeleteMapping("/accounts/{name}")
    public ResponseEntity<?> deleteAccount(@PathVariable String name) {
        try {
            slurmAccountService.deleteAccount(name);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при удалении аккаунта: " + e.getMessage());
        }
    }

    // ── Ассоциации ───────────────────────────────────────────────────────────

    @GetMapping("/associations")
    public ResponseEntity<?> getAssociations(
            @RequestParam(required = false) String account,
            @RequestParam(required = false) String user) {
        try {
            SlurmAssociationsResponseDTO response = slurmAccountService.getAssociations(account, user);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при получении ассоциаций: " + e.getMessage());
        }
    }

    @PostMapping("/associations")
    public ResponseEntity<?> createAssociation(@Valid @RequestBody AssociateUserRequest request) {
        try {
            slurmAccountService.createAssociation(request.getUsername(), request.getAccountName());
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body("Ассоциация пользователя '" + request.getUsername()
                            + "' с аккаунтом '" + request.getAccountName() + "' создана");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при создании ассоциации: " + e.getMessage());
        }
    }

    @DeleteMapping("/associations")
    public ResponseEntity<?> deleteAssociation(
            @RequestParam String username,
            @RequestParam String accountName) {
        try {
            slurmAccountService.deleteAssociation(username, accountName);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при удалении ассоциации: " + e.getMessage());
        }
    }

    /** PUT /api/slurm/associations/qos — установить QOS для ассоциации */
    @PutMapping("/associations/qos")
    public ResponseEntity<?> setAssociationQos(@Valid @RequestBody SetAssociationQosRequest request) {
        try {
            slurmAccountService.setAssociationQos(
                    request.getAccount(),
                    request.getUser(),
                    request.getQos(),
                    request.getDefaultQos()
            );
            return ResponseEntity.ok("QOS обновлён для ассоциации");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при обновлении QOS ассоциации: " + e.getMessage());
        }
    }

    /** PUT /api/slurm/associations/limits — установить лимиты TRES и заданий для ассоциации */
    @PutMapping("/associations/limits")
    public ResponseEntity<?> setAssociationLimits(@Valid @RequestBody SetAssociationLimitsRequest request) {
        try {
            slurmAccountService.setAssociationLimits(request);
            return ResponseEntity.ok("Лимиты обновлены для ассоциации");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при обновлении лимитов ассоциации: " + e.getMessage());
        }
    }
}