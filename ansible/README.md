# Ansible — автоматизация развёртывания кластера

## Установка Ansible (на твоём ПК)

```bash
pip install ansible
pip install ansible-lint          # опционально, проверка плейбуков
ansible-galaxy collection install community.docker  # модули для Docker
```

## Структура

```
ansible/
├── inventory.ini              # хосты: master + compute-узлы
├── group_vars/
│   ├── all.yml                # переменные для всех узлов (IP, NFS пути, SLURM)
│   └── master.yml             # переменные только для мастера (пароли, пути)
├── playbook-master.yml        # полная настройка кластера с нуля
├── playbook-deploy.yml        # только деплой приложения (бэк + фронт)
└── roles/
    ├── common/                # базовые пакеты, munge user, SLURM директории
    ├── munge_master/          # генерация munge.key на мастере
    ├── munge_compute/         # копирование munge.key на compute-узлы
    ├── nfs_master/            # NFS сервер
    ├── nfs_compute/           # NFS клиент + монтирование
    ├── slurm/                 # slurm.conf (CPU/RAM из ansible_facts) + демоны
    ├── slurmrestd/            # REST API для SLURM
    ├── slurmdbd/              # демон учёта SLURM
    ├── docker/                # установка Docker + запуск compose
    └── backend/               # systemd-сервис Spring Boot
```

## Подготовка

### 1. Настроить inventory.ini

```ini
[master]
master ansible_host=192.168.0.18

[compute]
node01 ansible_host=192.168.0.19
node02 ansible_host=192.168.0.20   # добавляй узлы здесь

[all:vars]
ansible_user=your_user
```

### 2. Настроить SSH-ключи (без пароля)

```bash
ssh-keygen -t ed25519
ssh-copy-id your_user@192.168.0.18
ssh-copy-id your_user@192.168.0.19
```

### 3. Проверить соединение

```bash
ansible all -i inventory.ini -m ping
```

## Первичная настройка кластера с нуля

```bash
# Собрать бэкенд перед деплоем
cd ../backend && ./mvnw clean package -DskipTests

# Запустить полный плейбук
cd ../ansible
ansible-playbook -i inventory.ini playbook-master.yml
```

## Деплой обновлений приложения

```bash
cd ../backend && ./mvnw clean package -DskipTests
cd ../ansible
ansible-playbook -i inventory.ini playbook-deploy.yml
```

## Добавление нового compute-узла

1. Добавить в `inventory.ini`:
   ```ini
   node03 ansible_host=192.168.0.21
   ```
2. Настроить SSH: `ssh-copy-id your_user@192.168.0.21`
3. Запустить плейбук — `slurm.conf` пересоздастся автоматически с новым узлом:
   ```bash
   ansible-playbook -i inventory.ini playbook-master.yml
   ```

## Полезные команды

```bash
# Проверить без применения (dry-run)
ansible-playbook -i inventory.ini playbook-master.yml --check

# Запустить только конкретную роль (по тегу)
ansible-playbook -i inventory.ini playbook-master.yml --tags slurm

# Запустить только на одном хосте
ansible-playbook -i inventory.ini playbook-master.yml --limit master

# Посмотреть какие задачи выполнятся
ansible-playbook -i inventory.ini playbook-master.yml --list-tasks
```