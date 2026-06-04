package ru.krezd.diploma.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.catalina.connector.ClientAbortException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import ru.krezd.diploma.dto.FileInfoResponse;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.AccessDeniedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermission;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@Slf4j
public class FilesService
{
    @Value("${root.path}")
    private Path rootPath;

    // ─── Публичные методы для чтения директорий ───────────────────────────────

    public List<FileInfoResponse> getListFiles(String path) throws IOException
    {
        Path targetPath = validatePath(path);
        validateDir(targetPath.toString());
        List<FileInfoResponse> result = new ArrayList<>();

        try (var stream = Files.list(targetPath))
        {
            for (Path file : stream.toList())
            {
                Path relativePath = rootPath.relativize(file);
                FileInfoResponse.FileInfoResponseBuilder builder =
                        FileInfoResponse.builder()
                                .fileName(file.getFileName().toString())
                                .filePath(relativePath.toString().replace("\\", "/"))
                                .lastModified(
                                        Files.getLastModifiedTime(file)
                                                .toInstant()
                                                .toString()
                                );

                if (Files.isDirectory(file))
                {
                    builder.fileType("DIRECTORY").fileSize(null);
                }
                else
                {
                    builder.fileType("FILE").fileSize(Files.size(file));
                }
                result.add(builder.build());
            }
        }
        return result;
    }

    public List<FileInfoResponse> getUserListFiles(String path, String username) throws IOException
    {
        Path targetPath = validateUserPath(path, username);
        return getListFiles(targetPath.toString());
    }

    // ─── Публичные методы для загрузки файлов ─────────────────────────────────

    /**
     * Загрузка нескольких файлов (и папок) от имени обычного пользователя.
     * Пути ограничены папкой пользователя.
     *
     * @param files         список файлов
     * @param relativePaths опциональные относительные пути для каждого файла
     *                      (используются при загрузке папок через webkitdirectory,
     *                       например "myproject/src/main.py")
     * @param basePath      текущая рабочая директория (относительно rootPath)
     * @param username      имя пользователя
     */
    public void uploadFilesForUser(List<MultipartFile> files, List<String> relativePaths,
                                   String basePath, String username) throws IOException
    {
        for (int i = 0; i < files.size(); i++)
        {
            String rel = (relativePaths != null && i < relativePaths.size()) ? relativePaths.get(i) : null;
            uploadSingleFile(files.get(i), basePath, rel, username);
        }
    }

    /**
     * Загрузка нескольких файлов (и папок) от имени администратора.
     * Пути не ограничены — можно загружать в любую директорию внутри rootPath.
     */
    public void uploadFilesAdmin(List<MultipartFile> files, List<String> relativePaths,
                                 String basePath) throws IOException
    {
        for (int i = 0; i < files.size(); i++)
        {
            String rel = (relativePaths != null && i < relativePaths.size()) ? relativePaths.get(i) : null;
            uploadSingleFile(files.get(i), basePath, rel, null);
        }
    }

    /**
     * Внутренний метод загрузки одного файла.
     *
     * @param restrictedToUser если задан — проверяет, что целевой путь находится
     *                         внутри папки этого пользователя (null = без ограничений)
     */
    private void uploadSingleFile(MultipartFile file, String basePath,
                                  String relativePath, String restrictedToUser) throws IOException
    {
        if (file == null || file.isEmpty()) return;

        Path targetDir;
        Path targetFile;

        if (relativePath != null && !relativePath.isBlank())
        {
            // Загрузка с сохранением структуры папок (webkitdirectory)
            Path relPath = Path.of(relativePath.replace("\\", "/")).normalize();

            // Защита от path traversal в relativePath
            if (relPath.isAbsolute() || relPath.toString().contains(".."))
            {
                throw new AccessDeniedException("Invalid relative path");
            }

            Path relDir = relPath.getParent();
            Path baseDir = validatePath(basePath);
            targetDir = relDir != null ? baseDir.resolve(relDir).normalize() : baseDir;
            targetFile = targetDir.resolve(relPath.getFileName()).normalize();
        }
        else
        {
            Path baseDir = validatePath(basePath);
            String fileName = file.getOriginalFilename();
            if (fileName == null || fileName.isBlank())
            {
                throw new IllegalArgumentException("File has no name");
            }
            // Убираем возможные разделители пути из имени файла
            fileName = Path.of(fileName).getFileName().toString();
            targetDir = baseDir;
            targetFile = baseDir.resolve(fileName).normalize();
        }

        // Проверка: всё должно быть внутри rootPath
        if (!targetDir.startsWith(rootPath) || !targetFile.startsWith(rootPath))
        {
            log.warn("Path traversal attempt: {}", targetFile);
            throw new AccessDeniedException("Path traversal attempt");
        }

        // Для обычного пользователя: путь должен быть внутри его папки
        if (restrictedToUser != null)
        {
            Path userRoot = rootPath.resolve(restrictedToUser).normalize();
            if (!targetFile.startsWith(userRoot))
            {
                log.warn("User {} attempted to write outside own dir: {}", restrictedToUser, targetFile);
                throw new AccessDeniedException("Access denied: outside user directory");
            }
        }

        Files.createDirectories(targetDir);
        try (InputStream in = file.getInputStream())
        {
            Files.copy(in, targetFile, StandardCopyOption.REPLACE_EXISTING);
            setExecutablePermissionIfNeeded(targetFile, file.getOriginalFilename());
        }
    }

