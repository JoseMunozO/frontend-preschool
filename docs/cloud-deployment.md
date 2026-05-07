# Guia de despliegue cloud - App preescolar

Documento de referencia para entender como subir el proyecto a cloud y que decisiones conviene tomar antes de ponerlo en produccion.

## Objetivo

Publicar la aplicacion para que el cliente pueda acceder desde internet sin depender de la maquina local de desarrollo.

La arquitectura recomendada separa frontend, backend y base de datos:

```text
Usuario
  |
  v
Frontend React
  |
  v
Backend Spring Boot API
  |
  v
Base de datos MySQL
```

## Recomendacion inicial

Para una primera version online, conviene usar servicios simples y administrados.

```text
Frontend React: Vercel o Netlify
Backend Spring Boot: Railway, Render o Fly.io
Base de datos MySQL: Railway, DigitalOcean Managed MySQL o AWS RDS
```

Mi recomendacion practica para empezar:

```text
Backend: Railway o Render
Base de datos: Railway MySQL
Frontend: Vercel
```

Esta combinacion permite validar la aplicacion online sin configurar servidores manualmente, Nginx, certificados SSL, redes privadas o despliegues complejos.

## Estructura recomendada de proyectos

Mantener backend y frontend separados:

```text
/backend-preschool
/frontend-preschool
```

Motivos:

- El backend usa Java, Spring Boot, Maven, Flyway y MySQL.
- El frontend usara React, Vite, npm, rutas y componentes.
- Cada proyecto tiene dependencias, comandos y despliegue distinto.
- Se evita mezclar `node_modules` con el proyecto Java.
- Es mas facil desplegar el backend como API y el frontend como aplicacion estatica.

## Entornos

El proyecto deberia manejar al menos estos entornos:

```text
local: desarrollo en la maquina del programador
prod: entorno publicado para el cliente
```

Actualmente el proyecto usa `application-local.properties` para desarrollo local. Ese archivo no debe subirse a Git porque contiene credenciales locales.

Para cloud, conviene usar variables de entorno.

## Variables de entorno necesarias

En produccion no se deben dejar credenciales fijas dentro del repositorio.

Ejemplo recomendado:

```properties
spring.datasource.url=${DATABASE_URL}
spring.datasource.username=${DATABASE_USERNAME}
spring.datasource.password=${DATABASE_PASSWORD}

app.jwt.secret=${JWT_SECRET}
app.jwt.expiration-ms=${JWT_EXPIRATION_MS:86400000}
```

Variables minimas:

```text
DATABASE_URL
DATABASE_USERNAME
DATABASE_PASSWORD
JWT_SECRET
JWT_EXPIRATION_MS
SPRING_PROFILES_ACTIVE
```

Ejemplo:

```text
SPRING_PROFILES_ACTIVE=prod
JWT_EXPIRATION_MS=86400000
```

El `JWT_SECRET` debe ser largo, privado y diferente al usado en local.

## Perfil de produccion

Se puede crear un archivo:

```text
src/main/resources/application-prod.properties
```

Ejemplo:

```properties
spring.datasource.url=${DATABASE_URL}
spring.datasource.username=${DATABASE_USERNAME}
spring.datasource.password=${DATABASE_PASSWORD}

spring.jpa.hibernate.ddl-auto=validate
spring.jpa.open-in-view=false

spring.flyway.enabled=true

app.jwt.secret=${JWT_SECRET}
app.jwt.expiration-ms=${JWT_EXPIRATION_MS:86400000}
```

Notas:

- `ddl-auto=validate` ayuda a evitar que Hibernate modifique la base de datos automaticamente.
- Flyway debe encargarse de cambios versionados de esquema.
- `open-in-view=false` es recomendable para produccion, aunque puede requerir revisar endpoints con relaciones lazy.

## Base de datos

El backend usa MySQL.

Opciones recomendadas:

| Opcion | Dificultad | Comentario |
| --- | --- | --- |
| Railway MySQL | Baja | Buena para primera demo o MVP. |
| DigitalOcean Managed MySQL | Media | Buena opcion simple para produccion pequena. |
| AWS RDS MySQL | Media/Alta | Mas robusta, pero requiere mas configuracion. |
| PlanetScale | Media | Buena para MySQL serverless, revisar compatibilidad con Flyway. |

Para este proyecto, la opcion mas sencilla es empezar con Railway MySQL y luego migrar si el cliente crece.

## Flyway en cloud

Flyway ya esta configurado en el backend. Esto ayuda porque el backend puede validar y aplicar migraciones al arrancar.

Estado actual:

```text
V1: baseline sobre esquema existente
V2: seed de roles
```

Regla importante:

Todo cambio futuro de estructura debe ir en una migracion nueva:

```text
V3__nombre_del_cambio.sql
V4__nombre_del_cambio.sql
```

No conviene modificar migraciones ya aplicadas.

## Backend Spring Boot

Comando de build:

```bash
./mvnw clean package
```

Comando de arranque:

```bash
java -jar target/backend-preschool-0.0.1-SNAPSHOT.jar
```

