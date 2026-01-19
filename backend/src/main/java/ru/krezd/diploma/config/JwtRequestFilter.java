package ru.krezd.diploma.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import ru.krezd.diploma.entity.User;
import ru.krezd.diploma.repository.UserRepository;
import ru.krezd.diploma.service.JwtService;
import ru.krezd.diploma.service.RefreshTokenService;
import ru.krezd.diploma.service.UserService;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@AllArgsConstructor
public class JwtRequestFilter extends OncePerRequestFilter
{
    @Autowired
    private JwtService jwtService;
    @Autowired
    private UserDetailsService userService;
    @Autowired
    private UserRepository UserRepository;
    @Autowired
    private RefreshTokenService refreshTokenService;
    @Autowired
    private UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException
    {
        String authHeader = request.getHeader("Authorization");
        String username = null;
        String jwt = null;
        if(authHeader != null && authHeader.startsWith("Bearer ")){
            jwt = authHeader.substring(7);
            username = jwtService.getUsername(jwt);
            User user = userRepository.findByUsername(username).orElse(null);
            if(jwtService.isTokenExpired(jwt) || !refreshTokenService.validateTokenByUser(user)){
                username = null;
            }
        }
        if(username != null && SecurityContextHolder.getContext().getAuthentication() == null){
            UserDetails userDetails = userService.loadUserByUsername(username);
            UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(
                    userDetails,
                    null,
                    userDetails.getAuthorities()
            );

            token.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request)
            );
            SecurityContextHolder.getContext().setAuthentication(token);
        }
        filterChain.doFilter(request,response);
    }
}
