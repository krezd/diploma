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
    sudo chmod 777 /shared/workspace
    sudo nano /etc/exports
    /shared/workspace *(rw,sync,all_squash,no_subtree_check,root_squash,anonuid=1001,anongid=1001)
    sudo exportfs -ra
    sudo systemctl enable --now nfs-server
    sudo systemctl restart nfs-server
    sudo systemctl status nfs-server
    showmount -e localhost

 Compute-node

    sudo apt update
    sudo apt install -y nfs-common
    sudo mkdir -p /shared/workspace
    sudo mount -t nfs 192.168.0.18:/shared/workspace /shared/workspace
    df -h | grep shared
    mount | grep nfs
    ls -la /shared/workspace/
    sudo nano /etc/fstab
    192.168.0.18:/shared/workspace /shared/workspace nfs rw,hard,intr,noatime,vers=3 0 0
    sudo mount -a

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
    
    ExecStart=/usr/sbin/slurmrestd -a rest_auth/jwt -s slurmctld 0.0.0.0:68200
    # 

    sudo systemctl daemon-reload
    sudo systemctl enable --now slurmrestd
    sudo systemctl status slurmrestd

    scontrol token lifespan=3600
    export SLURM_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzE1MzI1MjEsImlhdCI6MTc3MTUyODkyMSwic3VuIjoibWFzdGVyIn0.GUo3Ty5_421BsX1xBfd9zO0q2Ge8eArBLemVrNEF9OY
    curl -H "X-SLURM-USER-TOKEN: $SLURM_JWT" http://127.0.0.1:6820/slurm/v0.0.40/jobs

## 6. Развертывание приложения

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
    diploma-app ALL=(ALL) NOPASSWD: /usr/sbin/useradd, /usr/sbin/userdel, /usr/sbin/usermod, /usr/bin/getent, /usr/bin/id, /usr/bin/passwd, /bin/chown, /bin/chmod, /bin/mkdir, /bin/rm, /bin/cp, /bin/mv
    sudo chmod 440 /etc/sudoers.d/diploma-app
    sudo mkdir -p /shared/workspace/diploma-app
    sudo chown diploma-app:diploma-app /shared/workspace/diploma-app
    sudo chmod 755 /shared/workspace/diploma-app
    sudo apt update
    sudo apt install -y openjdk-21-jdk
    sudo mkdir -p /opt/diploma-app
    sudo chown diploma-app:diploma-app /opt/diploma-app
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

    sudo systemctl daemon-reload
    sudo systemctl enable diploma-app
    sudo systemctl start diploma-app
    sudo systemctl status diploma-app
    sudo journalctl -u diploma-app -f


# Установить slurmdbd, захостить mysql, развернуть postgres для backend и автоматизировать настройку с помощью ansible