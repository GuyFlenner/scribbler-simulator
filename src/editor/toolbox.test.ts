import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import { buildBlockDefinitions, buildToolboxXml } from './toolbox';

// Toolbox XML is built from i18n keys; identity-translate to keep assertions
// about structure independent of locale content.
const t = ((key: string) => key) as unknown as TFunction;

const blockTypesInXml = (xml: string): string[] =>
  [...xml.matchAll(/<block type="([^"]+)">/g)].map((m) => m[1]);

describe('buildToolboxXml — grade filtering', () => {
  it('grade4 (and the default) hides the advanced motor blocks', () => {
    const xml = buildToolboxXml(t, 'grade4');
    expect(blockTypesInXml(xml)).toEqual([
      'drive_distance',
      'rotate_degrees',
      'stop',
      'beep',
      'wait',
      'repeat',
      'while_sensor',
      'while_not_sensor',
      'if_sensor',
    ]);
    expect(buildToolboxXml(t)).toBe(xml);
  });

  it('grade5 offers a second rotate entry preset to 45°', () => {
    const xml = buildToolboxXml(t, 'grade5');
    expect(xml).toContain('<field name="DEGREES">45</field>');
    expect(blockTypesInXml(xml).filter((type) => type === 'rotate_degrees')).toHaveLength(2);
    expect(xml).not.toContain('drive_wheels');
  });

  it('grade79 exposes drive_wheels and drive_arc ahead of the distance blocks', () => {
    const xml = buildToolboxXml(t, 'grade79');
    const types = blockTypesInXml(xml);
    expect(types).toContain('drive_wheels');
    expect(types).toContain('drive_arc');
    expect(types.indexOf('drive_wheels')).toBeLessThan(types.indexOf('drive_distance'));
  });

  it('escapes XML-special characters from translated category names', () => {
    const evilT = ((key: string) =>
      key === 'blocks.category_motion' ? 'Mo<t&"ion>' : key) as unknown as TFunction;
    const xml = buildToolboxXml(evilT, 'grade4');
    expect(xml).toContain('Mo&lt;t&amp;&quot;ion&gt;');
    expect(xml).not.toContain('Mo<t&"ion>');
  });

  it('keeps the four category structure with stable colours', () => {
    const xml = buildToolboxXml(t, 'grade4');
    expect(xml).toContain('colour="220"'); // motion
    expect(xml).toContain('colour="60"'); // sound & time
    expect(xml).toContain('colour="290"'); // loops
    expect(xml).toContain('colour="210"'); // sensors
  });
});

describe('buildBlockDefinitions — all blocks stay registered in every grade', () => {
  it('defines the full vocabulary regardless of toolbox filtering', () => {
    const types = buildBlockDefinitions(t).map((d) => d.type);
    expect(types).toEqual([
      'drive_distance',
      'rotate_degrees',
      'drive_wheels',
      'drive_arc',
      'follow_line',
      'stop',
      'beep',
      'wait',
      'repeat',
      'if_sensor',
      'while_sensor',
      'while_not_sensor',
    ]);
  });
});
