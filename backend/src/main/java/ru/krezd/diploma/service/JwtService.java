package ru.krezd.diploma.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;

@Service
public class JwtService
{
    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.accessTtl}")
    private long accessTtlSeconds;

    public String generateToken(String username)
    {
        Instant now = Instant.now();

        return JWT.create()
                .withSubject(username)
                .withIssuedAt(Date.from(now))
                .withExpiresAt(Date.from(now.plusSeconds(accessTtlSeconds)))
                .sign(getAlgorithm());
    }

    public String getUsername(String token)
    {
        return JWT.decode(token).getSubject();
    }

    public boolean isTokenExpired(String token)
    {
        try
        {
            DecodedJWT jwt = decode(token);
            Date expiresAt = jwt.getExpiresAt();
            return expiresAt == null || expiresAt.before(new Date());
        }
        catch (JWTVerificationException ex)
        {
            // Невалидная подпись, формат и т.п. — трактуем как "невалидный/просрочен"
            return true;
        }
    }

    public boolean validateToken(String token)
    {
        try
        {
            decode(token);
            return true;
        }
        catch (JWTVerificationException ex)
        {
            return false;
        }
    }

    private Algorithm getAlgorithm()
    {
        return Algorithm.HMAC256(secret);
    }

    private DecodedJWT decode(String token) throws JWTVerificationException
    {
        JWTVerifier verifier = JWT.require(getAlgorithm())
                .build();
        return verifier.verify(token);
    }
}
