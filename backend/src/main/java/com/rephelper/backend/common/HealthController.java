package com.rephelper.backend.common;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final DataSource dataSource;
    private final Path storageRoot;

    public HealthController(
            DataSource dataSource,
            @Value("${app.media.storage-root:./media_data}") String storageRoot
    ) {
        this.dataSource = dataSource;
        this.storageRoot = Path.of(storageRoot).toAbsolutePath().normalize();
    }

    @GetMapping
    public ResponseEntity<Map<String, String>> health() {
        boolean dbUp = checkDatabase();
        boolean storageUp = checkStorage();
        boolean healthy = dbUp && storageUp;

        Map<String, String> payload = Map.of(
                "status", healthy ? "UP" : "DOWN",
                "database", dbUp ? "UP" : "DOWN",
                "storage", storageUp ? "UP" : "DOWN"
        );
        return ResponseEntity.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(payload);
    }

    private boolean checkDatabase() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(2);
        } catch (Exception ex) {
            return false;
        }
    }

    private boolean checkStorage() {
        try {
            Files.createDirectories(storageRoot);
            return Files.isWritable(storageRoot);
        } catch (Exception ex) {
            return false;
        }
    }
}
