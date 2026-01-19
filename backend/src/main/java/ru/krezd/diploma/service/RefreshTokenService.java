package ru.krezd.diploma.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import ru.krezd.diploma.entity.RefreshToken;
import ru.krezd.diploma.entity.User;
import ru.krezd.diploma.repository.RefreshTokenRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService
{
    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.refreshTtl}")
    private long ttl;

    public RefreshToken createOrUpdateToken(User user){
        RefreshToken token = new RefreshToken().builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiresAt(Instant.now().plusSeconds(ttl))
                .isAlive(true)
                .build();

        if(refreshTokenRepository.existsByUser(user)){
            RefreshToken prevToken = refreshTokenRepository.findByUser(user).orElse(null);
            token.setId(prevToken.getId());
        }

        refreshTokenRepository.save(token);
        return token;
    }

    public boolean validateToken(RefreshToken token)
    {
        if (!token.isAlive()) {
            return false;
        }

        if (token.getExpiresAt().isBefore(Instant.now())) {
            token.setAlive(false);
            refreshTokenRepository.save(token);
            return false;
        }

        return true;
    }

    public boolean validateToken(String tokenValue)
    {
        if (tokenValue == null || tokenValue.isBlank()) {
            return false;
        }

        Optional<RefreshToken> tokenOpt = refreshTokenRepository.findByToken(tokenValue);
        if (tokenOpt.isEmpty()) {
            return false;
        }

        RefreshToken token = tokenOpt.get();

        return validateToken(token);
    }

    public boolean validateTokenByUser(User user){

        if (user == null) {
            return false;
        }

        Optional<RefreshToken> tokenOpt = refreshTokenRepository.findByUser(user);

        if (tokenOpt.isEmpty()) {
            return false;
        }

        RefreshToken token = tokenOpt.get();
        return validateToken(token);
    }

}
