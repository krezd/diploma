package ru.krezd.diploma.service;

import org.apache.catalina.connector.ClientAbortException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import ru.krezd.diploma.dto.FileInfoResponse;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.AccessDeniedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class FilesService
{
    @Value("${root.path}")
    private Path rootPath;

    public List<FileInfoResponse> getListFiles(Path path) throws IOException
    {
        List<FileInfoResponse> result = new ArrayList<>();

        try (var stream = Files.list(path))
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
                    builder
                            .fileType("DIRECTORY")
                            .fileSize(null);
                } else
                {
                    builder
                            .fileType("FILE")
                            .fileSize(Files.size(file));
                }

                result.add(builder.build());
            }
        }
        return result;
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
                        } catch (IOException e)
                        {
                            throw new UncheckedIOException(e);
                        }
                    });
        }
    }

    private Path validatePath(String path) throws AccessDeniedException
    {
        Path targetPath = rootPath.resolve(path).normalize();

        if (!targetPath.startsWith(rootPath))
        {
            throw new AccessDeniedException("Path traversal attempt");
        }
        return targetPath;
    }

    public Path validateUserPath(String path, String username) throws AccessDeniedException
    {
        Path checkPath = rootPath.resolve(username).normalize();
        Path targetPath = rootPath.resolve(path).normalize();

        if (!targetPath.startsWith(checkPath))
        {
            throw new AccessDeniedException("Path traversal attempt");
        }
        return targetPath;
    }

    private Path validateDir(String path) throws FileNotFoundException
    {
        Path targetPath = rootPath.resolve(path).normalize();
        if (!Files.exists(targetPath) || !Files.isDirectory(targetPath))
        {
            throw new FileNotFoundException("Not a directory");
        }
        return targetPath;
    }

    private Path validateFile(String path) throws FileNotFoundException
    {
        Path targetPath = rootPath.resolve(path).normalize();
        if (!Files.exists(targetPath) || !Files.isRegularFile(targetPath))
        {
            throw new FileNotFoundException("Not a file");
        }
        return targetPath;
    }

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

    private void delete(String path) throws IOException
    {
        Path targetDir = rootPath.resolve(path).normalize();

        if (targetDir.equals(rootPath))
        {
            throw new IllegalArgumentException("Cannot delete root directory");
        }
        if (!Files.exists(targetDir))
        {
            throw new FileNotFoundException("File does not exist");
        }

        deleteRecursively(targetDir);
    }

    public StreamingResponseBody downloadZipByUser(String path, String username) throws IOException
    {
        Path targetDir = validateUserPath(path, username);
        validateDir(path);

        StreamingResponseBody stream = output -> {
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
                    } catch (IOException e)
                    {
                        // логируем и продолжаем
                    }
                });
            } catch (ClientAbortException e)
            {
                // клиент отменил
            }
        };

        return stream;
    }


    public StreamingResponseBody downloadByUser(String path, String username) throws IOException
    {
        Path targetDir = validateUserPath(path, username);
        validateFile(path);

        StreamingResponseBody stream = output -> {
            try (InputStream in = Files.newInputStream(targetDir))
            {
                byte[] buffer = new byte[8192];
                int n;
                while ((n = in.read(buffer)) > 0)
                {
                    output.write(buffer, 0, n);
                }
            } catch (ClientAbortException e)
            {
                // пользователь отменил загрузку
            }
        };

        return stream;
    }

    public void createDirByUser(String path, String username) throws IOException
    {
        Path targetDir = validateUserPath(path, username);
        Files.createDirectories(targetDir);
    }

    public void createUserDir(String username) throws IOException
    {
        Path targetDir = rootPath.resolve(username).normalize();
        Files.createDirectories(targetDir);
    }

}
