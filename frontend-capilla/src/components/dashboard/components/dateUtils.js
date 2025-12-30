export function toISOStartInclusive(dateStr) {
return new Date(dateStr + 'T00:00:00').toISOString();
}


export function toISOEndInclusive(dateStr) {
return new Date(dateStr + 'T23:59:59.999').toISOString();
}


export function overlapsInclusive(aStart, aEnd, bStart, bEnd) {
return (
new Date(aStart) <= new Date(bEnd) &&
new Date(aEnd) >= new Date(bStart)
);
}


export function getBlockedDatesForRoom(roomId, blocks) {
const dates = new Set();


blocks.forEach(b => {
if (!b.activo || b.idHabitacion !== roomId) return;


const start = new Date(b.fechaInicio);
const end = new Date(b.fechaFin);


for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
dates.add(d.toISOString().slice(0, 10));
}
});


return Array.from(dates);
}