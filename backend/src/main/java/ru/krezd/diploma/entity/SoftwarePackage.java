package ru.krezd.diploma.entity;

import jakarta.persistence.*;
import lombok.*;
import ru.krezd.diploma.enums.PackageStatus;

import java.time.Instant;

@Entity
@Table(name = "software_packages",
        uniqueConstraints = @UniqueConstraint(columnNames = {"name", "version"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SoftwarePackage {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String version;

    private String category;

    @Column(length = 1000)
    private String description;

    /** Путь к директории с ПО, например /shared/software/python/3.9.18 */
    private String installPath;

    /** Путь к modulefile, например /shared/software/modules/python/3.9.18 */
    private String moduleFilePath;

    private String installedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PackageStatus status;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}