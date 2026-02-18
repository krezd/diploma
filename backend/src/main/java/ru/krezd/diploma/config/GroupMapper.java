package ru.krezd.diploma.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import ru.krezd.diploma.enums.UserRole;

@Component
public class GroupMapper {

    @Value("${slurm.group.user:}")
    private String userGroup;

    @Value("${slurm.group.admin:}")
    private String adminGroup;

    public String getLinuxGroup(UserRole role) {
        return switch (role) {
            case UserRole.REGULAR -> userGroup;
            case UserRole.ADMIN -> adminGroup;
            default -> userGroup;
        };
    }

    public String[] getAdditionalGroups(UserRole role) {
        return switch (role) {
            case UserRole.ADMIN -> new String[]{userGroup, adminGroup};
            case UserRole.REGULAR -> new String[]{userGroup};
            default -> new String[0];
        };
    }
}