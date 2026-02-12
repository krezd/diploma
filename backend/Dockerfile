FROM eclipse-temurin:21-jre

LABEL authors="krezd"

WORKDIR /app

COPY target/*.jar diploma.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "diploma.jar"]
