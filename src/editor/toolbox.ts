import type { TFunction } from 'i18next';

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

export const buildToolboxXml = (t: TFunction): string => `
<xml id="scribbler-toolbox">
  <category name="${t('blocks.category_motion')}" colour="220">
    <block type="drive_distance"></block>
    <block type="rotate_degrees"></block>
    <block type="drive_wheels"></block>
    <block type="drive_arc"></block>
    <block type="stop"></block>
  </category>
  <category name="${t('blocks.category_sound')}" colour="60">
    <block type="beep"></block>
    <block type="wait"></block>
  </category>
  <category name="${t('blocks.category_loops')}" colour="290">
    <block type="repeat"></block>
    <block type="while_sensor"></block>
    <block type="while_not_sensor"></block>
  </category>
  <category name="${t('blocks.category_sensors')}" colour="210">
    <block type="if_sensor"></block>
  </category>
</xml>
`.trim();