    // ─── Публичные методы создания директорий ─────────────────────────────────

    /** Создать директорию внутри папки пользователя */
    public void createDirByUser(String path, String username) throws IOException
    {
        Path targetDir = validateUserPath(path, username);
        Files.createDirectories(targetDir);
    }

    /** Создать директорию в любом месте rootPath (для администратора) */
    public void createDirAdmin(String path) throws IOException
    {
        Path targetDir = validatePath(path);
        Files.createDirectories(targetDir);
    }

    /** Создать корневую директорию пользователя */
    public void createUserDir(String username) throws IOException
    {
        Path targetDir = rootPath.resolve(username).normalize();
        Files.createDirectories(targetDir);
    }

    // ─── Публичные методы удаления ────────────────────────────────────────────

    /** Удалить файл или директорию из папки пользователя */
    public void deleteByUser(String path, String username) throws IOException
    {
        Path userWorkDir = rootPath.resolve(username).normalize();
        Path targetDir = validateUserPath(path, username);

        if (targetDir.equals(userWorkDir))
        {
            throw new IllegalArgumentException("Cannot delete user root directory");
        }
        delete(path);
    }

    /** Удалить любой файл или директорию (для администратора) */
    public void deleteAdmin(String path) throws IOException
    {
        delete(path);
    }

    /** Удалить корневую директорию пользователя */
    public void deleteUserDir(String username) throws IOException
    {
        Path targetDir = rootPath.resolve(username).normalize();

        if (targetDir.equals(rootPath))
        {
            throw new IllegalArgumentException("Cannot delete root directory");
        }
        if (!Files.exists(targetDir))
        {
            log.info("User directory {} does not exist, skipping deletion", targetDir);
            return;
        }

        deleteRecursively(targetDir);
    }

    // ─── Публичные методы скачивания ──────────────────────────────────────────

    /** Скачать файл из папки пользователя */
    public StreamingResponseBody downloadByUser(String path, String username) throws IOException
    {
        Path targetFile = validateUserPath(path, username);
        validateFile(path);
        return buildFileStream(targetFile);
    }

    /** Скачать любой файл (для администратора) */
    public StreamingResponseBody downloadAdmin(String path) throws IOException
    {
        Path targetFile = validatePath(path);
        if (!Files.isRegularFile(targetFile))
        {
            throw new FileNotFoundException("Not a file: " + path);
        }
        return buildFileStream(targetFile);
    }

    /** Скачать директорию пользователя как ZIP */
    public StreamingResponseBody downloadZipByUser(String path, String username) throws IOException
    {
        Path targetDir = validateUserPath(path, username);
        validateDir(targetDir.toString());
        return buildZipStream(targetDir);
    }

    /** Скачать любую директорию как ZIP (для администратора) */
    public StreamingResponseBody downloadZipAdmin(String path) throws IOException
    {
        Path targetDir = validatePath(path);
        validateDir(targetDir.toString());
        return buildZipStream(targetDir);
    }

    // ─── Публичные методы валидации пути ─────────────────────────────────────

    /** Проверить путь для пользователя (должен быть внутри его папки) */
    public Path validateUserPath(String path, String username) throws AccessDeniedException
    {
        Path checkPath = rootPath.resolve(username).normalize();
        Path targetPath = rootPath.resolve(path).normalize();

        if (!targetPath.startsWith(checkPath))
        {
            log.warn("Path traversal attempt by {}: {}", username, targetPath);
            throw new AccessDeniedException("Path traversal attempt");
        }
        return targetPath;
    }

    /** Проверить путь для администратора (должен быть внутри rootPath) */
    public Path validateAdminPath(String path) throws AccessDeniedException
    {
        return validatePath(path);
    }

    // ─── Приватные вспомогательные методы ─────────────────────────────────────

    private Path validatePath(String path) throws AccessDeniedException
    {
        Path targetPath = rootPath.resolve(path).normalize();

        if (!targetPath.startsWith(rootPath))
        {
            log.warn("Path traversal attempt: {}", targetPath);
            throw new AccessDeniedException("Path traversal attempt");
        }
        return targetPath;
    }

    private Path validateDir(String path) throws FileNotFoundException
    {
        Path targetPath = rootPath.resolve(path).normalize();
        if (!Files.exists(targetPath) || !Files.isDirectory(targetPath))
        {
            throw new FileNotFoundException("Not a directory: " + path);
        }
        return targetPath;
    }

