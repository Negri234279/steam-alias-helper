# Steam Alias Helper

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Instalar-brightgreen.svg)](https://chromewebstore.google.com/detail/hmiidlmocbplaidjjpamkjondliggadb)

Una extensión de navegador que te permite gestionar una lista local de amigos de Steam por SteamID64 y actualizar sus alias/nicknames directamente desde la página de perfil de Steam Community, sin necesidad de usar la API de Steam.

## 🎯 Características

- ✅ Añadir amigos de Steam usando su SteamID64 y un alias personalizado
- ✅ Actualizar el nickname de múltiples usuarios de Steam de forma masiva
- ✅ Gestionar una lista local de alias con checkboxes para selección individual
- ✅ **Buscador en tiempo real** para filtrar alias por nombre o SteamID
- ✅ **Reemplazar caracteres/símbolos** en los alias seleccionados masivamente
- ✅ Añadir prefijos/sufijos a múltiples alias simultáneamente
- ✅ Eliminar caracteres específicos de los alias seleccionados
- ✅ Editar alias individuales
- ✅ Exportar e importar listas de alias en formato JSON
- ✅ Interfaz overlay directamente en las páginas de perfil de Steam
- ✅ Contador de amigos en la lista con resultados de búsqueda
- ✅ Detección automática de usuarios no amigos
- ✅ Sin necesidad de API Key de Steam

## 📦 Instalación

### Chrome Web Store (Recomendado)

[![Instalar desde Chrome Web Store](https://storage.googleapis.com/web-dev-uploads/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/iNEddTyWiMfLSwFD6qGq.png)](https://chromewebstore.google.com/detail/hmiidlmocbplaidjjpamkjondliggadb)

Haz clic en el botón anterior o visita directamente: https://chromewebstore.google.com/detail/hmiidlmocbplaidjjpamkjondliggadb

### Instalación Manual (Chrome / Edge / Brave)

1. Descarga o clona este repositorio
2. Abre tu navegador y navega a `chrome://extensions/` (o `edge://extensions/`)
3. Activa el "Modo de desarrollador" en la esquina superior derecha
4. Haz clic en "Cargar extensión sin empaquetar"
5. Selecciona la carpeta `src` del proyecto

### Firefox

1. Descarga o clona este repositorio
2. Abre Firefox y navega a `about:debugging#/runtime/this-firefox`
3. Haz clic en "Cargar complemento temporal..."
4. Selecciona el archivo `manifest.json` dentro de la carpeta `src`

## 🚀 Uso

### Añadir un amigo a la lista

1. Haz clic en el icono de la extensión en la barra de herramientas
2. Ingresa el SteamID64 del usuario (ejemplo: `76561198327583600`)
3. Ingresa el alias que deseas asignarle
4. Haz clic en "Añadir"

### Actualizar nicknames en Steam

1. Navega a cualquier página de perfil de Steam Community
2. La extensión mostrará un overlay en la esquina inferior derecha
3. Selecciona los amigos que deseas actualizar (o usa "Marcar todos")
4. Haz clic en "Actualizar nicknames"
5. La extensión actualizará automáticamente los nicknames de los usuarios seleccionados

### Gestionar la lista

- **Buscar**: Filtra la lista por alias o SteamID en tiempo real
- **Marcar/Desmarcar todos**: Selecciona o deselecciona todos los usuarios de la lista
- **Editar alias**: Haz clic en el lápiz junto a un usuario para modificar su alias
- **Eliminar usuario**: Haz clic en la X junto a un usuario
- **Exportar lista**: Descarga tu lista de alias en formato JSON
- **Importar lista**: Carga una lista previamente exportada

### Reemplazar caracteres en alias

1. Selecciona uno o más usuarios con los checkboxes
2. Haz clic en el botón "Reemplazar carácter"
3. Ingresa el carácter/símbolo actual que deseas reemplazar (ej: \`\`)
4. Ingresa el nuevo carácter/símbolo (ej: --)
5. Haz clic en "Aplicar"

**Características especiales:**
- Si el campo "Carácter Actual" está **vacío**, el nuevo carácter se **añade al inicio** del alias
- Si el campo "Nuevo Carácter" está **vacío**, se **elimina** el carácter actual de los alias
- Permite cambios masivos en múltiples alias simultáneamente

## 🔧 Formato del JSON

La lista de alias se almacena en el siguiente formato:

```json
[
  {
    "steamId": "76561198041183301",
    "alias": "``Pelos"
  },
  {
    "steamId": "76561198327583600",
    "alias": "--Player2"
  }
]
```

- `steamId`: SteamID64 del usuario (cadena de 17 dígitos)
- `alias`: Nickname personalizado que se asignará al usuario

## 🛠️ Tecnologías

- **Manifest V3**: Última versión del sistema de extensiones de navegador
- **Preact**: Framework ligero y rápido para la interfaz de usuario
- **TypeScript**: Tipado estático para mayor robustez del código
- **Vite**: Herramienta de build moderna y rápida
- **@crxjs/vite-plugin**: Plugin para desarrollo de extensiones con HMR
- **Custom Hooks**: Arquitectura modular con hooks personalizados
- **Shadow DOM**: Para el overlay sin conflictos de estilos
- **Chrome Storage API**: Almacenamiento local persistente

## ⚠️ Limitaciones

- Solo funciona en páginas de Steam Community
- Requiere que estés autenticado en Steam
- La actualización de nicknames utiliza manipulación del DOM, por lo que depende de la estructura actual de Steam Community
- No utiliza la API oficial de Steam

## 💻 Desarrollo

### Prerequisitos

- Node.js (versión 16 o superior)
- npm o yarn

### Instalación para desarrollo

```bash
# Clonar el repositorio
git clone https://github.com/Negri234279/steam-alias-helper.git
cd steam-alias-helper

# Instalar dependencias
npm install

# Modo desarrollo con HMR
npm run dev

# Build para producción
npm run build
```

### Estructura del Proyecto

```
src/
├── background/        # Service Worker y lógica de background
│   ├── application/   # Casos de uso y handlers
│   ├── domain/        # Modelos y servicios
│   └── infrastructure/# Implementaciones de Chrome APIs
├── components/        # Componentes Preact
├── content/          # Content Script y overlay
├── hooks/            # Custom hooks de Preact
├── popup/            # Popup de la extensión
├── shared/           # Utilidades compartidas
└── types/            # Definiciones de TypeScript
```


## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.

## 👤 Autor

**Negri234279**

- GitHub: [@Negri234279](https://github.com/Negri234279)

## 🐛 Reportar Problemas

Si encuentras algún bug o tienes una sugerencia, por favor abre un [issue](https://github.com/Negri234279/steam-alias-helper/issues) en GitHub.

---

⭐ Si este proyecto te resultó útil, considera darle una estrella en GitHub
