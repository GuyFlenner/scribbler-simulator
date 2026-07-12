import type { TFunction } from 'i18next';
import { DEFAULT_GRADE, getGradeConfig, type Grade } from '../grade/config';

export interface BlockDefinition {
  type: string;
  message0: string;
  args0?: Array<Record<string, unknown>>;
  previousStatement?: string | null;
  nextStatement?: string | null;
  message1?: string;
  args1?: Array<Record<string, unknown>>;
  message2?: string;
  args2?: Array<Record<string, unknown>>;
  colour?: number;
  tooltip?: string;
  helpUrl?: string;
}

const sensorOptions = (t: TFunction): Array<[string, string]> => [
  [t('blocks.sensor_line_left'), 'line_left'],
  [t('blocks.sensor_line_right'), 'line_right'],
  [t('blocks.sensor_obstacle_left'), 'obstacle_left'],
  [t('blocks.sensor_obstacle_right'), 'obstacle_right'],
];

export const buildBlockDefinitions = (t: TFunction): BlockDefinition[] => [
  {
    type: 'drive_distance',
    message0: t('blocks.drive_distance'),
    args0: [{ type: 'field_number', name: 'CM', value: 30 }],
    previousStatement: null,
    nextStatement: null,
    colour: 230,
    tooltip: t('blocks.drive_distance_tooltip'),
  },
  {
    type: 'rotate_degrees',
    message0: t('blocks.rotate_degrees'),
    args0: [{ type: 'field_number', name: 'DEGREES', value: 90 }],
    previousStatement: null,
    nextStatement: null,
    colour: 200,
    tooltip: t('blocks.rotate_degrees_tooltip'),
  },
  {
    type: 'drive_wheels',
    message0: t('blocks.drive_wheels'),
    args0: [
      { type: 'field_number', name: 'LEFT', value: 50, min: -100, max: 100 },
      { type: 'field_number', name: 'RIGHT', value: 50, min: -100, max: 100 },
      { type: 'field_number', name: 'DURATION_MS', value: 1000, min: 0 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 230,
    tooltip: t('blocks.drive_wheels_tooltip'),
  },
  {
    type: 'drive_arc',
    message0: t('blocks.drive_arc'),
    args0: [
      { type: 'field_number', name: 'RADIUS_CM', value: 20, min: 0 },
      { type: 'field_number', name: 'DEGREES', value: 90 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 230,
    tooltip: t('blocks.drive_arc_tooltip'),
  },
  {
    type: 'follow_line',
    message0: t('blocks.follow_line'),
    args0: [
      { type: 'field_number', name: 'SPEED', value: 60, min: 0, max: 100 },
      { type: 'field_number', name: 'SECONDS', value: 30, min: 0 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: t('blocks.follow_line_tooltip'),
  },
  {
    type: 'stop',
    message0: t('blocks.stop'),
    previousStatement: null,
    nextStatement: null,
    colour: 0,
    tooltip: t('blocks.stop_tooltip'),
  },
  {
    type: 'beep',
    message0: t('blocks.beep'),
    args0: [{ type: 'field_number', name: 'DURATION_MS', value: 200 }],
    previousStatement: null,
    nextStatement: null,
    colour: 60,
    tooltip: t('blocks.beep_tooltip'),
  },
  {
    type: 'wait',
    message0: t('blocks.wait'),
    args0: [{ type: 'field_number', name: 'SECONDS', value: 1 }],
    previousStatement: null,
    nextStatement: null,
    colour: 120,
    tooltip: t('blocks.wait_tooltip'),
  },
  {
    type: 'repeat',
    message0: t('blocks.repeat'),
    args0: [{ type: 'field_number', name: 'TIMES', value: 4 }],
    message1: t('blocks.repeat_do'),
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null,
    nextStatement: null,
    colour: 290,
    tooltip: t('blocks.repeat_tooltip'),
  },
  {
    type: 'if_sensor',
    message0: t('blocks.if_sensor'),
    args0: [{ type: 'field_dropdown', name: 'SENSOR', options: sensorOptions(t) }],
    message1: t('blocks.if_then'),
    args1: [{ type: 'input_statement', name: 'DO' }],
    message2: t('blocks.if_else'),
    args2: [{ type: 'input_statement', name: 'ELSE' }],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: t('blocks.if_tooltip'),
  },
  {
    type: 'while_sensor',
    message0: t('blocks.while_sensor'),
    args0: [{ type: 'field_dropdown', name: 'SENSOR', options: sensorOptions(t) }],
    message1: t('blocks.while_do'),
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null,
    nextStatement: null,
    colour: 290,
    tooltip: t('blocks.while_tooltip'),
  },
  {
    type: 'while_not_sensor',
    message0: t('blocks.while_not_sensor'),
    args0: [{ type: 'field_dropdown', name: 'SENSOR', options: sensorOptions(t) }],
    message1: t('blocks.while_do'),
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null,
    nextStatement: null,
    colour: 290,
    tooltip: t('blocks.while_not_tooltip'),
  },
];

// Every interpolated value is bundled config/i18n today, so there is no
// injection path — this escape is insurance so a future user-controlled
// source (custom block names, community translations) can't silently
// create one. Flagged by the 2026-07-12 security review.
const escapeXml = (value: string | number): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Build the toolbox for a grade from its GradeConfig. All blocks stay
 * registered regardless of grade (see registerBlocks) — the toolbox only
 * controls what the kid can drag in, so out-of-grade programs still render.
 */
export const buildToolboxXml = (t: TFunction, grade: Grade = DEFAULT_GRADE): string => {
  const categories = getGradeConfig(grade)
    .toolbox.map((category) => {
      const blocks = category.blocks
        .map((entry) => {
          const fields = Object.entries(entry.fields ?? {})
            .map(([name, value]) => `<field name="${escapeXml(name)}">${escapeXml(value)}</field>`)
            .join('');
          return `    <block type="${escapeXml(entry.type)}">${fields}</block>`;
        })
        .join('\n');
      return `  <category name="${escapeXml(t(category.labelKey))}" colour="${category.colour}">\n${blocks}\n  </category>`;
    })
    .join('\n');
  return `<xml id="scribbler-toolbox">\n${categories}\n</xml>`;
};
