package ru.krezd.diploma.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import ru.krezd.diploma.entity.User;
import ru.krezd.diploma.repository.UserRepository;

import java.io.IOException;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService
{
    private final UserRepository userRepository;
    private final FilesService filesService;

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

    @Transactional
    public Optional<User> findByUsername(String username)
    {
        return userRepository.findByUsername(username);
    }

    @Transactional
    public User createUser(String username, String password, String name) throws IOException
    {
        if (userRepository.findByUsername(username).isPresent())
        {
            throw new IllegalArgumentException("Пользователь с username '" + username + "' уже существует");
        }

        User user = User.builder()
                .username(username)
                .password(password)
                .name(name)
                .build();

        //TODO в идеале тут этого быть не должно (нарушение single...)
        filesService.createUserDir(username);

        return userRepository.save(user);
    }


}
