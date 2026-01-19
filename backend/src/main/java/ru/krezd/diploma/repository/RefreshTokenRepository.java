package ru.krezd.diploma.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.krezd.diploma.entity.RefreshToken;
import ru.krezd.diploma.entity.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long>
{
    Optional<RefreshToken> findByToken(String token);
    Optional<RefreshToken> findByUser(User user);
    Boolean existsByUser(User user);
}
