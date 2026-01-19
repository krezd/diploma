package ru.krezd.diploma.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User
{
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(nullable = false, length = 255)
    private String password;

    private String name;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate()
    {
        createdAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate()
    {
        updatedAt = OffsetDateTime.now();
    }

}
