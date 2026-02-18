# Бизнес процессы

## 1. Регистрация пользователя

1. Пользователь региструется в системе через веб-интерфейс
2. Создается пользователь в системе
3. Создается linux пользователь с аналогичным username и добавляется в slurm-user группу
4. 

Развернул приложение на самом сервере через .service

создал пользовател для приложения, добавил в slurm группу
https://chatgpt.com/c/6991ff74-79c4-832d-8320-d3b8e1c69276

sudo useradd -r -m -d /opt/diploma -s /bin/bash diploma
sudo usermod -aG slurm diploma
sudo usermod -aG slurm-admin diploma
groups diploma
sudo setfacl -m u:diploma:r /var/spool/slurm/ctld/jwt_hs256.key
getfacl /var/spool/slurm/ctld/jwt_hs256.key
sudo chgrp slurm /var/spool/slurm/ctld/jwt_hs256.key
sudo chmod 440 /var/spool/slurm/ctld/jwt_hs256.key


sudo mkdir -p /opt/diploma
sudo mv /tmp/diploma.jar /opt/diploma/app.jar
sudo chown -R diploma:diploma /opt/diploma


spring.application.name=diploma

spring.datasource.driver-class-name=org.postgresql.Driver
spring.datasource.url=jdbc:postgresql://192.168.0.16:5432/diploma
spring.datasource.username=postgres
spring.datasource.password=admin

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false

jwt.secret=secret
jwt.accessTtl=6000
jwt.refreshTtl=12000

root.path=/home
server.address=0.0.0.0
server.port=8080

slurm.token.lifetime=1800

sudo chown diploma:diploma /opt/diploma/application.properties
sudo nano /etc/systemd/system/diploma.service

[Unit]
Description=Diploma Spring Backend
After=network.target

[Service]
User=diploma
WorkingDirectory=/opt/diploma
ExecStart=/usr/bin/java -jar app.jar --spring.config.location=file:/opt/diploma/application.properties
SuccessExitStatus=143
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target

sudo systemctl daemon-reload
sudo systemctl enable diploma
sudo systemctl start diploma

journalctl -u diploma -f

sudo visudo -f /etc/sudoers.d/diploma-app
diploma ALL=(ALL) NOPASSWD: /usr/sbin/usermod, /usr/sbin/useradd/, /usr/sbin/userdel