package ru.krezd.diploma.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.krezd.diploma.entity.AppSetting;
import ru.krezd.diploma.repository.AppSettingRepository;

@Service
@RequiredArgsConstructor
public class AppSettingService {

    private static final String REGISTRATION_ENABLED_KEY = "registration.enabled";

    private final AppSettingRepository appSettingRepository;

    /**
     * Возвращает true, если публичная регистрация разрешена.
     * По умолчанию (если запись ещё не создана) — разрешена.
     */
    public boolean isRegistrationEnabled() {
        return appSettingRepository.findById(REGISTRATION_ENABLED_KEY)
                .map(s -> Boolean.parseBoolean(s.getValue()))
                .orElse(true);
    }

    /**
     * Устанавливает флаг публичной регистрации. Вызывается только администратором.
     */
    public void setRegistrationEnabled(boolean enabled) {
        AppSetting setting = appSettingRepository.findById(REGISTRATION_ENABLED_KEY)
                .orElse(AppSetting.builder().key(REGISTRATION_ENABLED_KEY).build());
        setting.setValue(String.valueOf(enabled));
        appSettingRepository.save(setting);
    }
}