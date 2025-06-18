# Guu00eda de Base de Datos para Blockchain Voting Platform

## Tabla de Contenidos

1. [Introduccin](#1-introduccin)
2. [Modelos Optimizados](#2-modelos-optimizados)
3. [u00cdndices para Consultas Frecuentes](#3-u00edndices-para-consultas-frecuentes)
4. [Backups Automticos](#4-backups-automticos)
5. [Sistema de Migraciones](#5-sistema-de-migraciones)
6. [Mantenimiento y Optimizacin](#6-mantenimiento-y-optimizacin)
7. [Procedimientos Recomendados](#7-procedimientos-recomendados)

## 1. Introduccin

Este documento proporciona una guua completa sobre las optimizaciones y mejoras implementadas en la capa de base de datos de la plataforma de votacin blockchain. Las mejoras se centran en tres reas principales:

- **u00cdndices para consultas frecuentes**: Mejora del rendimiento para las consultas ms comunes
- **Backups automticos**: Sistemas de copia de seguridad programada y restauracin
- **Migraciones para cambios en esquemas**: Marco para gestionar evolucin de la estructura de datos

Estas mejoras garantizan que la plataforma sea escalable, mantenible y resiliente ante fallos.

## 2. Modelos Optimizados

Los siguientes modelos han sido optimizados para un mejor rendimiento y una gestin ms eficiente de los datos:

### User

El modelo de usuario optimizado (`User_Optimized.js`) incluye:

- u00cdndices para bsquedas rpidas por direccin de wallet
- u00cdndices para filtrado por rol y estado administrativo
- u00cdndices para consultas de actividad reciente
- Mtodos estticos para consultas comunes

### ElectionMeta

El modelo de elecciones optimizado (`ElectionMeta_Optimized.js`) incluye:

- u00cdndices compuestos para filtrado por estado y categora
- u00cdndices de texto para bsqueda en ttulos
- u00cdndices temporales para consultas de elecciones activas/finalizadas
- Mtodos para encontrar elecciones activas, finalizadas o por categora

### CandidateMeta

El modelo de candidatos optimizado (`CandidateMeta_Optimized.js`) incluye:

- u00cdndices compuestos para unicidad de candidatos en elecciones
- u00cdndices de texto para bsqueda en nombres y descripciones
- Mtodos para operaciones comunes como incrementar contadores de visitas

### VotingStatistics

El modelo de estadsticas optimizado (`VotingStatistics_Optimized.js`) incluye:

- u00cdndices para consultas de participacin
- u00cdndices temporales para anlisis de tendencias
- Mtodos para actualizar estadsticas y registrar nuevos votos

## 3. u00cdndices para Consultas Frecuentes

### Tipos de u00cdndices Implementados

1. **u00cdndices Simples**: Para campos individuales frecuentemente consultados
   ```javascript
   UserSchema.index({ email: 1 }, { sparse: true });
   ```

2. **u00CDndices Compuestos**: Para consultas que filtran por mltiples campos
   ```javascript
   ElectionMetaSchema.index({ status: 1, category: 1 });
   ```

3. **u00CDndices de Texto**: Para bsquedas textuales eficientes
   ```javascript
   ElectionMetaSchema.index({ 'translations.es.title': 'text', 'translations.en.title': 'text' });
   ```

4. **u00CDndices Geoespaciales**: Para consultas basadas en ubicacin
   ```javascript
   UserSchema.index({ 'geolocation.coordinates': '2dsphere' });
   ```

### Mtodos Optimizados de Consulta

Se han implementado mtodos estticos en los modelos para encapsular consultas comunes y complejas:

```javascript
UserSchema.statics.findByRole = function(role) {
  return this.find({ roles: role });
};

ElectionMetaSchema.statics.findActive = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    startTime: { $lte: now },
    endTime: { $gt: now }
  }).sort({ endTime: 1 });
};
```

### Herramienta de Optimizacin de u00CDndices

Se ha desarrollado un script para analizar y optimizar ndices basado en patrones de uso:

```bash
node server/scripts/optimize-indexes.js
```

Esta herramienta:
- Identifica ndices sin uso que pueden eliminarse
- Detecta consultas lentas que podran beneficiarse de nuevos ndices
- Proporciona recomendaciones para optimizar el rendimiento

## 4. Backups Automticos

### Sistema de Backup para MongoDB

Se ha implementado un sistema de backup automtico con las siguientes caractersticas:

- **Backups Programados**: Ejecucin diaria en horarios de baja carga
- **Compresion**: Reduccin del tamao de los archivos de backup
- **Retencin Configurable**: Poltica de retencin para gestionar el espacio
- **Verificacin de Integridad**: Validacin de backups creados

### Scripts de Backup

1. **db-backup.js**: Script principal para realizar backups
   ```bash
   node server/scripts/db-backup.js
   ```

2. **db-restore.js**: Herramienta interactiva para restaurar backups
   ```bash
   node server/scripts/db-restore.js
   ```

3. **setup-linux-backups.sh**: Configuracin de cron en servidores Linux
   ```bash
   bash server/scripts/setup-linux-backups.sh
   ```

4. **backup_scheduler.bat**: Configuracin del Programador de tareas en Windows
   ```bash
   server\scripts\backup_scheduler.bat
   ```

### Poltica de Retencin

La poltica de retencin predeterminada mantiene:
- Backups diarios durante 30 das
- Es configurable en el archivo `db-backup.js`

## 5. Sistema de Migraciones

### Marco de Migraciones

Se ha desarrollado un sistema completo para gestionar cambios en el esquema de la base de datos:

- **Versionado**: Migraciones numeradas secuencialmente (0001, 0002...)
- **Bidireccional**: Soporte para aplicar (up) y revertir (down) cambios
- **Transaccional**: Garantas ACID para evitar estados inconsistentes
- **Registro**: Seguimiento de migraciones aplicadas

### CLI de Migraciones

```bash
node server/migrations/migrate-cli.js [comando]
```

Comandos disponibles:
- `create [nombre]`: Crear nuevo archivo de migracin
- `up`: Aplicar todas las migraciones pendientes
- `down`: Revertir la ltima migracin aplicada
- `status`: Mostrar estado actual de migraciones

### Ejemplos de Migraciones

1. **Aadiendo nuevos campos**:
   ```javascript
   async up(mongoose, session) {
     const db = mongoose.connection.db;
     await db.collection('electionmetas').updateMany(
       { status: { $exists: false } },
       { $set: { status: 'active' } },
       { session }
     );
   }
   ```

2. **Creando ndices**:
   ```javascript
   async up(mongoose, session) {
     const db = mongoose.connection.db;
     await db.collection('users').createIndex(
       { 'geolocation.coordinates': '2dsphere' },
       { session }
     );
   }
   ```

## 6. Mantenimiento y Optimizacin

### Monitoreo de Rendimiento

Recomendaciones para monitorear el rendimiento de la base de datos:

1. **Consultas Lentas**: Configurar el perfil de MongoDB para registrar consultas lentas
   ```javascript
   db.setProfilingLevel(1, 100); // Registra consultas que tardan > 100ms
   ```

2. **Anlisis de u00CDndices**: Ejecutar regularmente la herramienta de optimizacin de ndices
   ```bash
   node server/scripts/optimize-indexes.js
   ```

3. **Estadsticas de Colecciones**: Verificar el tamao y crecimiento de las colecciones
   ```javascript
   db.collection.stats()
   ```

### Mantenimiento Programado

Tareas recomendadas de mantenimiento programado:

1. **Verificacin de Backups**: Probar regularmente la restauracin de backups

2. **Compactacin de Datos**: Ejecutar compactacin peridica
   ```javascript
   db.runCommand({ compact: 'collection_name' })
   ```

3. **Validacin de Datos**: Ejecutar validaciones peridicas
   ```javascript
   db.runCommand({ validate: 'collection_name' })
   ```

## 7. Procedimientos Recomendados

### Mejores Prcticas para Consultas

1. **Limitar Resultados**: Siempre usar limit() para evitar resultados enormes
   ```javascript
   db.collection.find().limit(100)
   ```

2. **Proyeccin**: Especificar solo los campos necesarios
   ```javascript
   db.collection.find({}, { field1: 1, field2: 1 })
   ```

3. **Paginacin**: Usar skip() y limit() para paginacin
   ```javascript
   db.collection.find().skip(page * size).limit(size)
   ```

### Escalabilidad

Consideraciones para escalar la base de datos:

1. **Sharding**: Dividir datos en mltiples servidores cuando sea necesario

2. **u00CDndices Selectivos**: Mantener ndices enfocados en consultas frecuentes

3. **Lecturas Secundarias**: Usar secondaryPreferred para lecturas no crticas
   ```javascript
   db.collection.find().readPref('secondaryPreferred')
   ```

### Seguridad

Medidas de seguridad implementadas y recomendadas:

1. **Backups Cifrados**: Los backups se comprimen y pueden cifrarse

2. **Anonimizacin**: Datos geoespaciales y demografa se almacenan anonimizados

3. **Validacin**: Esquemas con validacin para garantizar integridad de datos
