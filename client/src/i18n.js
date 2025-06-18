import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Solo importamos las traducciones en español
import esTranslation from './locales/es.json';

// Configuración de i18next
i18n
  // Pasa el módulo i18n a react-i18next
  .use(initReactI18next)
  // Inicializa i18next
  .init({
    resources: {
      es: {
        translation: esTranslation
      }
    },
    lng: 'es', // Establecemos español como idioma fijo
    fallbackLng: 'es', // Idioma por defecto
    debug: false, // Desactiva los logs de depuración en producción
    
    interpolation: {
      escapeValue: false // No escapamos valores con React ya que ya lo hace
    },
  });

export default i18n;
