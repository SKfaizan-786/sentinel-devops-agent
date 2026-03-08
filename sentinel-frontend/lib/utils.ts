import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key) || !isEqual(a[key], b[key])) return false;
    }
    return true;
  }
  
  return false;
}

/**
 * Filters an array of objects based on a search query and specified fields.
 * Performs a case-insensitive search.
 *
 * @template T - The type of the objects in the array.
 * @param {T[]} items - The array of objects to filter.
 * @param {string} query - The search query string.
 * @param {(keyof T)[]} fields - The fields to search within.
 * @returns {T[]} The filtered array of objects.
 */
export function filterItems<T>(items: T[], query: string, fields: (keyof T)[]): T[] {
    if (!query.trim()) return items;
    const lowerQuery = query.toLowerCase();
    
    return items.filter(item => {
        // Iterate through all specified fields for each item
        return fields.some(field => {
            const value = item[field];
            if (typeof value === 'string') {
                return value.toLowerCase().includes(lowerQuery);
            }
            return false;
        });
    });
}
