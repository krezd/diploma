package ru.krezd.diploma.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import ru.krezd.diploma.service.FilesService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * Контроллер для работы с файловой системой кластера.
 *
 * Структура эндпоинтов:
 *   /api/files/user/*  — для любого авторизованного пользователя.
 *                        Пути ограничены собственной директорией пользователя.
 *
 *   /api/files/admin/* — только для роли ADMIN.
 *                        Полный доступ ко всем директориям внутри rootPath.
 */
@RestController
@RequestMapping("/api/files")
public class FilesController
{
    @Autowired
    private FilesService filesService;

    // ═══════════════════════════════════════════════════════════════════════════
    // USER — любой авторизованный пользователь, ограничен своей папкой
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Получить список файлов и папок в указанной директории.
     * Путь должен начинаться с папки текущего пользователя.
     */
    @GetMapping("/user/list")
    public ResponseEntity<?> listUser(
            @RequestParam String path,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException
    {
        return ResponseEntity.ok(filesService.getUserListFiles(path, userDetails.getUsername()));
    }

    /**
     * Загрузить один или несколько файлов в директорию пользователя.
     * Поддерживает загрузку папок — для каждого файла можно передать
     * relativePath (например "myproject/src/main.py"), чтобы сохранить
     * структуру директорий.
     *
     * @param files         файлы для загрузки
     * @param relativePaths относительные пути файлов (для загрузки папок),
     *                      порядок соответствует порядку files
     * @param path          целевая директория (относительно rootPath)
     */
    @PostMapping(value = "/user/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadUser(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(required = false) List<String> relativePaths,
            @RequestParam(required = false, defaultValue = "") String path,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException
    {
        filesService.uploadFilesForUser(files, relativePaths, path, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    /**
     * Создать директорию внутри папки пользователя.
     * Параметр path должен содержать полный путь новой директории,
     * включая её имя (например "username/docs/newdir").
     */
    @PostMapping("/user/createDir")
    public ResponseEntity<?> createDirUser(
            @RequestParam String path,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException
    {
        try
        {
            filesService.createDirByUser(path, userDetails.getUsername());
        }
        catch (Exception e)
        {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
        return ResponseEntity.ok().build();
    }

    /** Скачать файл из папки пользователя */
    @GetMapping("/user/download")
    public ResponseEntity<StreamingResponseBody> downloadUser(
            @RequestParam String path,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException
    {
        Path targetFile = filesService.validateUserPath(path, userDetails.getUsername());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + targetFile.getFileName() + "\"")
                .contentLength(Files.size(targetFile))
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(filesService.downloadByUser(path, userDetails.getUsername()));
    }

    /** Скачать директорию пользователя как ZIP-архив */
    @GetMapping("/user/download-zip")
    public ResponseEntity<StreamingResponseBody> downloadZipUser(
            @RequestParam String path,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException
    {
        Path targetDir = filesService.validateUserPath(path, userDetails.getUsername());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + targetDir.getFileName() + ".zip\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(filesService.downloadZipByUser(path, userDetails.getUsername()));
    }

    /** Удалить файл или директорию из папки пользователя (рекурсивно) */
    @DeleteMapping("/user/delete")
    public ResponseEntity<?> deleteUser(
            @RequestParam String path,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException
    {
        filesService.deleteByUser(path, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN — только роль ADMIN, полный доступ ко всем директориям
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Получить список файлов и папок в любой директории rootPath.
     * При path="" возвращает содержимое корневой директории.
     */
    @GetMapping("/admin/list")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> listAdmin(
            @RequestParam(required = false, defaultValue = "") String path) throws IOException
    {
        return ResponseEntity.ok(filesService.getListFiles(path));
    }

    /**
     * Загрузить один или несколько файлов в любую директорию.
     * Поддерживает загрузку папок через relativePaths (аналогично /user/upload).
     */
    @PostMapping(value = "/admin/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> uploadAdmin(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(required = false) List<String> relativePaths,
            @RequestParam(required = false, defaultValue = "") String path) throws IOException
    {
        filesService.uploadFilesAdmin(files, relativePaths, path);
        return ResponseEntity.ok().build();
    }

    /**
     * Создать директорию в любом месте rootPath.
     * Параметр path содержит полный путь новой директории.
     */
    @PostMapping("/admin/createDir")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createDirAdmin(@RequestParam String path) throws IOException
    {
        try
        {
            filesService.createDirAdmin(path);
        }
        catch (Exception e)
        {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
        return ResponseEntity.ok().build();
    }

    /** Скачать любой файл внутри rootPath */
    @GetMapping("/admin/download")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StreamingResponseBody> downloadAdmin(@RequestParam String path) throws IOException
    {
        Path targetFile = filesService.validateAdminPath(path);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + targetFile.getFileName() + "\"")
                .contentLength(Files.size(targetFile))
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(filesService.downloadAdmin(path));
    }

    /** Скачать любую директорию как ZIP-архив */
    @GetMapping("/admin/download-zip")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StreamingResponseBody> downloadZipAdmin(@RequestParam String path) throws IOException
    {
        Path targetDir = filesService.validateAdminPath(path);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + targetDir.getFileName() + ".zip\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(filesService.downloadZipAdmin(path));
    }

    /** Удалить любой файл или директорию внутри rootPath (рекурсивно) */
    @DeleteMapping("/admin/delete")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteAdmin(@RequestParam String path) throws IOException
    {
        filesService.deleteAdmin(path);
        return ResponseEntity.ok().build();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // СЛУЖЕБНЫЕ
    // ═══════════════════════════════════════════════════════════════════════════

    /** Создать корневую директорию текущего пользователя */
    @PostMapping("/createUserDir")
    public ResponseEntity<?> createUserDir(
            @AuthenticationPrincipal UserDetails userDetails) throws IOException
    {
        try
        {
            filesService.createUserDir(userDetails.getUsername());
        }
        catch (Exception e)
        {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
        return ResponseEntity.ok().build();
    }
}