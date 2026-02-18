package ru.krezd.diploma.generator;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Date;

@Component
public class SlurmJwtGenerator {

    //TODO Генератор должен создавать jwt токен для пользователя через /jwt_hs256.key
    //TODO Далее интерцептор перехватывает запрос к slurmrestd и проверят токен на актуальность


    @Value("${slurm.jwt.key-path:/var/spool/slurm/ctld/jwt_hs256.key}")
    private String jwtKeyPath;
    @Value("${slurm.token.lifetime}")
    private long lifetime;

    private Algorithm loadAlgorithm() {
        try {
            byte[] key = Files.readAllBytes(Path.of(jwtKeyPath));
            return Algorithm.HMAC256(key);
        } catch (IOException e) {
            throw new RuntimeException("Cannot read Slurm JWT key", e);
        }
    }

    public String generateToken(String linuxUsername) {
        Instant now = Instant.now();

        return JWT.create()
                .withClaim("sun", linuxUsername)   // Slurm username
                .withIssuedAt(Date.from(now))
                .withExpiresAt(Date.from(now.plusSeconds(lifetime)))
                .sign(loadAlgorithm());
    }

    public boolean isExpired(String token) {
        try {
            DecodedJWT jwt = JWT.decode(token);
            Date expiresAt = jwt.getExpiresAt();
            return expiresAt == null || expiresAt.before(new Date());
        } catch (Exception e) {
            return true;
        }
    }

    public boolean isValid(String token) {
        try {
            JWTVerifier verifier = JWT.require(loadAlgorithm()).build();
            verifier.verify(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Instant getExpiration(String token) {
        DecodedJWT jwt = JWT.decode(token);
        Date expiresAt = jwt.getExpiresAt();
        return expiresAt == null ? null : expiresAt.toInstant();
    }

    public long getSecondsUntilExpiration(String token) {
        Instant exp = getExpiration(token);
        if (exp == null) return 0;
        return exp.getEpochSecond() - Instant.now().getEpochSecond();
    }

}
