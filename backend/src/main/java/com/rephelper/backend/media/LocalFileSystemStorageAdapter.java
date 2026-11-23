package com.rephelper.backend.media;

import com.rephelper.backend.common.BusinessException;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Component;

@Component
public class LocalFileSystemStorageAdapter implements StoragePort {

    private final Path rootPath;

    public LocalFileSystemStorageAdapter(
            @Value("${app.media.storage-root:./media_data}") String storageRoot
    ) {
        this.rootPath = Path.of(storageRoot).toAbsolutePath().normalize();
    }

    @Override
    public void store(String bucket, String ownerId, String filename, InputStream data) {
        Path target = resolveSafePath(bucket, ownerId, filename);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(data, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to persist media file to local volume", ex);
        }
    }

    @Override
    public Optional<Resource> load(String bucket, String ownerId, String filename) {
        Path target = resolveSafePath(bucket, ownerId, filename);
        if (!Files.exists(target) || !Files.isRegularFile(target)) {
            return Optional.empty();
        }
        try {
            Resource resource = new UrlResource(target.toUri());
            return resource.exists() && resource.isReadable() ? Optional.of(resource) : Optional.empty();
        } catch (MalformedURLException ex) {
            return Optional.empty();
        }
    }

    @Override
    public boolean delete(String bucket, String ownerId, String filename) {
        Path target = resolveSafePath(bucket, ownerId, filename);
        try {
            return Files.deleteIfExists(target);
        } catch (IOException ex) {
            return false;
        }
    }

    private Path resolveSafePath(String bucket, String ownerId, String filename) {
        Path resolved = rootPath.resolve(bucket).resolve(ownerId).resolve(filename).normalize();
        if (!resolved.startsWith(rootPath)) {
            throw BusinessException.badRequest("INVALID_MEDIA_PATH", "Caminho de arquivo inválido.");
        }
        return resolved;
    }
}
