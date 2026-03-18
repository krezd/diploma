package ru.krezd.diploma.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.krezd.diploma.dto.software.RegisterSoftwareRequest;
import ru.krezd.diploma.dto.software.UpdateSoftwareRequest;
import ru.krezd.diploma.entity.SoftwarePackage;
import ru.krezd.diploma.enums.PackageStatus;
import ru.krezd.diploma.service.SoftwareService;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * REST API для управления ПО на кластере.
 *
 * GET    /api/software                — список всех пакетов (все авторизованные)
 * POST   /api/software/scan           — сканировать /shared/software/modules/ (ADMIN)
 * POST   /api/software/register       — зарегистрировать ПО, уже установленное на кластере (ADMIN)
 * POST   /api/software/upload         — загрузить архив, распаковать, установить (ADMIN)
 * PATCH  /api/software/{id}           — обновить описание/категорию/installedBy (ADMIN)
 * GET    /api/software/{id}/modulefile — прочитать содержимое modulefile (ADMIN)
 * PATCH  /api/software/{id}/status    — сменить статус (ADMIN)
 * DELETE /api/software/{id}           — удалить из БД (ADMIN)
 */
@RestController
@RequestMapping("/api/software")
public class SoftwareController {

    @Autowired
    private SoftwareService softwareService;

    /** Список всех пакетов — для любого авторизованного пользователя */
    @GetMapping
    public ResponseEntity<List<SoftwarePackage>> getAll() {
        return ResponseEntity.ok(softwareService.getAll());
    }

    /** Сканирование /shared/software/modules/ и синхронизация с БД */
    @PostMapping("/scan")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SoftwareService.ScanResult> scan() throws IOException {
        return ResponseEntity.ok(softwareService.scanModules());
    }

    /**
     * Регистрирует ПО, которое уже присутствует на кластере (установлено вручную,
     * через пакетный менеджер и т.п.). Файлы не загружаются.
     * Если moduleContent задан — записывает его как modulefile.
     */
    @PostMapping("/register")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SoftwarePackage> register(
            @RequestBody RegisterSoftwareRequest request,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException {
        return ResponseEntity.ok(softwareService.registerPackage(request, userDetails.getUsername()));
    }

    /**
     * Загрузка архива с ПО.
     * - tar-форматы стримятся напрямую в процесс (без записи архива на диск)
     * - zip сохраняется во временный файл рядом с назначением
     * После распаковки опционально выполняется installScript,
     * затем записывается moduleContent (или генерируется автоматически).
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SoftwarePackage> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam String name,
            @RequestParam String version,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String binaryPath,
            @RequestParam(required = false) String libPath,
            @RequestParam(required = false) String installScript,
            @RequestParam(required = false) String moduleContent,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException, InterruptedException {
        return ResponseEntity.ok(softwareService.uploadAndInstall(
                file, name, version, category, description,
                binaryPath, libPath, installScript, moduleContent,
                userDetails.getUsername()));
    }

    /** Обновление описания, категории, installedBy — работает для любых пакетов в БД */
    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SoftwarePackage> updateMetadata(
            @PathVariable Long id,
            @RequestBody UpdateSoftwareRequest request) {
        return ResponseEntity.ok(softwareService.updateMetadata(id, request));
    }

    /** Содержимое modulefile */
    @GetMapping("/{id}/modulefile")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> getModulefile(@PathVariable Long id) throws IOException {
        return ResponseEntity.ok(Map.of("content", softwareService.getModuleFileContent(id)));
    }

    /** Изменить статус пакета */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SoftwarePackage> updateStatus(
            @PathVariable Long id,
            @RequestParam PackageStatus status) {
        return ResponseEntity.ok(softwareService.updateStatus(id, status));
    }

    /** Удалить из БД. deleteFiles=true — удалить и файлы с диска */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean deleteFiles) throws IOException {
        softwareService.deletePackage(id, deleteFiles);
        return ResponseEntity.ok().build();
    }
}