import { describe, it, expect } from 'vitest';
import { hu } from '../src/i18n/hu.js';
import { en } from '../src/i18n/en.js';
import { de } from '../src/i18n/de.js';

function getKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...getKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe('i18n Translation Completeness', () => {
  const huKeys = getKeys(hu);
  const enKeys = getKeys(en);
  const deKeys = getKeys(de);

  it('should have all HU keys present in EN', () => {
    const missing = huKeys.filter((k) => !enKeys.includes(k));
    expect(missing, `Keys missing in EN: ${missing.join(', ')}`).toEqual([]);
  });

  it('should have all EN keys present in HU', () => {
    const missing = enKeys.filter((k) => !huKeys.includes(k));
    expect(missing, `Keys missing in HU: ${missing.join(', ')}`).toEqual([]);
  });

  it('should have all HU keys present in DE', () => {
    const missing = huKeys.filter((k) => !deKeys.includes(k));
    expect(missing, `Keys missing in DE: ${missing.join(', ')}`).toEqual([]);
  });

  it('should have all DE keys present in HU', () => {
    const missing = deKeys.filter((k) => !huKeys.includes(k));
    expect(missing, `Keys missing in HU: ${missing.join(', ')}`).toEqual([]);
  });

  it('should not have empty string translation values', () => {
    function checkEmpty(obj: any, lang: string, prefix = ''): string[] {
      const empty: string[] = [];
      for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          empty.push(...checkEmpty(obj[key], lang, fullKey));
        } else if (obj[key] === '') {
          empty.push(`${lang}:${fullKey}`);
        }
      }
      return empty;
    }

    const emptyKeys = [
      ...checkEmpty(hu, 'hu'),
      ...checkEmpty(en, 'en'),
      ...checkEmpty(de, 'de'),
    ];

    expect(emptyKeys, `Empty translation values: ${emptyKeys.join(', ')}`).toEqual([]);
  });

  it('should have consistent value types across languages', () => {
    function getTypes(obj: any, prefix = ''): Map<string, string> {
      const types = new Map<string, string>();
      for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          for (const [k, v] of getTypes(obj[key], fullKey)) {
            types.set(k, v);
          }
        } else {
          types.set(fullKey, typeof obj[key]);
        }
      }
      return types;
    }

    const huTypes = getTypes(hu);
    const enTypes = getTypes(en);
    const deTypes = getTypes(de);

    const mismatches: string[] = [];
    for (const [key, type] of huTypes) {
      if (enTypes.has(key) && enTypes.get(key) !== type) {
        mismatches.push(`EN:${key} (${type} vs ${enTypes.get(key)})`);
      }
      if (deTypes.has(key) && deTypes.get(key) !== type) {
        mismatches.push(`DE:${key} (${type} vs ${deTypes.get(key)})`);
      }
    }

    expect(mismatches, `Type mismatches: ${mismatches.join(', ')}`).toEqual([]);
  });
});
