package ru.krezd.diploma.service;

import org.springframework.stereotype.Service;
import ru.krezd.diploma.generator.SlurmJwtGenerator;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SlurmJwtService {

    private final SlurmJwtGenerator generator;

    private final Map<String, CachedToken> cache = new ConcurrentHashMap<>();

    private static final Duration REFRESH_BEFORE = Duration.ofMinutes(2);

    public SlurmJwtService(SlurmJwtGenerator generator) {
        this.generator = generator;
    }

    public String getTokenForUser(String linuxUsername) {
        CachedToken cached = cache.get(linuxUsername);

        if (cached == null || shouldRefresh(cached)) {
            String token = generator.generateToken(linuxUsername);
            Instant exp = generator.getExpiration(token);
            cache.put(linuxUsername, new CachedToken(token, exp));
            return token;
        }

        return cached.token();
    }

    private boolean shouldRefresh(CachedToken token) {
        return token.expiresAt().minus(REFRESH_BEFORE).isBefore(Instant.now());
    }

    private record CachedToken(String token, Instant expiresAt) {}
}