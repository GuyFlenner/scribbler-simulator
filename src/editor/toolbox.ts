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

export const blockDefinitions: BlockDefinition[] = [
  {
    type: 'drive_distance',
    message0: 'drive %1 cm',
    args0: [{ type: 'field_number', name: 'CM', value: 30 }],
    previousStatement: null,
    nextStatement: null,
    colour: 230,
    tooltip: 'Drive forward (positive) or backward (negative) by N centimetres',
  },
  {
    type: 'rotate_degrees',
    message0: 'rotate %1 °',
    args0: [{ type: 'field_number', name: 'DEGREES', value: 90 }],
    previousStatement: null,
    nextStatement: null,
    colour: 200,
    tooltip: 'Rotate left (positive) or right (negative) by N degrees',
  },
  {
    type: 'stop',
    message0: 'stop',
    previousStatement: null,
    nextStatement: null,
    colour: 0,
    tooltip: 'Stop motion immediately',
  },
  {
    type: 'beep',
    message0: 'beep for %1 ms',
    args0: [{ type: 'field_number', name: 'DURATION_MS', value: 200 }],
    previousStatement: null,
    nextStatement: null,
    colour: 60,
    tooltip: 'Play a beep for N milliseconds',
  },
  {
    type: 'wait',
    message0: 'wait %1 seconds',
    args0: [{ type: 'field_number', name: 'SECONDS', value: 1 }],
    previousStatement: null,
    nextStatement: null,
    colour: 120,
    tooltip: 'Pause for N seconds',
  },
  {
    type: 'repeat',
    message0: 'repeat %1 times',
    args0: [{ type: 'field_number', name: 'TIMES', value: 4 }],
    message1: 'do %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null,
    nextStatement: null,
    colour: 290,
    tooltip: 'Repeat the inner blocks N times',
  },
  {
    type: 'if_sensor',
    message0: 'if %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SENSOR',
        options: [
          ['line on left', 'line_left'],
          ['line on right', 'line_right'],
          ['obstacle on left', 'obstacle_left'],
          ['obstacle on right', 'obstacle_right'],
        ],
      },
    ],
    message1: 'then %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    message2: 'else %1',
    args2: [{ type: 'input_statement', name: 'ELSE' }],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: 'Run different blocks depending on a sensor reading',
  },
  {
    type: 'while_sensor',
    message0: 'while %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SENSOR',
        options: [
          ['line on left', 'line_left'],
          ['line on right', 'line_right'],
          ['obstacle on left', 'obstacle_left'],
          ['obstacle on right', 'obstacle_right'],
        ],
      },
    ],
    message1: 'do %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null,
    nextStatement: null,
    colour: 290,
    tooltip: 'Repeat blocks while a sensor is reading TRUE',
  },
  {
    type: 'while_not_sensor',
    message0: 'while NOT %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SENSOR',
        options: [
          ['line on left', 'line_left'],
          ['line on right', 'line_right'],
          ['obstacle on left', 'obstacle_left'],
          ['obstacle on right', 'obstacle_right'],
        ],
      },
    ],
    message1: 'do %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null,
    nextStatement: null,
    colour: 290,
    tooltip: 'Repeat blocks until a sensor reads TRUE (e.g. follow a line)',
  },
];

export const toolboxXml = `
<xml id="scribbler-toolbox">
  <category name="Motion" colour="220">
    <block type="drive_distance"></block>
    <block type="rotate_degrees"></block>
    <block type="stop"></block>
  </category>
  <category name="Sound &amp; Time" colour="60">
    <block type="beep"></block>
    <block type="wait"></block>
  </category>
  <category name="Loops" colour="290">
    <block type="repeat"></block>
    <block type="while_sensor"></block>
    <block type="while_not_sensor"></block>
  </category>
  <category name="Sensors" colour="210">
    <block type="if_sensor"></block>
  </category>
</xml>
`.trim();
