# Docker

Docker Compose starts MySQL and the Spring Boot backend with a small demo dataset.

## Requirements

- Docker Desktop running.
- Port `8080` available for the backend.
- Port `3307` available for Docker MySQL.

## Start

```bash
docker compose up --build
```

Backend:

```text
http://localhost:8080
```

Swagger:

```text
http://localhost:8080/swagger-ui/index.html
http://localhost:8080/v3/api-docs
```

Docker MySQL is exposed on the host as:

```text
localhost:3307
```

Credentials inside Docker:

```text
Database: preschool_admin_db_v2
User: preschool
Password: preschool
Root password: rootpassword
```

Demo API users:

```text
admin@school.com / 123456
parent.demo@school.com / 123456
teacher@school.com / 123456
```

## Smoke Test

In another terminal:

```bash
API_BASE_URL=http://localhost:8080 node scripts/api-smoke-test.mjs
```

## Stop

```bash
docker compose down
```

To remove the MySQL Docker volume and start from a clean database:

```bash
docker compose down -v
```
