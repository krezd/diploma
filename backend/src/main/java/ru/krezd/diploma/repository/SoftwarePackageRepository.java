package ru.krezd.diploma.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.krezd.diploma.entity.SoftwarePackage;
import ru.krezd.diploma.enums.PackageStatus;

import java.util.List;
import java.util.Optional;

public interface SoftwarePackageRepository extends JpaRepository<SoftwarePackage, Long> {

    List<SoftwarePackage> findByStatus(PackageStatus status);

    List<SoftwarePackage> findByStatusNot(PackageStatus status);

    Optional<SoftwarePackage> findByNameAndVersion(String name, String version);
}