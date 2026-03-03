package ru.krezd.diploma.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import ru.krezd.diploma.service.SlurmAccountService;
import ru.krezd.diploma.service.UserService;

/**
 * Выполняет инициализацию slurmdbd и данных приложения при старте.
 * Использует ApplicationReadyEvent чтобы дождаться полной готовности контекста.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SlurmInitializer {

    private final SlurmAccountService slurmAccountService;
    private final UserService userService;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        // 1. Сначала создаём аккаунт по умолчанию в slurmdbd
        log.info("Инициализация slurmdbd: проверка аккаунта по умолчанию...");
        slurmAccountService.ensureDefaultAccountExists();

        // 2. Затем создаём admin-пользователя (чтобы он мог быть привязан к аккаунту)
        userService.ensureDefaultAdminExists();
    }
}