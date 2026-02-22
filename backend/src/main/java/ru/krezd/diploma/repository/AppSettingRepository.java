package ru.krezd.diploma.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.krezd.diploma.entity.AppSetting;

public interface AppSettingRepository extends JpaRepository<AppSetting, String> {
}