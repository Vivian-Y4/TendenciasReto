#!/bin/bash

# Script para configurar backups automáticos en servidores Linux
# Este script configura cron para ejecutar backups diarios de la base de datos

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directorios
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
BACKUP_SCRIPT="${BASE_DIR}/scripts/db-backup.js"
LOG_DIR="${BASE_DIR}/../logs"

# Crear directorio de logs si no existe
mkdir -p "$LOG_DIR"

# Verificar que existe el script de backup
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo -e "${RED}Error: No se encuentra el script de backup en $BACKUP_SCRIPT${NC}"
    exit 1
fi

echo -e "${GREEN}===== CONFIGURACIÓN DE BACKUPS AUTOMÁTICOS =====${NC}"
echo -e "Script de backup: ${YELLOW}$BACKUP_SCRIPT${NC}"
echo -e "Directorio de logs: ${YELLOW}$LOG_DIR${NC}"

# Función para configurar cron
setup_cron() {
    local backup_time="$1"
    local backup_log="$LOG_DIR/backup-$(date +%Y%m%d).log"
    
    # Extraer hora y minuto del tiempo especificado
    local hour=$(echo "$backup_time" | cut -d ':' -f1)
    local minute=$(echo "$backup_time" | cut -d ':' -f2)
    
    # Crear entrada de cron
    local cron_entry="$minute $hour * * * cd $BASE_DIR && /usr/bin/node $BACKUP_SCRIPT >> $LOG_LOG 2>&1"
    
    # Verificar si ya existe una entrada para este script
    existing_cron=$(crontab -l 2>/dev/null | grep -F "$BACKUP_SCRIPT")
    
    if [ -n "$existing_cron" ]; then
        echo -e "${YELLOW}Ya existe una configuración de backup en cron.${NC}"
        echo -e "Configuración actual: ${YELLOW}$existing_cron${NC}"
        echo -e "¿Desea sobrescribirla? (s/n)"
        read -r answer
        
        if [ "$answer" != "s" ]; then
            echo -e "${YELLOW}Operación cancelada. Se mantendrá la configuración existente.${NC}"
            return
        fi
        
        # Eliminar entrada existente
        (crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT") | crontab -
    fi
    
    # Añadir nueva entrada de cron
    (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
    
    echo -e "${GREEN}Backup automático configurado para ejecutarse diariamente a las $backup_time${NC}"
    echo -e "Los logs se guardarán en: ${YELLOW}$LOG_DIR${NC}"
}

# Menú principal
echo -e "\n${GREEN}Seleccione una opción:${NC}"
echo -e "1. Configurar backup diario (3:00 AM)"
echo -e "2. Configurar backup diario en hora personalizada"
echo -e "3. Desactivar backups automáticos"
echo -e "4. Salir"

read -r option

case $option in
    1)
        setup_cron "03:00"
        ;;
    2)
        echo -e "\n${GREEN}Introduzca la hora para el backup (formato HH:MM):${NC}"
        read -r custom_time
        
        # Validar formato de hora
        if [[ $custom_time =~ ^([0-1][0-9]|2[0-3]):[0-5][0-9]$ ]]; then
            setup_cron "$custom_time"
        else
            echo -e "${RED}Formato de hora inválido. Debe ser HH:MM (por ejemplo, 03:30)${NC}"
            exit 1
        fi
        ;;
    3)
        # Eliminar entradas de cron relacionadas con backups
        crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -
        echo -e "${GREEN}Backups automáticos desactivados${NC}"
        ;;
    4)
        echo -e "${YELLOW}Saliendo sin cambios${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Opción inválida${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Configuración completada${NC}"
