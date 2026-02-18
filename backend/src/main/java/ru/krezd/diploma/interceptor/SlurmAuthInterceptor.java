package ru.krezd.diploma.interceptor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import ru.krezd.diploma.service.SlurmJwtService;

import java.io.IOException;

@Component
@Slf4j
public class SlurmAuthInterceptor implements ClientHttpRequestInterceptor {

    private final SlurmJwtService slurmJwtService;

    public SlurmAuthInterceptor(SlurmJwtService slurmJwtService) {
        this.slurmJwtService = slurmJwtService;
    }

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body,
                                        ClientHttpRequestExecution execution) throws IOException {

        String username = resolveUsernameFromRequest(request);
        String token = slurmJwtService.getTokenForUser(username);

        request.getHeaders().add("X-SLURM-USER-NAME", username);
        request.getHeaders().add("X-SLURM-USER-TOKEN", token);

        return execution.execute(request, body);
    }

    private String resolveUsernameFromRequest(HttpRequest request) {
        // Извлекаем username из контекста безопасности или заголовков
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}