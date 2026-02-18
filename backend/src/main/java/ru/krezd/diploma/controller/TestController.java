package ru.krezd.diploma.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.krezd.diploma.repository.UserRepository;
import ru.krezd.diploma.service.SlurmJwtService;

@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestController
{

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SlurmJwtService slurmJwtService;


    @GetMapping("/get")
    public ResponseEntity<?> getUser()
    {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/getSlurmToken")
    public ResponseEntity<?> getSlurmToken(@AuthenticationPrincipal UserDetails userDetails)
    {
        return  ResponseEntity.ok(slurmJwtService.getTokenForUser(userDetails.getUsername()));
    }
}
