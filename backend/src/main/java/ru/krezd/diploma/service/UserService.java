package ru.krezd.diploma.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import ru.krezd.diploma.entity.User;
import ru.krezd.diploma.repository.RefreshTokenRepository;
import ru.krezd.diploma.repository.UserRepository;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService
{
    private final UserRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException
    {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Пользователь не найден: " + username));
        
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .roles() // TODO: добавить роли когда будет реализовано
                .build();
    }

    /**
     * Находит пользователя по username
     * 
     * @param username имя пользователя
     * @return Optional с пользователем или пустой Optional
     */
    @Transactional
    public Optional<User> findByUsername(String username)
    {
        return userRepository.findByUsername(username);
    }

    /**
     * Создает нового пользователя
     * 
     * @param username имя пользователя
     * @param password пароль (будет захеширован)
     * @param name имя пользователя (опционально)
     * @return созданный пользователь
     * @throws IllegalArgumentException если пользователь с таким username уже существует
     */
    @Transactional
    public User createUser(String username, String password, String name)
    {
        // Проверяем, не существует ли уже пользователь с таким username
        if (userRepository.findByUsername(username).isPresent())
        {
            throw new IllegalArgumentException("Пользователь с username '" + username + "' уже существует");
        }

        // Создаем пользователя
        User user = User.builder()
                .username(username)
                .password(password)
                .name(name)
                .build();

        // Сохраняем в БД
        return userRepository.save(user);
    }
}
