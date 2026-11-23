package com.rephelper.backend.media;

import com.rephelper.backend.common.BusinessException;
import java.io.IOException;
import java.io.PushbackInputStream;
import org.springframework.stereotype.Component;

@Component
public class ImageMagicByteValidator {

    public record DetectedImageType(String mimeType, String extension) {}

    public DetectedImageType detect(PushbackInputStream inputStream) {
        byte[] header = new byte[12];
        int bytesRead;
        try {
            bytesRead = inputStream.readNBytes(header, 0, header.length);
            if (bytesRead > 0) {
                inputStream.unread(header, 0, bytesRead);
            }
        } catch (IOException ex) {
            throw BusinessException.badRequest("INVALID_IMAGE", "Não foi possível ler o arquivo enviado.");
        }

        if (bytesRead < 3) {
            throw BusinessException.badRequest("INVALID_IMAGE", "Arquivo de imagem inválido ou vazio.");
        }

        // JPEG: FF D8 FF
        if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
            return new DetectedImageType("image/jpeg", ".jpg");
        }

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (bytesRead >= 8
                && (header[0] & 0xFF) == 0x89 && header[1] == 'P' && header[2] == 'N' && header[3] == 'G'
                && header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A) {
            return new DetectedImageType("image/png", ".png");
        }

        // GIF: GIF87a or GIF89a
        if (bytesRead >= 6
                && header[0] == 'G' && header[1] == 'I' && header[2] == 'F'
                && header[3] == '8' && (header[4] == '7' || header[4] == '9') && header[5] == 'a') {
            return new DetectedImageType("image/gif", ".gif");
        }

        // WebP: RIFF....WEBP
        if (bytesRead >= 12
                && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
            return new DetectedImageType("image/webp", ".webp");
        }

        throw BusinessException.badRequest(
                "UNSUPPORTED_MEDIA_TYPE",
                "Formato de imagem não suportado. Envie JPEG, PNG, WebP ou GIF."
        );
    }
}
