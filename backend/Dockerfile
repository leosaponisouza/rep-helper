FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S rephelper && adduser -S rephelper -G rephelper \
    && mkdir -p /var/lib/rephelper/media/avatars /var/lib/rephelper/media/receipts \
    && chown -R rephelper:rephelper /var/lib/rephelper/media /app

COPY --from=builder /app/target/*.jar app.jar

USER rephelper
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:8080/api/v1/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
