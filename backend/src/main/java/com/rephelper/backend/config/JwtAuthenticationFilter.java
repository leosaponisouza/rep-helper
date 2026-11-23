package com.rephelper.backend.config;

import com.rephelper.backend.auth.JwtService;
import com.rephelper.backend.republic.RepublicMember;
import com.rephelper.backend.republic.RepublicMemberRepository;
import com.rephelper.backend.user.User;
import com.rephelper.backend.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RepublicMemberRepository memberRepository;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            UserRepository userRepository,
            RepublicMemberRepository memberRepository
    ) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7).trim();
        Optional<UUID> userUidOpt = jwtService.extractUserUid(token);
        if (userUidOpt.isEmpty() || SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        Optional<User> userOpt = userRepository.findById(userUidOpt.get());
        if (userOpt.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        User user = userOpt.get();
        if (!"active".equalsIgnoreCase(user.getStatus())) {
            filterChain.doFilter(request, response);
            return;
        }

        boolean isAdmin = false;
        boolean isOwner = false;
        UUID currentRepublicId = user.getCurrentRepublicId();
        if (currentRepublicId != null) {
            Optional<RepublicMember> memberOpt = memberRepository
                    .findByRepublicIdAndUserUidAndStatus(currentRepublicId, user.getUid(), "ACTIVE");
            if (memberOpt.isPresent()) {
                isAdmin = memberOpt.get().isAdmin() || memberOpt.get().isOwner();
                isOwner = memberOpt.get().isOwner();
            }
        }

        UserPrincipal principal = new UserPrincipal(
                user.getUid(),
                user.getEmail(),
                user.getName(),
                currentRepublicId,
                isAdmin,
                isOwner,
                user.getStatus()
        );

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);

        MDC.put("userId", user.getUid().toString());
        if (currentRepublicId != null) {
            MDC.put("republicId", currentRepublicId.toString());
        }

        filterChain.doFilter(request, response);
    }
}
