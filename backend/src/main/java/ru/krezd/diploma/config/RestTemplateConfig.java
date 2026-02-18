package ru.krezd.diploma.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
import ru.krezd.diploma.interceptor.SlurmAuthInterceptor;

import java.util.Collections;

@Configuration
public class RestTemplateConfig {

    @Autowired
    private SlurmAuthInterceptor slurmAuthInterceptor;

    @Bean(name = "slurmRestTemplate")
    public RestTemplate slurmRestTemplate() {
        RestTemplate restTemplate = new RestTemplate(simpleClientHttpRequestFactory());
        restTemplate.setInterceptors(Collections.singletonList(slurmAuthInterceptor));
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