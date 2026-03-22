# Настройка Linux кластера

### Добавления адресов для общения между узлами

    sudo nano /etc/hosts
    192.168.0.18 master

## 1. SSH

    sudo apt update
    sudo apt install openssh-server
    sudo systemctl start ssh

## 2. Munge
 Master-node

    sudo apt update
    sudo apt install -y munge libmunge-dev
    dpkg -l | grep -E '(munge)'
    sudo groupadd -r munge
    sudo useradd -r -g munge -s /bin/false -d /var/lib/munge munge
    id munge
    sudo -i
    sudo dd if=/dev/urandom bs=1 count=1024 > /etc/munge/munge.key
    sudo chown munge:munge /etc/munge/munge.key
    sudo chmod 400 /etc/munge/munge.key
    sudo systemctl enable munge
    sudo systemctl start munge
    sudo systemctl status munge
    sudo scp /etc/munge/munge.key node@192.168.0.19:/tmp/ 

 Compute-node

    sudo apt update
    sudo apt install -y munge libmunge-dev
    dpkg -l | grep -E '(munge)'
    sudo groupadd -r -g 110 munge      # где 998 — это GID с мастер-ноды
    sudo useradd -r -g munge -s /bin/false -d /var/lib/munge -u 110 munge
    sudo mv /tmp/munge.key /etc/munge/
    sudo chown munge:munge /etc/munge/munge.key
    sudo chmod 400 /etc/munge/munge.key
    sudo systemctl enable munge
    sudo systemctl start munge
    sudo systemctl status munge

 Проверка взаимодействия 

    munge -n | ssh node@192.168.0.19 unmunge

## 3. NFS

 Master-node

    sudo apt update
    sudo apt install -y nfs-kernel-server nfs-common
    sudo mkdir -p /shared/workspace
    sudo mkdir -p /shared/software
    sudo chmod 777 /shared/workspace
    sudo chmod 777 /shared/software
    sudo nano /etc/exports
    /shared/workspace *(rw,sync,no_subtree_check,no_root_squash)
    /shared/software *(rw,sync,no_subtree_check,no_root_squash)
    sudo exportfs -ra
    sudo systemctl enable --now nfs-server
    sudo systemctl restart nfs-server
    sudo systemctl status nfs-server
    showmount -e localhost
    sudo apt install -y environment-modules
    sudo mkdir -p /shared/software/modules
    sudo chmod 777 /shared/software/modules
    echo "export MODULEPATH=/shared/software/modules:\$MODULEPATH" | sudo tee -a /etc/profile.d/modules.sh
    source /etc/profile.d/modules.sh

 Compute-node

    sudo apt update
    sudo apt install -y nfs-common
    sudo mkdir -p /shared/workspace
    sudo mkdir -p /shared/software
    sudo mount -t nfs 192.168.0.18:/shared/workspace /shared/workspace
    sudo mount -t nfs 192.168.0.18:/shared/software /shared/software
    df -h | grep shared
    mount | grep nfs
    ls -la /shared/workspace/
    sudo nano /etc/fstab
    192.168.0.18:/shared/workspace /shared/workspace nfs rw,hard,intr,noatime,vers=3 0 0
    sudo mount -a
    sudo apt install -y environment-modules 
    echo "export MODULEPATH=/shared/software/modules:\$MODULEPATH" | sudo tee -a /etc/profile.d/modules.sh
    source /etc/profile.d/modules.sh

 Проверка создания файлов и т.д. 


## 4. MPI
    
 На всех узлах

    sudo apt update
    sudo apt install -y libpmix-dev openmpi-bin openmpi-common libopenmpi-dev
    ldconfig -p | grep pmix
    mpirun -version


