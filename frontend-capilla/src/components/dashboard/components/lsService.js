// lsService.js
// Servicio ligero para usar localStorage como "DB" centralizada entre componentes.
// Exporta helpers para leer/escribir colecciones y un sistema de notificaciones
// (dispatchEvent + storage event) para que los componentes se sincronicen al instante.

const KEYS = {
  ROOMS: 'lc_habitaciones_v1',
  BLOCKS: 'lc_bloqueos_v1',
  RESERVAS: 'lc_reservas_v1',
  CLIENTES: 'lc_clientes_v1'
};

function safeParse(raw) {
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function read(key) {
  const raw = localStorage.getItem(key);
  return raw ? safeParse(raw) : null;
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  // Notificar en misma pestaña
  window.dispatchEvent(new CustomEvent('ls:update', { detail: { key, value } }));
}

// API
export const lsService = {
  // keys
  KEYS,
  // Rooms
  getRooms() { return read(KEYS.ROOMS) || null; },
  saveRooms(data) { write(KEYS.ROOMS, data); },
  // Blocks
  getBlocks() { return read(KEYS.BLOCKS) || null; },
  saveBlocks(data) { write(KEYS.BLOCKS, data); },
  // Reservas
  getReservas() { return read(KEYS.RESERVAS) || null; },
  saveReservas(data) { write(KEYS.RESERVAS, data); },
  // Clientes
  getClientes() { return read(KEYS.CLIENTES) || null; },
  saveClientes(data) { write(KEYS.CLIENTES, data); },
  // subscribe to updates (callback receives { key, value, sourceEvent })
  subscribe(cb) {
    const handler = (e) => cb({ key: e.detail?.key, value: e.detail?.value, source: 'custom' });
    window.addEventListener('ls:update', handler);
    // storage event for other tabs
    const storageHandler = (e) => {
      if (!e.key) return; // clear all
      cb({ key: e.key, value: safeParse(e.newValue), source: 'storage' });
    };
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('ls:update', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }
};

export default lsService;
