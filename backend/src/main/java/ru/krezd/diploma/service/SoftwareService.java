package ru.krezd.diploma.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import ru.krezd.diploma.dto.software.RegisterSoftwareRequest;
import ru.krezd.diploma.dto.software.UpdateSoftwareRequest;
import ru.krezd.diploma.entity.SoftwarePackage;
import ru.krezd.diploma.enums.PackageStatus;
import ru.krezd.diploma.repository.SoftwarePackageRepository;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class SoftwareService {

    @Value("${software.path:/shared/software/}")
    private String softwarePath;

    @Value("${software.modules.path:/shared/software/modules/}")
    private String modulesPath;

    @Autowired
    private SoftwarePackageRepository repository;

    // ─── Чтение ───────────────────────────────────────────────────────────────

    public List<SoftwarePackage> getAll() {
        return repository.findAll();
    }

    // ─── Сканирование ────────────────────────────────────────────────────────

    /**
     * Сканирует /shared/software/modules/ и синхронизирует с БД.
     * Новые modulefiles → AVAILABLE, исчезнувшие → BROKEN.
     */
    @Transactional
    public ScanResult scanModules() throws IOException {
        Path modulesDir = Path.of(modulesPath);
        if (!Files.exists(modulesDir)) {
            Files.createDirectories(modulesDir);
            return new ScanResult(0, 0, 0);
        }

        int added = 0, restored = 0, markedBroken = 0;
        Set<String> foundKeys = new HashSet<>();

        try (var nameStream = Files.list(modulesDir)) {
            for (Path nameDir : nameStream.filter(Files::isDirectory).toList()) {
                String name = nameDir.getFileName().toString();
                try (var versionStream = Files.list(nameDir)) {
                    for (Path versionFile : versionStream.filter(Files::isRegularFile).toList()) {
                        String version = versionFile.getFileName().toString();
                        foundKeys.add(name + "/" + version);

                        Optional<SoftwarePackage> existing = repository.findByNameAndVersion(name, version);
                        if (existing.isEmpty()) {
                            SoftwarePackage pkg = SoftwarePackage.builder()
                                    .name(name).version(version)
                                    .moduleFilePath(versionFile.toString())
                                    .installPath(Path.of(softwarePath, name, version).toString())
                                    .description(parseModuleDescription(versionFile))
                                    .status(PackageStatus.AVAILABLE)
                                    .build();
                            repository.save(pkg);
                            log.info("Найден новый модуль: {}/{}", name, version);
                            added++;
                        } else {
                            SoftwarePackage pkg = existing.get();
                            if (pkg.getStatus() == PackageStatus.BROKEN) {
                                pkg.setStatus(PackageStatus.AVAILABLE);
                                pkg.setModuleFilePath(versionFile.toString());
                                repository.save(pkg);
                                restored++;
                            }
                        }
                    }
                }
            }
        }

        for (SoftwarePackage pkg : repository.findByStatusNot(PackageStatus.BROKEN)) {
            if (!foundKeys.contains(pkg.getName() + "/" + pkg.getVersion())) {
                log.warn("Modulefile отсутствует, помечаем BROKEN: {}/{}", pkg.getName(), pkg.getVersion());
                pkg.setStatus(PackageStatus.BROKEN);
                repository.save(pkg);
                markedBroken++;
            }
        }

        return new ScanResult(added, restored, markedBroken);
    }

    // ─── Регистрация существующего ПО ────────────────────────────────────────

    /**
     * Регистрирует ПО, которое уже находится на кластере (например, установлено
     * через пакетный менеджер или вручную). Файлы не загружаются.
     * Если moduleContent задан — записывает его как modulefile.
     */
    @Transactional
    public SoftwarePackage registerPackage(RegisterSoftwareRequest request, String installedBy) throws IOException {
        if (repository.findByNameAndVersion(request.getName(), request.getVersion()).isPresent()) {
            throw new IllegalArgumentException(
                    "Пакет " + request.getName() + "/" + request.getVersion() + " уже зарегистрирован");
        }

        Path moduleFile = Path.of(modulesPath, request.getName(), request.getVersion());

        if (request.getModuleContent() != null && !request.getModuleContent().isBlank()) {
            Files.createDirectories(moduleFile.getParent());
            Files.writeString(moduleFile, request.getModuleContent());
            log.info("Записан modulefile: {}", moduleFile);
        }

        SoftwarePackage pkg = SoftwarePackage.builder()
                .name(request.getName()).version(request.getVersion())
                .category(request.getCategory()).description(request.getDescription())
                .installPath(Path.of(softwarePath, request.getName(), request.getVersion()).toString())
                .moduleFilePath(Files.exists(moduleFile) ? moduleFile.toString() : null)
                .status(PackageStatus.AVAILABLE)
                .installedBy(installedBy)
                .build();

        return repository.save(pkg);
    }

    // ─── Загрузка архива ─────────────────────────────────────────────────────

    /**
     * Принимает архив, распаковывает в /shared/software/{name}/{version}/.
     * Для tar-форматов использует стриминг (без сохранения архива на диск).
     * Для zip сохраняет во временный файл рядом с назначением.
     *
     * После распаковки опционально выполняет install-скрипт, затем создаёт modulefile
     * (пользовательский или автогенерированный).
     */
    @Transactional
    public SoftwarePackage uploadAndInstall(MultipartFile archive, String name, String version,
                                            String category, String description,
                                            String binaryPath, String libPath,
                                            String installScript, String moduleContent,
                                            String installedBy) throws IOException, InterruptedException {
        SoftwarePackage pkg = SoftwarePackage.builder()
                .name(name).version(version).category(category).description(description)
                .status(PackageStatus.INSTALLING).installedBy(installedBy)
                .build();
        pkg = repository.save(pkg);

        try {
            Path packageDir = Path.of(softwarePath, name, version);
            Files.createDirectories(packageDir);

            String origName = archive.getOriginalFilename() != null
                    ? archive.getOriginalFilename() : "archive.tar.gz";

            // ── Распаковка ──────────────────────────────────────────────────
            if (origName.endsWith(".zip")) {
                // zip требует файл на диске
                Path tempZip = packageDir.resolve("_upload_tmp.zip");
                try {
                    try (InputStream in = archive.getInputStream()) {
                        Files.copy(in, tempZip);
                    }
                    extractZipToDir(tempZip, packageDir);
                } finally {
                    Files.deleteIfExists(tempZip);
                }
            } else {
                // tar: стримим напрямую в процесс — не пишем архив на диск
                Path tempExtract = packageDir.resolve("_extract_tmp");
                Files.createDirectories(tempExtract);
                try {
                    try (InputStream in = archive.getInputStream()) {
                        extractTarStreaming(in, origName, tempExtract);
                    }
                    unwrapAndMove(tempExtract, packageDir);
                } finally {
                    if (Files.exists(tempExtract)) deleteRecursively(tempExtract);
                }
            }

            // ── Пост-установочный скрипт ─────────────────────────────────
            if (installScript != null && !installScript.isBlank()) {
                executeInstallScript(installScript, packageDir);
            }

            // ── Modulefile ───────────────────────────────────────────────
            Path moduleDir = Path.of(modulesPath, name);
            Files.createDirectories(moduleDir);
            Path moduleFile = moduleDir.resolve(version);
            String content = (moduleContent != null && !moduleContent.isBlank())
                    ? moduleContent
                    : generateModuleFile(name, version, description, packageDir.toString(), binaryPath, libPath);
            Files.writeString(moduleFile, content);
            log.info("Создан modulefile: {}", moduleFile);

            pkg.setInstallPath(packageDir.toString());
            pkg.setModuleFilePath(moduleFile.toString());
            pkg.setStatus(PackageStatus.AVAILABLE);
            return repository.save(pkg);

        } catch (Exception e) {
            pkg.setStatus(PackageStatus.BROKEN);
            repository.save(pkg);
            throw e;
        }
    }

    // ─── Обновление метаданных ────────────────────────────────────────────────

    @Transactional
    public SoftwarePackage updateMetadata(Long id, UpdateSoftwareRequest request) {
        SoftwarePackage pkg = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Пакет не найден: " + id));
        if (request.getDescription() != null) pkg.setDescription(request.getDescription());
        if (request.getCategory() != null) pkg.setCategory(request.getCategory());
        if (request.getInstalledBy() != null) pkg.setInstalledBy(request.getInstalledBy());
        return repository.save(pkg);
    }

    // ─── Статус и удаление ────────────────────────────────────────────────────

    @Transactional
    public SoftwarePackage updateStatus(Long id, PackageStatus status) {
        SoftwarePackage pkg = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Пакет не найден: " + id));
        pkg.setStatus(status);
        return repository.save(pkg);
    }

    @Transactional
    public void deletePackage(Long id, boolean deleteFiles) throws IOException {
        SoftwarePackage pkg = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Пакет не найден: " + id));

        if (deleteFiles) {
            if (pkg.getModuleFilePath() != null) {
                Files.deleteIfExists(Path.of(pkg.getModuleFilePath()));
                log.info("Удалён modulefile: {}", pkg.getModuleFilePath());
            }
            if (pkg.getInstallPath() != null) {
                Path dir = Path.of(pkg.getInstallPath());
                if (Files.exists(dir)) {
                    deleteRecursively(dir);
                    log.info("Удалена директория ПО: {}", dir);
                }
            }
        }

        repository.delete(pkg);
    }

    // ─── Modulefile ───────────────────────────────────────────────────────────

    public String getModuleFileContent(Long id) throws IOException {
        SoftwarePackage pkg = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Пакет не найден: " + id));
        if (pkg.getModuleFilePath() == null) return "";
        Path mf = Path.of(pkg.getModuleFilePath());
        return Files.exists(mf) ? Files.readString(mf) : "";
    }

    // ─── Приватные методы ─────────────────────────────────────────────────────

    /**
     * Стриминговая распаковка tar-архива: InputStream пайпится напрямую в stdin
     * процесса tar — архив не сохраняется на диск.
     */
    private void extractTarStreaming(InputStream in, String filename, Path destDir)
            throws IOException, InterruptedException {

        String flag = getTarCompressionFlag(filename);
        ProcessBuilder pb = new ProcessBuilder("tar", flag, "-x", "-C", destDir.toString());
        pb.redirectErrorStream(true);
        Process p = pb.start();

        // Пайп InputStream → stdin процесса в отдельном потоке
        Thread pipeThread = Thread.ofVirtual().start(() -> {
            try (OutputStream stdin = p.getOutputStream()) {
                in.transferTo(stdin);
            } catch (IOException e) {
                // broken pipe если процесс завершился раньше — игнорируем
            }
        });

        String output = new BufferedReader(new InputStreamReader(p.getInputStream()))
                .lines().collect(Collectors.joining("\n"));
        int exit = p.waitFor();
        pipeThread.join();

        if (exit != 0) {
            throw new RuntimeException("Ошибка распаковки tar (exit " + exit + "): " + output);
        }
    }

    /**
     * Распаковка zip: требует файл на диске.
     */
    private void extractZipToDir(Path zipFile, Path destDir) throws IOException, InterruptedException {
        Path tempExtract = destDir.resolve("_zip_extract_tmp");
        Files.createDirectories(tempExtract);
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "unzip", "-q", zipFile.toString(), "-d", tempExtract.toString());
            pb.redirectErrorStream(true);
            Process p = pb.start();
            String output = new BufferedReader(new InputStreamReader(p.getInputStream()))
                    .lines().collect(Collectors.joining("\n"));
            int exit = p.waitFor();
            if (exit != 0) throw new RuntimeException("Ошибка распаковки zip (exit " + exit + "): " + output);

            unwrapAndMove(tempExtract, destDir);
        } finally {
            if (Files.exists(tempExtract)) deleteRecursively(tempExtract);
        }
    }

    /**
     * Если распаковка создала единственную корневую директорию (например python-3.9.18/)
     * — перемещаем её содержимое на уровень выше (unwrap).
     * Операция rename внутри одной ФС — мгновенна.
     */
    private void unwrapAndMove(Path extractedDir, Path dest) throws IOException {
        List<Path> items;
        try (var stream = Files.list(extractedDir)) {
            items = stream.toList();
        }

        Path sourceRoot = (items.size() == 1 && Files.isDirectory(items.get(0)))
                ? items.get(0) : extractedDir;

        try (var walk = Files.walk(sourceRoot)) {
            for (Path src : walk.toList()) {
                Path rel = sourceRoot.relativize(src);
                if (rel.toString().isEmpty()) continue;
                Path target = dest.resolve(rel);
                if (Files.isDirectory(src)) {
                    Files.createDirectories(target);
                } else {
                    // Попытка переименования (мгновенно на той же ФС)
                    try {
                        Files.move(src, target, StandardCopyOption.REPLACE_EXISTING,
                                StandardCopyOption.ATOMIC_MOVE);
                    } catch (AtomicMoveNotSupportedException e) {
                        Files.copy(src, target, StandardCopyOption.REPLACE_EXISTING);
                    }
                }
            }
        }
    }

    /**
     * Выполняет пост-установочный shell-скрипт в директории пакета.
     * Переменные окружения PACKAGE_DIR, MODULES_DIR доступны в скрипте.
     */
    private void executeInstallScript(String scriptContent, Path packageDir)
            throws IOException, InterruptedException {
        Path scriptFile = packageDir.resolve(".install.sh");
        Files.writeString(scriptFile, scriptContent);

        try {
            ProcessBuilder pb = new ProcessBuilder("bash", scriptFile.toString());
            pb.directory(packageDir.toFile());
            pb.environment().put("PACKAGE_DIR", packageDir.toString());
            pb.environment().put("MODULES_DIR", modulesPath);
            pb.redirectErrorStream(true);

            Process p = pb.start();
            String output = new BufferedReader(new InputStreamReader(p.getInputStream()))
                    .lines().collect(Collectors.joining("\n"));
            int exit = p.waitFor();

            if (!output.isBlank()) log.info("Install script output:\n{}", output);
            if (exit != 0) throw new RuntimeException("Install script завершился с ошибкой (exit " + exit + "): " + output);
        } finally {
            Files.deleteIfExists(scriptFile);
        }
    }

    private String getTarCompressionFlag(String filename) {
        if (filename.endsWith(".tar.gz") || filename.endsWith(".tgz")) return "-z";
        if (filename.endsWith(".tar.bz2")) return "-j";
        if (filename.endsWith(".tar.xz")) return "-J";
        return "-a"; // auto-detect
    }

    private String generateModuleFile(String name, String version, String description,
                                      String packageDir, String binaryPath, String libPath) {
        String bp = (binaryPath != null && !binaryPath.isBlank()) ? binaryPath : "bin";
        String lp = (libPath != null && !libPath.isBlank()) ? libPath : "lib";

        return "#%Module1.0\n" +
                "## Module for " + name + " " + version + "\n" +
                (description != null && !description.isBlank() ? "## " + description + "\n" : "") +
                "\n" +
                "proc ModulesHelp { } {\n" +
                "    puts stderr \"" + name + " " + version + "\"\n" +
                "}\n\n" +
                "module-whatis \"" + name + " " + version + "\"\n\n" +
                "set root " + packageDir + "\n\n" +
                "prepend-path PATH $root/" + bp + "\n" +
                "prepend-path LD_LIBRARY_PATH $root/" + lp + "\n" +
                "prepend-path MANPATH $root/share/man\n";
    }

    private String parseModuleDescription(Path moduleFile) {
        try {
            return Files.lines(moduleFile)
                    .filter(l -> l.startsWith("## ") && !l.startsWith("## Module"))
                    .map(l -> l.substring(3).trim())
                    .findFirst().orElse(null);
        } catch (IOException e) {
            return null;
        }
    }

    private void deleteRecursively(Path root) throws IOException {
        try (var walk = Files.walk(root)) {
            walk.sorted(Comparator.reverseOrder())
                    .forEach(p -> {
                        try { Files.delete(p); }
                        catch (IOException e) { throw new UncheckedIOException(e); }
                    });
        }
    }

    public record ScanResult(int added, int restored, int markedBroken) {}
}