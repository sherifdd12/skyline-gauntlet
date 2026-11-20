const DEADZONE = 0.15;
const SPEED = 900;

export interface GamepadFrame {
  connected: boolean;
  active: boolean;
  dx: number;
  dy: number;
  pressed: Set<number>;
}

export class GamepadInput {
  private previous = new Map<number, boolean[]>();

  sample(gamepads: readonly (Gamepad | null)[], dt: number): GamepadFrame {
    const frame: GamepadFrame = { connected: false, active: false, dx: 0, dy: 0, pressed: new Set() };
    const connected = new Set<number>();
    for (const pad of gamepads) {
      if (!pad || !pad.connected) continue;
      frame.connected = true;
      connected.add(pad.index);
      const previous = this.previous.get(pad.index) ?? [];
      const buttons = pad.buttons.map((button, i) => {
        const down = button.pressed || button.value > 0.5;
        if (down && !previous[i]) frame.pressed.add(i);
        if (button.pressed || button.value > DEADZONE) frame.active = true;
        return down;
      });
      this.previous.set(pad.index, buttons);

      if (pad.axes.some((axis) => Math.abs(axis) > DEADZONE)) frame.active = true;
      const x = pad.axes[0] ?? 0, y = pad.axes[1] ?? 0;
      const magnitude = Math.hypot(x, y);
      if (magnitude > DEADZONE) {
        frame.active = true;
        const strength = (Math.min(magnitude, 1) - DEADZONE) / (1 - DEADZONE);
        frame.dx += x / magnitude * strength * SPEED * dt;
        frame.dy += y / magnitude * strength * SPEED * dt;
      }
    }
    for (const index of this.previous.keys()) {
      if (!connected.has(index)) this.previous.delete(index);
    }
    return frame;
  }
}

export function moveCrosshair(position: { x: number; y: number }, frame: GamepadFrame, width: number, height: number) {
  if (frame.dx || frame.dy) {
    position.x = Math.max(0, Math.min(width, position.x + frame.dx));
    position.y = Math.max(0, Math.min(height, position.y + frame.dy));
  }
}