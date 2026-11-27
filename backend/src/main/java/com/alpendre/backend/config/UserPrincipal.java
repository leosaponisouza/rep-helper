package com.alpendre.backend.config;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class UserPrincipal implements UserDetails {

    private final UUID uid;
    private final String email;
    private final String name;
    private final UUID currentHouseId;
    private final boolean admin;
    private final boolean owner;
    private final String status;

    public UserPrincipal(
            UUID uid,
            String email,
            String name,
            UUID currentHouseId,
            boolean admin,
            boolean owner,
            String status
    ) {
        this.uid = uid;
        this.email = email;
        this.name = name;
        this.currentHouseId = currentHouseId;
        this.admin = admin;
        this.owner = owner;
        this.status = status;
    }

    public UUID getUid() { return uid; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public UUID getCurrentHouseId() { return currentHouseId; }
    public boolean isAdmin() { return admin; }
    public boolean isOwner() { return owner; }
    public String getStatus() { return status; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (admin || owner) {
            return List.of(
                    new SimpleGrantedAuthority("ROLE_USER"),
                    new SimpleGrantedAuthority("ROLE_ADMIN")
            );
        }
        return List.of(new SimpleGrantedAuthority("ROLE_USER"));
    }

    @Override
    public String getPassword() { return null; }

    @Override
    public String getUsername() { return uid.toString(); }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return !"banned".equalsIgnoreCase(status); }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return "active".equalsIgnoreCase(status); }
}
