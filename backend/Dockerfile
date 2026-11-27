FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S alpendre && adduser -S alpendre -G alpendre \
    && mkdir -p /var/lib/alpendre/media/avatars /var/lib/alpendre/media/receipts \
    && chown -R alpendre:alpendre /var/lib/alpendre/media /app

COPY --from=builder /app/target/*.jar app.jar

USER alpendre
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:8080/api/v1/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
