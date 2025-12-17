import { Entity } from '../types';

const coordKey = (x: number, y: number) => `${x},${y}`;

// Builds a position-aware mapping between glyphs on the map and entity objects.
export const buildEntityPositionMap = (mapAscii: string, entities: Entity[]) => {
  const mapping = new Map<string, Entity>();
  const used = new Set<number>();

  const rows = (mapAscii || '').split('\n');
  rows.forEach((row, y) => {
    row.split('').forEach((char, x) => {
      if (!/[A-Z]/.test(char) || char === '@') return;
      if (char === '[' || char === ']') return; // skip label brackets

      let matchIndex = entities.findIndex((e, idx) => !used.has(idx) && e.name.toUpperCase().startsWith(char));
      if (matchIndex === -1) {
        matchIndex = entities.findIndex(e => e.name.toUpperCase().startsWith(char));
      }

      const entity = matchIndex >= 0 ? entities[matchIndex] : undefined;
      if (entity) {
        if (matchIndex >= 0) used.add(matchIndex);
        mapping.set(coordKey(x, y), entity);
      }
    });
  });

  return mapping;
};

export const findEntityAt = (mapAscii: string, entities: Entity[], x: number, y: number) => {
  const mapping = buildEntityPositionMap(mapAscii, entities);
  return mapping.get(coordKey(x, y));
};

// Map markers to interactable labels in order of appearance
export const buildItemLocationMap = (mapAscii: string, interactables: string[]) => {
  const mapping = new Map<string, string>();
  const rows = (mapAscii || '').split('\n');
  const foundCoords: { x: number; y: number }[] = [];

  rows.forEach((row, y) => {
    row.split('').forEach((char, x) => {
      if (['*', '$', '!', '?'].includes(char)) {
        foundCoords.push({ x, y });
      }
    });
  });

  foundCoords.forEach((coord, index) => {
    const key = coordKey(coord.x, coord.y);
    if (index < interactables.length) {
      mapping.set(key, interactables[index]);
    } else {
      mapping.set(key, 'object');
    }
  });

  return mapping;
};
