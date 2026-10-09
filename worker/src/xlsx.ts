import { unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';

// Parse cell values synchronously: stream-based Excel readers retain callbacks
// across requests, which are incompatible with the Workers request lifecycle.
export function readWorkbook(contents: ArrayBuffer): { headers: string[]; rows: { row: number; cells: unknown[] }[] } {
  const limit = 20 * 1024 * 1024;
  let declaredSize = 0;
  const files = unzipSync(new Uint8Array(contents), { filter: entry => {
    if (entry.name.endsWith('.xml') || entry.name.endsWith('.rels')) {
      declaredSize += entry.originalSize;
      if (declaredSize > limit) throw new Error('Workbook expands beyond 20 MB');
      return true;
    }
    return false;
  } });
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', parseTagValue: false, processEntities: true });
  const xml = (path: string) => {
    const bytes = files[path]; if (!bytes) throw new Error(`Missing workbook component: ${path}`);
    const text = new TextDecoder().decode(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('Workbook XML declarations are unsupported');
    return parser.parse(text);
  };
  const array = (value: any): any[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
  const text = (value: any): string => typeof value === 'string' ? value : value?.['#text'] ?? '';
  const richText = (value: any): string => value?.t !== undefined ? text(value.t) : array(value?.r).map(part => text(part.t)).join('');
  const shared = files['xl/sharedStrings.xml'] ? array(xml('xl/sharedStrings.xml').sst?.si).map(richText) : [];
  const firstSheet = array(xml('xl/workbook.xml').workbook?.sheets?.sheet)[0];
  const relation = array(xml('xl/_rels/workbook.xml.rels').Relationships?.Relationship).find(item => item['@Id'] === firstSheet?.['@r:id']);
  if (!relation) throw new Error('Workbook has no first worksheet');
  const target = String(relation['@Target']);
  const sheetPath = target.startsWith('/') ? target.slice(1) : target.startsWith('xl/') ? target : `xl/${target.replace(/^\.\//, '')}`;
  if (sheetPath.includes('..')) throw new Error('Unsupported worksheet path');
  const sourceRows = array(xml(sheetPath).worksheet?.sheetData?.row);
  if (sourceRows.length > 501) throw new Error('Import limit is 500 rows per workbook');
  const rows = sourceRows.map((source, index) => {
    const cells: unknown[] = [];
    for (const cell of array(source.c)) {
      const ref = String(cell['@r'] || ''); const letters = ref.match(/^[A-Z]+/)?.[0];
      if (!letters) continue;
      const column = [...letters].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
      if (column > 100) throw new Error('Workbook supports at most 101 columns');
      const value = cell.v;
      cells[column] = cell['@t'] === 's' ? shared[Number(value)] ?? '' : cell['@t'] === 'inlineStr' ? richText(cell.is) : cell['@t'] === 'str' ? text(value) : value === undefined || value === '' ? null : cell['@t'] === 'b' ? String(value) : Number.isFinite(Number(value)) ? Number(value) : text(value);
    }
    return { row: Number(source['@r'] || index + 1), cells };
  });
  return { headers: (rows.shift()?.cells || []).map(value => String(value ?? '')), rows };
}
