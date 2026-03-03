package ru.krezd.diploma.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
import ru.krezd.diploma.interceptor.SlurmAuthInterceptor;
import ru.krezd.diploma.interceptor.SlurmRequestLoggingInterceptor;

import java.util.List;

@Configuration
public class RestTemplateConfig {

    @Autowired
    private SlurmAuthInterceptor slurmAuthInterceptor;

    @Autowired
    private SlurmRequestLoggingInterceptor slurmRequestLoggingInterceptor;

    @Bean(name = "slurmRestTemplate")
    public RestTemplate slurmRestTemplate() {
        // BufferingClientHttpRequestFactory позволяет читать тело ответа несколько раз
        // (нужно для logging interceptor и обработки ошибок)
        RestTemplate restTemplate = new RestTemplate(
                new BufferingClientHttpRequestFactory(simpleClientHttpRequestFactory()));
        restTemplate.setInterceptors(List.of(slurmAuthInterceptor, slurmRequestLoggingInterceptor));
        return restTemplate;
    }

    @Bean(name = "defaultRestTemplate")
    public RestTemplate defaultRestTemplate() {
        return new RestTemplate();
    }

    private SimpleClientHttpRequestFactory simpleClientHttpRequestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(30000);
        return factory;
    }
}