FROM eclipse-temurin:25-jdk-alpine AS builder
WORKDIR /app
COPY backend/.mvn/ .mvn/
COPY backend/mvnw backend/pom.xml ./
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw && ./mvnw dependency:resolve
COPY backend/src ./src
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
RUN apk add --no-cache libwebp-tools
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