## 5. Slurm

 Общиие настройки 
    
    sudo apt upgrade -y
    sudo apt install -y slurm-wlm
    dpkg -l | grep slurm
    sudo mkdir -p /etc/slurm
    sudo mkdir -p /var/spool/slurm/ctld
    sudo mkdir -p /var/spool/slurm/d
    sudo mkdir -p /var/log/slurm
    sudo mkdir -p /var/run/slurm
    sudo mkdir -p /var/spool/slurm/ctld/jwt
    sudo chown -R slurm:slurm /var/spool/slurm
    sudo chown -R slurm:slurm /var/log/slurm
    sudo chown -R slurm:slurm /var/run/slurm
    sudo chmod 755 /var/spool/slurm/ctld/jwt
    sudo nano /etc/slurm/slurm.conf

    # Basic configuration
    ClusterName=diplomaCluster
    ControlMachine=master
    ControlAddr=192.168.0.18
    SlurmUser=slurm
    SlurmctldPort=6817
    SlurmdPort=6818
    AuthType=auth/munge
    AuthAltTypes=auth/jwt
    AuthAltParameters=jwt_key=/var/spool/slurm/ctld/jwt_hs256.key
    StateSaveLocation=/var/spool/slurm/ctld
    SlurmdSpoolDir=/var/spool/slurm/d
    SwitchType=switch/none
    MpiDefault=pmix_v5
    SlurmctldPidFile=/var/run/slurmctld.pid
    SlurmdPidFile=/var/run/slurmd.pid
    ProctrackType=proctrack/linuxproc
    ReturnToService=2
    SlurmctldTimeout=300
    SlurmdTimeout=300
    PropagateResourceLimitsExcept=MEMLOCK
    LaunchParameters=enable_nss_slurm
    SlurmctldParameters=enable_nss_slurm
    SlurmdParameters=enable_nss_slurm
    
    # Scheduling
    SchedulerType=sched/backfill
    SelectType=select/cons_tres
    SelectTypeParameters=CR_Core
    TaskPlugin=task/none

    # Accounting
    AccountingStorageType=accounting_storage/slurmdbd
    AccountingStorageHost=master
    AccountingStoragePort=6819
    AccountingStoreFlags=job_comment
    AccountingStorageTRES=gres/gpu
    JobAcctGatherType=jobacct_gather/linux
    JobAcctGatherFrequency=30

    # Logging
    SlurmctldDebug=info
    SlurmctldLogFile=/var/log/slurm/slurmctld.log
    SlurmdDebug=info
    SlurmdLogFile=/var/log/slurm/slurmd.log
    JobCompType=jobcomp/none
    
    # Node configuration - ЗАМЕНИТЕ ЦИФРЫ НА РЕАЛЬНЫЕ
    NodeName=master CPUs=1 RealMemory=1024 State=UNKNOWN
    NodeName=node CPUs=1 RealMemory=1024 State=UNKNOWN
    
    PartitionName=debug Nodes=master,node Default=YES MaxTime=INFINITE State=UP

 Master node

    sudo dd if=/dev/random of=/var/spool/slurm/ctld/jwt_hs256.key bs=32 count=1
    sudo chown slurm:slurm /var/spool/slurm/ctld/jwt_hs256.key
    sudo chmod 600 /var/spool/slurm/ctld/jwt_hs256.key
    sudo touch /var/spool/slurm/ctld/cluster_state
    sudo chown slurm:slurm /var/spool/slurm/ctld/cluster_state
    sudo systemctl start slurmctld
    sudo systemctl enable slurmctld
    sudo systemctl status slurmctld
    sudo systemctl start slurmd
    sudo systemctl enable slurmd
    sudo systemctl status slurmd

 Compute-node

    sudo systemctl start slurmd
    sudo systemctl enable slurmd
    sudo systemctl status slurmd

## 5. Slurmrestd

 Master node

    sudo apt install -y slurmrestd
    id slurmrestd
    sudo groupadd -r slurmrestd
    sudo useradd -r -g slurmrestd -s /bin/false slurmrestd
    sudo mkdir -p /etc/systemd/system/slurmrestd.service.d
    sudo nano /etc/systemd/system/slurmrestd.service.d/override.conf

    #
    [Service]
    User=slurmrestd
    Group=slurmrestd
    
    ExecStart=
    Environment=SLURM_JWT=daemon
    
    ExecStart=/usr/sbin/slurmrestd -a rest_auth/jwt -s slurmctld,slurmdbd 0.0.0.0:6820
    # 

    sudo systemctl daemon-reload
    sudo systemctl enable --now slurmrestd
    sudo systemctl status slurmrestd

    scontrol token lifespan=3600
    export SLURM_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdW4iOiJhZG1pbiIsImlhdCI6MTc3MTgwMDE3NiwiZXhwIjoxNzcxODAxOTc2fQ.6iHiiV-JsNh20IdvjpAQ7tN3z4EJKcyCEhNZNWxrD_s
    curl -H "X-SLURM-USER-TOKEN: $SLURM_JWT" http://127.0.0.1:6820/slurm/v0.0.40/jobs

