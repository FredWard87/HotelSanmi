# Instrucciones para migrar imágenes a Firebase Storage

## 1. Configura Firebase Console

1. Ve a https://console.firebase.google.com
2. Crea un nuevo proyecto o usa uno existente
3. En **Almacenamiento** (Storage):
   - Crea un nuevo bucket
   - Copia las credenciales a `.env.local`

## 2. Obtén tus credenciales Firebase

En Firebase Console → Configuración del Proyecto → Mis apps → Web:
```
REACT_APP_FIREBASE_API_KEY=xxxxx
REACT_APP_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=tu-proyecto-id
REACT_APP_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=xxxxx
REACT_APP_FIREBASE_APP_ID=xxxxx
```

## 3. Instala Firebase

```bash
npm install firebase
```

## 4. Sube tus imágenes a Firebase Storage

Opción A - Carga manual (simple):
- Ve a Firebase Console → Storage
- Sube la carpeta `assets2` completa

Opción B - Script de carga automática (recomendado):
```bash
# Usamos firebase-tools
npm install -g firebase-tools
firebase login
firebase init storage
# Luego sube las imágenes
```

## 5. Actualiza los componentes

En lugar de:
```jsx
import whatsIcon from '../../assets2/whats.jpg';
```

Usa:
```jsx
import { getImageUrl } from '../../config/imageUrls';

// En el componente
const whatsIcon = getImageUrl('whats');
```

O mejor aún, usa URLs directas en imageUrls.js:
```jsx
import imageUrls from '../../config/imageUrls';

// En el componente
<img src={imageUrls.whats} alt="WhatsApp" />
```

## 6. Añade imágenes a .gitignore

```bash
# En frontend-capilla/.gitignore
/src/assets2/
```

Así las imágenes no se suben a Git y reduces el tamaño del repo.

## 7. Para desarrollo local

Durante desarrollo, puedes seguir teniendo las imágenes locales.
El sistema funciona con ambos: URLs remotas y locales.

## 8. Optimización adicional (CDN)

Para mejor rendimiento:
- Usa CDN de Firebase (automático)
- Comprime imágenes antes de subir
- Usa formatos modernos (WebP cuando sea posible)

---

**Ventajas:**
✅ Repo más ligero (sin imágenes pesadas)
✅ URLs persistentes en la nube
✅ Escalable a cualquier volumen
✅ Acceso rápido desde cualquier dispositivo
✅ Fácil mantenimiento y actualizaciones
