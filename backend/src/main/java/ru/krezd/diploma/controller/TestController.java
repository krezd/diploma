package ru.krezd.diploma.controller;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.krezd.diploma.entity.User;
import ru.krezd.diploma.repository.UserRepository;

@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestController
{

    @Autowired
    private UserRepository userRepository;


    @GetMapping("/get")
    public ResponseEntity<?> getUser()
    {
        return ResponseEntity.ok(userRepository.findAll());
    }
}