En cloud normalmente se configura:

```text
Build command: ./mvnw clean package
Start command: java -jar target/backend-preschool-0.0.1-SNAPSHOT.jar
```

Algunos servicios detectan Java/Spring Boot automaticamente.

## CORS

Cuando exista frontend React, el backend tendra que permitir llamadas desde el dominio del frontend.

Ejemplo local:

```text
http://localhost:5173
```

Ejemplo produccion:

```text
https://frontend-preschool.vercel.app
```

Sin CORS configurado, el navegador bloqueara llamadas desde React al backend.

Esto no afecta a `api-test.http`, Postman o curl, solo a navegadores.

## Frontend React

Cuando exista el frontend, puede desplegarse en Vercel.

Variables del frontend:

```text
VITE_API_BASE_URL=https://backend-preschool.onrender.com
```

Ejemplo de consumo:

```javascript
fetch(`${import.meta.env.VITE_API_BASE_URL}/api/students`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

En local:

```text
VITE_API_BASE_URL=http://localhost:8080
```

En produccion:

```text
VITE_API_BASE_URL=https://api.preescolar.com
```

## Dominios

Para una version profesional, lo ideal seria:

```text
https://app.nombrepreescolar.com     -> frontend
https://api.nombrepreescolar.com     -> backend
```

Tambien se puede empezar con dominios temporales:

```text
frontend-preschool.vercel.app
backend-preschool.onrender.com
```

## Seguridad basica para produccion

Antes de publicar para cliente real:

- Usar `JWT_SECRET` fuerte y privado.
- No subir `application-local.properties`.
- No usar passwords demo en produccion.
- Cambiar usuarios seed/demo si existen.
- Activar HTTPS.
- Revisar CORS para permitir solo el dominio real del frontend.
- Revisar permisos por roles.
- Revisar logs para no imprimir tokens ni passwords.
- Hacer backup de la base de datos.

## Backups

Para cliente real, la base de datos debe tener backup automatico.

Minimo recomendado:

```text
Backup diario
Retencion de 7 a 30 dias
Posibilidad de restauracion manual
```

Railway y Render pueden servir para demos, pero para produccion seria mejor una base administrada con backups claros, como DigitalOcean Managed MySQL o AWS RDS.

## Logs y monitoreo

En cloud conviene revisar:

- Logs del backend.
- Errores 500.
- Tiempo de respuesta.
- Uso de CPU/memoria.
- Conexion a MySQL.
- Fallos de Flyway.

Mas adelante se podria agregar:

- Sentry para errores.
- UptimeRobot para verificar disponibilidad.
- Grafana/Prometheus si el proyecto crece.

## Ruta recomendada por fases

### Fase 1: Demo online

Objetivo: validar que el proyecto funciona publicado.

```text
Backend: Railway o Render
BD: Railway MySQL
Frontend: todavia no aplica o Vercel cuando exista
Dominio: temporal del proveedor
```

### Fase 2: MVP para cliente

Objetivo: que el cliente pruebe la aplicacion con datos reales o casi reales.

```text
Backend: Render/Railway/Fly.io
BD: servicio administrado con backups
Frontend: Vercel
Dominio: app.nombrepreescolar.com
```

### Fase 3: Produccion mas seria

Objetivo: estabilidad, backups y control.

```text
Backend: AWS ECS, AWS Elastic Beanstalk, DigitalOcean App Platform o VPS gestionado
BD: AWS RDS o DigitalOcean Managed MySQL
Frontend: Vercel, Netlify o CDN
Dominios propios
Backups automaticos
Monitoreo
```

## No recomendado al inicio

Para este proyecto, no empezaria por:

- Kubernetes.
- AWS completo desde cero.
- Servidor VPS manual con Nginx si no es necesario.
- Meter frontend React dentro del mismo proyecto Spring.
- Guardar credenciales en Git.
- Usar una base de datos local para produccion.

## Checklist antes de desplegar backend

- [ ] Crear `application-prod.properties`.
- [ ] Configurar variables de entorno.
- [ ] Confirmar que Flyway valida correctamente.
- [ ] Confirmar que MySQL cloud acepta conexiones desde el backend.
- [ ] Configurar `SPRING_PROFILES_ACTIVE=prod`.
- [ ] Revisar `SecurityConfig`.
- [ ] Configurar CORS cuando exista frontend.
- [ ] Cambiar credenciales demo.
- [ ] Ejecutar `./mvnw test`.
- [ ] Generar build con `./mvnw clean package`.
- [ ] Probar login contra backend publicado.
- [ ] Probar endpoints principales con `api-test.http` o Postman.

## Decision recomendada

Para aprender y avanzar rapido:

```text
Railway: backend + MySQL
Vercel: frontend React
```

Para cliente real con mas control:

```text
DigitalOcean App Platform + Managed MySQL
o
AWS backend + RDS MySQL
```

La prioridad ahora no deberia ser elegir la infraestructura mas compleja, sino preparar bien el proyecto para que pueda correr con variables de entorno, Flyway y CORS limpio.
