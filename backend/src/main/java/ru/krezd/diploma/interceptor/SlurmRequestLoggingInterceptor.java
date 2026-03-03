package ru.krezd.diploma.interceptor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Логирует каждый HTTP-запрос и ответ между приложением и slurmrestd/slurmdbd.
 * Включается на уровне DEBUG: logging.level.ru.krezd.diploma=DEBUG
 *
 * Требует BufferingClientHttpRequestFactory на RestTemplate,
 * чтобы тело ответа можно было прочитать несколько раз.
 */
@Component
@Slf4j
public class SlurmRequestLoggingInterceptor implements ClientHttpRequestInterceptor {

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body,
                                        ClientHttpRequestExecution execution) throws IOException {
        if (log.isDebugEnabled()) {
            log.debug("→ SLURM {} {}", request.getMethod(), request.getURI());
            if (body.length > 0) {
                log.debug("  request body : {}", new String(body, StandardCharsets.UTF_8));
            }
        }

        ClientHttpResponse response = execution.execute(request, body);

        if (log.isDebugEnabled()) {
            // BufferingClientHttpRequestFactory гарантирует повторное чтение потока
            byte[] responseBytes = StreamUtils.copyToByteArray(response.getBody());
            log.debug("← SLURM {} | body: {}",
                    response.getStatusCode(),
                    new String(responseBytes, StandardCharsets.UTF_8));
        }

        return response;
    }
}