## 5. Docker

 Master node
    
    # Add Docker's official GPG key:
    sudo apt update
    sudo apt install ca-certificates curl
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc
    
    # Add the repository to Apt sources:
    sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
    Types: deb
    URIs: https://download.docker.com/linux/ubuntu
    Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
    Components: stable
    Signed-By: /etc/apt/keyrings/docker.asc
    EOF

    sudo apt update
    sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl status docker
    sudo systemctl start docker
    sudo usermod -aG docker $USER
    newgrp docker
    docker compose up -d # находясь в папке с docker-compose.yml файлом
    
    # docker-compose.yml (не окончательная версия):

    version: '3.8'
    services:
    postgres:
    image: postgres:15
    container_name: diploma-postgres
    environment:
    POSTGRES_DB: diploma
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: admin
    ports:
    - "0.0.0.0:5432:5432"
    command:
      - "postgres"
      - "-c"
      - "listen_addresses=*"
      volumes:
      - pgdata:/var/lib/postgresql/data
      networks:
      - diploma_app
      restart: unless-stopped
    
    mysql_slurm:
    image: mysql:8
    container_name: mysql_slurm
    environment:
    MYSQL_DATABASE: slurm_acct_db
    MYSQL_USER: slurm
    MYSQL_PASSWORD: slurm_secret
    MYSQL_ROOT_PASSWORD: root_secret
    volumes:
    - mysql_slurm_data:/var/lib/mysql
    ports:
      - "127.0.0.1:3307:3306"   # Только localhost — slurmdbd на том же хосте
      networks:
      - slurm_network
      restart: unless-stopped
    command: 
      - "--character-set-server=utf8mb4"
      - "--collation-server=utf8mb4_unicode_ci"
      - "--innodb-buffer-pool-size=2G"
      - "--innodb-lock-wait-timeout=900"
    
    

    volumes:
    pgdata:
    mysql_slurm_data:
    
    networks:
    diploma_app:
    slurm_network:

    docker exec mysql_slurm mysqladmin -u slurm -pslurm_secret -h 127.0.0.1 ping

## 6. Slurmdbd

 Master node

    sudo apt install -y slurmdbd
    sudo nano /etc/slurm/slurmdbd.conf

    AuthType=auth/munge
    AuthAltTypes=auth/jwt
    AuthAltParameters=jwt_key=/var/spool/slurm/ctld/jwt_hs256.key
    DbdHost=master
    DbdPort=6819
    SlurmUser=slurm
    DebugLevel=info
    LogFile=/var/log/slurm/slurmdbd.log
    PidFile=/var/run/slurm/slurmdbd.pid
    
    # MySQL через Docker (порт 3307)
    StorageType=accounting_storage/mysql
    StorageHost=127.0.0.1
    StoragePort=3307
    StorageUser=slurm
    StoragePass=slurm_secret
    StorageLoc=slurm_acct_db

    sudo chown slurm:slurm /etc/slurm/slurmdbd.conf
    sudo chmod 600 /etc/slurm/slurmdbd.conf
    sudo mkdir -p /var/run/slurm
    sudo chown slurm:slurm /var/run/slurm

 Изменение slurm.conf

    sudo nano /etc/slurm/slurm.conf

    AccountingStorageType=accounting_storage/slurmdbd
    AccountingStorageHost=master
    AccountingStoragePort=6819
    AccountingStoreFlags=job_comment
    AccountingStorageTRES=gres/gpu
    JobAcctGatherType=jobacct_gather/linux
    JobAcctGatherFrequency=30

 Master node

    docker exec mysql_slurm mysqladmin -u slurm -pslurm_secret -h 127.0.0.1 ping
    sudo systemctl enable slurmdbd
    sudo systemctl start slurmdbd
    sudo systemctl status slurmdbd

