package ru.krezd.diploma.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

/**
 * Тело запроса для установки QOS на ассоциацию.
 * user = null/"" → account-level ассоциация.
 * qos = null → не изменять, [] → очистить список QOS.
 * defaultQos = null → не изменять, "" → очистить.
 */
@Data
public class SetAssociationQosRequest {
    @NotBlank(message = "Имя аккаунта не может быть пустым")
    private String account;
    private String user;
    private List<String> qos;
    private String defaultQos;
}