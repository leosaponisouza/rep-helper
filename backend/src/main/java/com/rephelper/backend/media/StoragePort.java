package com.rephelper.backend.media;

import java.io.InputStream;
import java.util.Optional;
import org.springframework.core.io.Resource;

public interface StoragePort {

    void store(String bucket, String ownerId, String filename, InputStream data);

    Optional<Resource> load(String bucket, String ownerId, String filename);

    boolean delete(String bucket, String ownerId, String filename);
}
