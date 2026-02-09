package ru.krezd.diploma.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import ru.krezd.diploma.service.FilesService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@RestController()
@RequestMapping("/api/files")
public class FilesController
{
    //TODO 1. Просмотр директории
    // 2. Скачивание (большого маленького не важно) файла - DONE
    // 3. Выгрузка файла - DONE
    // 4. Контроль над пользователем (не давать просматривать чужие файлы, загружать только в свою директорию, скачивать только свои файлы и т.п.) - DONE 50/50 костыли
    // 5. Реализовать создание рабочей папки пользователя при регистрации - DONE
    // 6. Удаление файлов/папок - DONE
    // 7. Создание папок пользователями - DONE

    @Value("${root.path}")
    private Path rootPath;

    @Autowired
    private FilesService filesService;

    //Для просмотра любой директории внутри rootPath
    @GetMapping("/list")
    public ResponseEntity<?> getListFiles(@RequestParam String path) throws IOException
    {
        return ResponseEntity.ok().body(filesService.getListFiles(path));
    }

    @GetMapping("/list/user")
    public ResponseEntity<?> getMyListFiles(@RequestParam String path, @AuthenticationPrincipal UserDetails userDetails) throws IOException
    {
        String username = userDetails.getUsername();
        return ResponseEntity.ok().body(filesService.getUserListFiles(path, username));
    }

    @PostMapping(value = "/upload/user",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file, @RequestParam(required = false, defaultValue = "") String path,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException
    {
        filesService.uploadFile(file, path, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/createDir/user")
    public ResponseEntity<?> createDir(
            @RequestParam("path") String path,
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

    @GetMapping("/download/user")
    public ResponseEntity<StreamingResponseBody> download(
            @RequestParam("path") String path,
            @AuthenticationPrincipal UserDetails userDetails
    ) throws IOException
    {
        Path targetFile = filesService.validateUserPath(path, userDetails.getUsername());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + targetFile.getFileName() + "\"")
                .contentLength(Files.size(targetFile))
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(filesService.downloadByUser(path, userDetails.getUsername()));
    }

    @GetMapping("/download-zip/user")
    public ResponseEntity<StreamingResponseBody> downloadZip(
            @RequestParam("path") String path,
            @AuthenticationPrincipal UserDetails userDetails
    ) throws IOException
    {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" +
                        filesService.validateUserPath(path, userDetails.getUsername()).getFileName() + ".zip\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(filesService.downloadZipByUser(path, userDetails.getUsername()));
    }

    @DeleteMapping("/delete/user")
    public ResponseEntity<?> delete(
            @RequestParam("path") String path,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException
    {
        filesService.deleteByUser(path, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }
}
