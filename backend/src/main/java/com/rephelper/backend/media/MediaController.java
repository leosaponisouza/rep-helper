package com.rephelper.backend.media;

import com.rephelper.backend.config.UserPrincipal;
import java.util.concurrent.TimeUnit;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/media")
public class MediaController {

    private final MediaStorageService mediaStorageService;

    public MediaController(MediaStorageService mediaStorageService) {
        this.mediaStorageService = mediaStorageService;
    }

    @PostMapping(value = "/{bucket}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MediaStorageService.UploadResult> upload(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String bucket,
            @RequestParam("file") MultipartFile file
    ) {
        MediaStorageService.UploadResult result =
                mediaStorageService.upload(bucket, principal.getUid(), file);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @DeleteMapping("/{bucket}/{filename}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String bucket,
            @PathVariable String filename
    ) {
        mediaStorageService.deleteOwned(bucket, principal.getUid(), filename);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/public/{bucket}/{userId}/{filename}")
    public ResponseEntity<Resource> servePublic(
            @PathVariable String bucket,
            @PathVariable String userId,
            @PathVariable String filename
    ) {
        MediaStorageService.MediaFileResource media =
                mediaStorageService.loadPublic(bucket, userId, filename);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(media.contentType()))
                .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .header("X-Content-Type-Options", "nosniff")
                .body(media.resource());
    }
}
