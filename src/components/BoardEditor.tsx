import { useRef, useState, type ReactElement, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { BoardElement, BoardState } from '../sim/boards/schema';

const CANVAS_PX = 400;

type Tool = 'select' | 'obstacle' | 'line' | 'light' | 'bonus';

const isMovableKind = (
  el: BoardElement,
): el is Extract<BoardElement, { kind: 'obstacle' | 'light' | 'start' | 'goal' | 'bonus' }> =>
  el.kind !== 'line';

interface Props {
  board: BoardState;
  onSave: (board: BoardState) => void;
  onCancel: () => void;
}

export function BoardEditor({ board: initialBoard, onSave, onCancel }: Props): ReactElement {
  const { t } = useTranslation();
  const [board, setBoard] = useState<BoardState>(initialBoard);
  const [tool, setTool] = useState<Tool>('select');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const scaleX = CANVAS_PX / board.width;
  const scaleY = CANVAS_PX / board.height;

  const updateElement = (idx: number, patch: Partial<BoardElement>): void => {
    const elements = board.elements.slice();
    elements[idx] = { ...elements[idx], ...patch } as BoardElement;
    setBoard({ ...board, elements });
  };

  const deleteSelected = (): void => {
    if (selectedIdx === null) return;
    const elements = board.elements.filter((_, i) => i !== selectedIdx);
    setBoard({ ...board, elements });
    setSelectedIdx(null);
  };

  const handleCanvasClick = (e: MouseEvent<HTMLDivElement>): void => {
    if (tool === 'select') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * board.width;
    const y = ((e.clientY - rect.top) / rect.height) * board.height;
    let newEl: BoardElement;
    switch (tool) {
      case 'obstacle':
        newEl = { kind: 'obstacle', x: x - 0.04, y: y - 0.04, w: 0.08, h: 0.08 };
        break;
      case 'line':
        newEl = { kind: 'line', x1: x - 0.1, y1: y, x2: x + 0.1, y2: y, thickness: 0.02 };
        break;
      case 'light':
        newEl = { kind: 'light', x, y, intensity: 100 };
        break;
      case 'bonus':
        newEl = { kind: 'bonus', x, y, toleranceCm: 8 };
        break;
      default:
        return;
    }
    const elements = [...board.elements, newEl];
    setBoard({ ...board, elements });
    setSelectedIdx(elements.length - 1);
    setTool('select');
  };

  const handleElementClick = (idx: number, e: MouseEvent): void => {
    e.stopPropagation();
    setSelectedIdx(idx);
  };

  const selected = selectedIdx !== null ? board.elements[selectedIdx] : null;

  const palette: { tool: Tool; label: string }[] = [
    { tool: 'obstacle', label: t('board_editor.obstacle') },
    { tool: 'line', label: t('board_editor.line') },
    { tool: 'light', label: t('board_editor.light') },
    { tool: 'bonus', label: t('board_editor.bonus') },
  ];

  return (
    <div style={{ padding: '0.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>{t('board_editor.heading')}</h3>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#666' }}>
        {t('board_editor.tip')}
      </p>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '0.5rem' }}>
        {t('board_editor.name_label')}
        <input
          type="text"
          value={board.name}
          onChange={(e) => setBoard({ ...board, name: e.target.value })}
          style={{ padding: '0.3rem', flex: 1 }}
        />
      </label>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            <strong style={{ fontSize: '0.85rem' }}>{t('board_editor.palette_heading')}:</strong>
            {palette.map((p) => (
              <button
                key={p.tool}
                type="button"
                onClick={() => setTool(p.tool)}
                style={{
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  borderRadius: 4,
                  border: '1px solid #555',
                  background: tool === p.tool ? '#2c5cff' : '#fff',
                  color: tool === p.tool ? '#fff' : '#000',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              width: CANVAS_PX,
              height: CANVAS_PX,
              position: 'relative',
              border: '2px solid #333',
              background: '#f4f1e8',
              cursor: tool === 'select' ? 'default' : 'crosshair',
            }}
          >
            {board.elements.map((el, idx) => {
              const isSelected = idx === selectedIdx;
              const ringStyle = isSelected ? { outline: '2px solid #2c5cff' } : {};
              if (el.kind === 'obstacle') {
                return (
                  <div
                    key={idx}
                    onClick={(e) => handleElementClick(idx, e)}
                    style={{
                      position: 'absolute',
                      left: el.x * scaleX,
                      top: el.y * scaleY,
                      width: el.w * scaleX,
                      height: el.h * scaleY,
                      background: '#7a4a2b',
                      cursor: 'pointer',
                      ...ringStyle,
                    }}
                  />
                );
              }
              if (el.kind === 'light') {
                return (
                  <div
                    key={idx}
                    onClick={(e) => handleElementClick(idx, e)}
                    style={{
                      position: 'absolute',
                      left: el.x * scaleX - 8,
                      top: el.y * scaleY - 8,
                      width: 16,
                      height: 16,
                      background: '#f1c40f',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      ...ringStyle,
                    }}
                  />
                );
              }
              if (el.kind === 'start' || el.kind === 'goal' || el.kind === 'bonus') {
                const labelEmoji = el.kind === 'start' ? '🚩' : el.kind === 'goal' ? '🏁' : '⭐';
                return (
                  <div
                    key={idx}
                    onClick={(e) => handleElementClick(idx, e)}
                    style={{
                      position: 'absolute',
                      left: el.x * scaleX - 14,
                      top: el.y * scaleY - 14,
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                      cursor: 'pointer',
                      ...ringStyle,
                    }}
                  >
                    {labelEmoji}
                  </div>
                );
              }
              if (el.kind === 'line') {
                const x1 = el.x1 * scaleX;
                const y1 = el.y1 * scaleY;
                const x2 = el.x2 * scaleX;
                const y2 = el.y2 * scaleY;
                const length = Math.hypot(x2 - x1, y2 - y1);
                const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
                return (
                  <div
                    key={idx}
                    onClick={(e) => handleElementClick(idx, e)}
                    style={{
                      position: 'absolute',
                      left: x1,
                      top: y1 - (el.thickness * scaleY) / 2,
                      width: length,
                      height: Math.max(2, el.thickness * scaleY),
                      background: '#222',
                      transform: `rotate(${angle}deg)`,
                      transformOrigin: '0 50%',
                      cursor: 'pointer',
                      ...ringStyle,
                    }}
                  />
                );
              }
              return null;
            })}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>
            {t('board_editor.selected_heading')}
          </h4>
          {selected && selectedIdx !== null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selected.kind === 'obstacle' && (
                <>
                  <NumberField
                    label={t('board_editor.x')}
                    value={selected.x}
                    onChange={(v) => updateElement(selectedIdx, { x: v })}
                  />
                  <NumberField
                    label={t('board_editor.y')}
                    value={selected.y}
                    onChange={(v) => updateElement(selectedIdx, { y: v })}
                  />
                  <NumberField
                    label={t('board_editor.width')}
                    value={selected.w}
                    onChange={(v) => updateElement(selectedIdx, { w: v })}
                  />
                  <NumberField
                    label={t('board_editor.height')}
                    value={selected.h}
                    onChange={(v) => updateElement(selectedIdx, { h: v })}
                  />
                </>
              )}
              {selected.kind === 'line' && (
                <>
                  <NumberField
                    label={t('board_editor.x1')}
                    value={selected.x1}
                    onChange={(v) => updateElement(selectedIdx, { x1: v })}
                  />
                  <NumberField
                    label={t('board_editor.y1')}
                    value={selected.y1}
                    onChange={(v) => updateElement(selectedIdx, { y1: v })}
                  />
                  <NumberField
                    label={t('board_editor.x2')}
                    value={selected.x2}
                    onChange={(v) => updateElement(selectedIdx, { x2: v })}
                  />
                  <NumberField
                    label={t('board_editor.y2')}
                    value={selected.y2}
                    onChange={(v) => updateElement(selectedIdx, { y2: v })}
                  />
                  <NumberField
                    label={t('board_editor.thickness')}
                    value={selected.thickness}
                    onChange={(v) => updateElement(selectedIdx, { thickness: v })}
                  />
                </>
              )}
              {selected.kind === 'light' && (
                <>
                  <NumberField
                    label={t('board_editor.x')}
                    value={selected.x}
                    onChange={(v) => updateElement(selectedIdx, { x: v })}
                  />
                  <NumberField
                    label={t('board_editor.y')}
                    value={selected.y}
                    onChange={(v) => updateElement(selectedIdx, { y: v })}
                  />
                  <NumberField
                    label={t('board_editor.intensity')}
                    value={selected.intensity}
                    onChange={(v) => updateElement(selectedIdx, { intensity: v })}
                  />
                </>
              )}
              {(selected.kind === 'start' || selected.kind === 'goal') &&
                isMovableKind(selected) && (
                  <>
                    <NumberField
                      label={t('board_editor.x')}
                      value={selected.x}
                      onChange={(v) => updateElement(selectedIdx, { x: v })}
                    />
                    <NumberField
                      label={t('board_editor.y')}
                      value={selected.y}
                      onChange={(v) => updateElement(selectedIdx, { y: v })}
                    />
                  </>
                )}
              {selected.kind === 'bonus' && (
                <>
                  <NumberField
                    label={t('board_editor.x')}
                    value={selected.x}
                    onChange={(v) => updateElement(selectedIdx, { x: v })}
                  />
                  <NumberField
                    label={t('board_editor.y')}
                    value={selected.y}
                    onChange={(v) => updateElement(selectedIdx, { y: v })}
                  />
                  <NumberField
                    label={t('board_editor.tolerance_cm')}
                    value={selected.toleranceCm}
                    onChange={(v) => updateElement(selectedIdx, { toleranceCm: v })}
                  />
                </>
              )}
              <button
                type="button"
                onClick={deleteSelected}
                style={{
                  marginTop: 4,
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  borderRadius: 4,
                  border: '1px solid #c0392b',
                  background: '#fff',
                  color: '#c0392b',
                }}
              >
                {t('board_editor.delete_element')}
              </button>
            </div>
          ) : (
            <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>—</p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
        <button
          type="button"
          onClick={() => onSave(board)}
          style={{
            padding: '0.4rem 0.9rem',
            cursor: 'pointer',
            borderRadius: 4,
            border: '1px solid #2c5cff',
            background: '#2c5cff',
            color: '#fff',
            fontWeight: 'bold',
          }}
        >
          {t('board_editor.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '0.4rem 0.9rem',
            cursor: 'pointer',
            borderRadius: 4,
            border: '1px solid #555',
            background: '#fff',
          }}
        >
          {t('board_editor.cancel')}
        </button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}): ReactElement {
  return (
    <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '0.85rem' }}>
      <span style={{ minWidth: 80 }}>{label}</span>
      <input
        type="number"
        step={0.01}
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        style={{ padding: '0.2rem', width: '6rem' }}
      />
    </label>
  );
}
