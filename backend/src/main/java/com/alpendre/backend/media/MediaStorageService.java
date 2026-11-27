package com.alpendre.backend.media;

import com.alpendre.backend.common.BusinessException;
import java.io.IOException;
import java.io.PushbackInputStream;
import java.net.URI;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MediaStorageService {

    public record UploadResult(String url, String bucket, String filename, String contentType) {}
    public record MediaFileResource(Resource resource, String contentType) {}

    private static final Set<String> ALLOWED_BUCKETS = Set.of("avatars", "receipts");
    private static final Pattern SAFE_FILENAME_PATTERN = Pattern.compile("^[a-zA-Z0-9._-]{1,128}$");
    private static final Pattern SAFE_OWNER_PATTERN = Pattern.compile("^[a-zA-Z0-9_-]{1,128}$");
    private static final Pattern PUBLIC_PATH_PATTERN =
            Pattern.compile("/api/v1/media/public/([^/]+)/([^/]+)/([^/?#]+)$");

    private final StoragePort storagePort;
    private final ImageMagicByteValidator magicByteValidator;
    private final String publicBaseUrl;
    private final long maxBytes;

    public MediaStorageService(
            StoragePort storagePort,
            ImageMagicByteValidator magicByteValidator,
            @Value("${app.public-base-url:http://localhost:8080}") String publicBaseUrl,
            @Value("${app.media.max-bytes:5242880}") long maxBytes
    ) {
        this.storagePort = storagePort;
        this.magicByteValidator = magicByteValidator;
        this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
        this.maxBytes = maxBytes;
    }

    public UploadResult upload(String bucket, UUID ownerUid, MultipartFile file) {
        String safeBucket = validateBucket(bucket);
        if (file == null || file.isEmpty()) {
            throw BusinessException.badRequest("EMPTY_FILE", "Nenhum arquivo foi enviado.");
        }
        if (file.getSize() > maxBytes) {
            throw BusinessException.badRequest("FILE_TOO_LARGE", "Arquivo excede o limite de 5 MB.");
        }

        ImageMagicByteValidator.DetectedImageType detected;
        String ownerId = ownerUid.toString();
        String filename;
        try (PushbackInputStream dataStream = new PushbackInputStream(file.getInputStream(), 12)) {
            detected = magicByteValidator.detect(dataStream);
            filename = UUID.randomUUID() + detected.extension();
            storagePort.store(safeBucket, ownerId, filename, dataStream);
        } catch (IOException ex) {
            throw BusinessException.badRequest("INVALID_IMAGE", "Não foi possível ler ou salvar o arquivo enviado.");
        }

        String publicUrl = publicBaseUrl + "/api/v1/media/public/" + safeBucket + "/" + ownerId + "/" + filename;
        return new UploadResult(publicUrl, safeBucket, filename, detected.mimeType());
    }

    public MediaFileResource loadPublic(String bucket, String ownerId, String filename) {
        String safeBucket = validateBucket(bucket);
        validateOwnerId(ownerId);
        validateFilename(filename);

        Resource resource = storagePort.load(safeBucket, ownerId, filename)
                .orElseThrow(() -> BusinessException.notFound("MEDIA_NOT_FOUND", "Arquivo não encontrado."));

        return new MediaFileResource(resource, resolveContentType(filename));
    }

    public void deleteOwned(String bucket, UUID ownerUid, String filename) {
        String safeBucket = validateBucket(bucket);
        validateFilename(filename);
        storagePort.delete(safeBucket, ownerUid.toString(), filename);
    }

    public void deleteSupersededUrl(String oldUrl, UUID expectedOwnerUid) {
        if (oldUrl == null || oldUrl.isBlank()) {
            return;
        }
        try {
            URI uri = URI.create(oldUrl.trim());
            String path = uri.getPath();
            if (path == null) return;
            Matcher matcher = PUBLIC_PATH_PATTERN.matcher(path);
            if (!matcher.find()) return;

            String bucket = matcher.group(1);
            String ownerId = matcher.group(2);
            String filename = matcher.group(3);
            if (!ALLOWED_BUCKETS.contains(bucket)) return;
            if (expectedOwnerUid != null && !expectedOwnerUid.toString().equals(ownerId)) return;
            if (!SAFE_FILENAME_PATTERN.matcher(filename).matches()) return;

            storagePort.delete(bucket, ownerId, filename);
        } catch (Exception ignored) {
            // Best-effort cleanup of superseded media
        }
    }

    private String validateBucket(String bucket) {
        if (bucket == null || !ALLOWED_BUCKETS.contains(bucket.trim().toLowerCase())) {
            throw BusinessException.badRequest("INVALID_BUCKET", "Bucket inválido. Use 'avatars' ou 'receipts'.");
        }
        return bucket.trim().toLowerCase();
    }

    private void validateOwnerId(String ownerId) {
        if (ownerId == null || !SAFE_OWNER_PATTERN.matcher(ownerId).matches() || ownerId.contains("..")) {
            throw BusinessException.badRequest("INVALID_OWNER", "Identificador de usuário inválido.");
        }
    }

    private void validateFilename(String filename) {
        if (filename == null || !SAFE_FILENAME_PATTERN.matcher(filename).matches()
                || filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw BusinessException.badRequest("INVALID_FILENAME", "Nome de arquivo inválido.");
        }
    }

    private String resolveContentType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        return "image/jpeg";
    }
}