## 7. Развертывание приложения

 Master node
 
    sudo groupadd -r diploma-app
    sudo useradd -r -g diploma-app -m -d /home/diploma-app -s /bin/bash diploma-app
    sudo usermod -a -G slurm,slurmrestd diploma-app
    id diploma-app
    groups diploma-app
    sudo apt install acl
    sudo setfacl -m u:diploma-app:r /var/spool/slurm/ctld/jwt_hs256.key
    sudo -u diploma-app cat /var/spool/slurm/ctld/jwt_hs256.key > /dev/null && echo "Доступ есть" || echo "Нет доступа"
    sudo visudo -f /etc/sudoers.d/diploma-app
    diploma-app ALL=(ALL) NOPASSWD: /usr/sbin/useradd, /usr/sbin/userdel, /usr/sbin/usermod, /usr/bin/getent, /usr/bin/id, /usr/bin/passwd, /bin/chown, /bin/chmod, /bin/mkdir, /bin/rm, /bin/cp, /bin/mv, /usr/bin/sacctmgr, /usr/bin/sbatch
    sudo chmod 440 /etc/sudoers.d/diploma-app
    sudo mkdir -p /shared/workspace/diploma-app
    sudo chown diploma-app:diploma-app /shared/workspace/diploma-app
    sudo chmod 777 /shared/workspace/diploma-app # Для безопасности лучше 755 и дорабатывать логику с правами slurm на nfs
    sudo apt update
    sudo apt install -y openjdk-21-jdk
    sudo mkdir -p /opt/diploma-app
    sudo chown diploma-app:diploma-app /opt/diploma-app
    sudo usermod -a -G diploma-app slurm
    sudo usermod -a -G diploma-app slurmrestd
    sudo nano /etc/systemd/system/diploma-app.service
    #
    [Unit]
    Description=Diploma Spring Boot Application
    After=network.target slurmrestd.service
    Wants=slurmrestd.service
    
    [Service]
    Type=simple
    User=diploma-app
    Group=diploma-app
    UMask=000
    WorkingDirectory=/opt/diploma-app
    Environment="JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64"
    
    # Переопределение параметров из application.properties
    Environment="SPRING_DATASOURCE_URL=jdbc:postgresql://192.168.0.16:5432/diploma"
    Environment="SPRING_DATASOURCE_USERNAME=postgres"
    Environment="SPRING_DATASOURCE_PASSWORD=admin"
    Environment="JWT_SECRET=secret"
    Environment="JWT_ACCESSTTL=6000"
    Environment="JWT_REFRESHTTL=12000"
    Environment="ROOT_PATH=/shared/workspace/diploma-app/"
    Environment="SLURM_GROUP_USER=slurm-user"
    Environment="SLURM_GROUP_ADMIN=slurm"
    Environment="SLURM_TOKEN_LIFETIME=1800"
    
    ExecStart=/usr/bin/java -jar /opt/diploma-app/diploma.jar
    
    # Настройки безопасности
    ReadOnlyPaths=/var/spool/slurm/ctld/jwt_hs256.key
    # Логирование
    StandardOutput=journal
    StandardError=journal
    SyslogIdentifier=diploma-app
    # Рестарт при падении
    Restart=on-failure
    RestartSec=10
    RestartPreventExitStatus=255
    # Лимиты
    LimitNOFILE=65536
    LimitNPROC=65536
    
    [Install]
    WantedBy=multi-user.target
    #
    
    # Соответственно в рабочей папке должно лежать само приложение
    sudo systemctl daemon-reload
    sudo systemctl enable diploma-app
    sudo systemctl start diploma-app
    sudo systemctl status diploma-app
    sudo journalctl -u diploma-app -f

## 8. Развертывание фронтенда (Docker + nginx)

 Master node

Фронтенд собирается в Docker через многоэтапный билд (Node.js → nginx).
nginx раздаёт статику и проксирует `/api/*` на бэкенд (порт 8080 на хосте).
Бэкенд менять не нужно — CORS уже разрешает `http://192.168.*`.

### Структура файлов фронтенда

    frontend/
    ├── Dockerfile        # многоэтапная сборка: node:20-alpine → nginx:alpine
    ├── nginx.conf        # SPA-роутинг + proxy_pass /api/ → :8080
    └── .dockerignore     # исключает node_modules и dist из контекста сборки

### nginx.conf

    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        # React SPA — все неизвестные пути → index.html
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Проксирование API на бэкенд-сервис на хосте (:8080)
        location /api/ {
            proxy_pass http://host.docker.internal:8080;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 60s;
        }
    }

### Запуск через docker-compose-v2.0.yml

    # Находясь в папке backend/
    docker compose -f docker-compose-v2.0.yml up -d --build frontend

    # Пересборка после изменений в коде фронтенда
    docker compose -f docker-compose-v2.0.yml build frontend
    docker compose -f docker-compose-v2.0.yml up -d frontend

    # Логи
    docker logs diploma-frontend -f

    # Проверка (должен вернуть JSON)
    curl http://localhost/api/slurm/nodes

Приложение доступно на http://192.168.0.18 (порт 80).