    private Path validateFile(String path) throws FileNotFoundException
    {
        Path targetPath = rootPath.resolve(path).normalize();
        if (!Files.exists(targetPath) || !Files.isRegularFile(targetPath))
        {
            throw new FileNotFoundException("Not a file: " + path);
        }
        return targetPath;
    }

    private void delete(String path) throws IOException
    {
        Path targetDir = rootPath.resolve(path).normalize();

        if (targetDir.equals(rootPath))
        {
            throw new IllegalArgumentException("Cannot delete root directory");
        }
        if (!Files.exists(targetDir))
        {
            throw new FileNotFoundException("File does not exist: " + path);
        }

        deleteRecursively(targetDir);
    }

    private void deleteRecursively(Path root) throws IOException
    {
        try (var walk = Files.walk(root))
        {
            walk
                    .sorted(Comparator.reverseOrder())
                    .forEach(p -> {
                        try
                        {
                            Files.delete(p);
                        }
                        catch (IOException e)
                        {
                            throw new UncheckedIOException(e);
                        }
                    });
        }
    }

    private StreamingResponseBody buildFileStream(Path targetFile)
    {
        return output -> {
            try (InputStream in = Files.newInputStream(targetFile))
            {
                byte[] buffer = new byte[8192];
                int n;
                while ((n = in.read(buffer)) > 0)
                {
                    output.write(buffer, 0, n);
                }
            }
            catch (ClientAbortException e)
            {
                // клиент отменил загрузку
            }
        };
    }

    private StreamingResponseBody buildZipStream(Path targetDir)
    {
        return output -> {
            try (ZipOutputStream zip = new ZipOutputStream(output))
            {
                Files.walk(targetDir).forEach(p -> {
                    try
                    {
                        if (Files.isDirectory(p)) return;
                        Path relative = targetDir.relativize(p);
                        ZipEntry entry = new ZipEntry(relative.toString());
                        zip.putNextEntry(entry);
                        Files.copy(p, zip);
                        zip.closeEntry();
                    }
                    catch (IOException e)
                    {
                        log.warn("Failed to add file to zip: {}", p, e);
                    }
                });
            }
            catch (ClientAbortException e)
            {
                // клиент отменил загрузку
            }
        };
    }

    /**
     * Устанавливает права на выполнение для файла, если это исполняемый файл.
     * Определяет по расширению или по magic number (первые байты файла).
     */
    private void setExecutablePermissionIfNeeded(Path filePath, String fileName) throws IOException
    {
        if (isExecutableFile(fileName, filePath))
        {
            // Устанавливаем права: rwxr-xr-x (755)
            // Владелец может читать, писать, выполнять
            // Группа и остальные могут читать и выполнять
            Set<PosixFilePermission> permissions = new HashSet<>();
            permissions.add(PosixFilePermission.OWNER_READ);
            permissions.add(PosixFilePermission.OWNER_WRITE);
            permissions.add(PosixFilePermission.OWNER_EXECUTE);
            permissions.add(PosixFilePermission.GROUP_READ);
            permissions.add(PosixFilePermission.GROUP_EXECUTE);
            permissions.add(PosixFilePermission.OTHERS_READ);
            permissions.add(PosixFilePermission.OTHERS_EXECUTE);

            Files.setPosixFilePermissions(filePath, permissions);
            log.info("Set executable permission for: {}", filePath);
        }
    }

    /**
     * Определяет, является ли файл исполняемым.
     * Проверяет по расширению и по первым байтам (ELF, shebang).
     */
    private boolean isExecutableFile(String fileName, Path filePath) throws IOException
    {
        // 1. Проверка по расширению
        if (fileName != null)
        {
            String lowerName = fileName.toLowerCase();
            if (lowerName.endsWith(".sh") ||      // shell скрипты
                    lowerName.endsWith(".py") ||      // python скрипты
                    lowerName.endsWith(".pl") ||      // perl скрипты
                    lowerName.endsWith(".rb") ||      // ruby скрипты
                    lowerName.endsWith(".bin") ||     // бинарники
                    lowerName.endsWith(".exe") ||     // windows executables
                    !fileName.contains("."))          // файлы без расширения (часто бинарники)
            {
                return true;
            }
        }

        // 2. Проверка magic number для ELF (Linux executables)
        // ELF файлы начинаются с 0x7F 0x45 0x4C 0x46
        try (InputStream in = Files.newInputStream(filePath))
        {
            byte[] magic = new byte[4];
            int bytesRead = in.read(magic);
            if (bytesRead >= 4)
            {
                // ELF magic number
                if (magic[0] == 0x7F && magic[1] == 0x45 &&
                        magic[2] == 0x4C && magic[3] == 0x46)
                {
                    return true;
                }

                // Shebang #!
                if (magic[0] == '#' && magic[1] == '!')
                {
                    return true;
                }
            }
        }
        catch (IOException e)
        {
            log.debug("Could not read magic number from: {}", filePath, e);
        }

        return false;
    }
}