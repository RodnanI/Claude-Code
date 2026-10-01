/* Default key bindings. One action can have several keys. Add an action here and read it from Input; the pause menu
   lists these automatically. Codes are KeyboardEvent.code values. */

export const ACTIONS = [
  { id: 'pitchDown', label: 'Nose down', keys: ['KeyW', 'ArrowUp'] },
  { id: 'pitchUp', label: 'Nose up', keys: ['KeyS', 'ArrowDown'] },
  { id: 'rollLeft', label: 'Roll left', keys: ['KeyA', 'ArrowLeft'] },
  { id: 'rollRight', label: 'Roll right', keys: ['KeyD', 'ArrowRight'] },
  { id: 'yawLeft', label: 'Rudder left', keys: ['KeyQ', 'KeyZ'] },
  { id: 'yawRight', label: 'Rudder right', keys: ['KeyE', 'KeyC'] },
  { id: 'throttleUp', label: 'Throttle up', keys: ['ShiftLeft', 'ShiftRight', 'PageUp'] },
  { id: 'throttleDown', label: 'Throttle down', keys: ['ControlLeft', 'ControlRight', 'PageDown'] },
  { id: 'throttleFull', label: 'Full throttle', keys: ['Digit9'] },
  { id: 'throttleIdle', label: 'Throttle idle', keys: ['Digit1'] },
  { id: 'brake', label: 'Wheel brakes', keys: ['Space'] },
  { id: 'airbrake', label: 'Airbrake', keys: ['KeyB'] },
  { id: 'flapsDown', label: 'Flaps extend', keys: ['KeyF'] },
  { id: 'flapsUp', label: 'Flaps retract', keys: ['KeyV'] },
  { id: 'gear', label: 'Landing gear', keys: ['KeyG'] },
  { id: 'trimUp', label: 'Trim nose up', keys: ['Period'] },
  { id: 'trimDown', label: 'Trim nose down', keys: ['Comma'] },
  { id: 'trimReset', label: 'Center trim', keys: ['Slash'] },
  { id: 'view', label: 'Cycle camera: far, close, cockpit, orbit', keys: ['KeyX'] },
  { id: 'lookBack', label: 'Look back (hold)', keys: ['KeyN'] },
  { id: 'fire', label: 'Fire (or left mouse button)', keys: ['KeyJ'] },
  { id: 'weapon', label: 'Next weapon', keys: ['KeyK'] },
  { id: 'assist', label: 'Takeoff assist mode', keys: ['KeyT'] },
  { id: 'map', label: 'Island map', keys: ['KeyM'] },
  { id: 'hud', label: 'Toggle HUD', keys: ['KeyH'] },
  { id: 'pause', label: 'Pause', keys: ['Escape', 'KeyP'] },
  { id: 'reset', label: 'Restart flight', keys: ['KeyR'] },
  { id: 'debug', label: 'Performance overlay', keys: ['F3'] },
  { id: 'screenshot', label: 'Screenshot', keys: ['F12'] },
];

export function defaultBindings() {
  const map = new Map();
  for (const a of ACTIONS) for (const k of a.keys) { if (!map.has(k)) map.set(k, []); map.get(k).push(a.id); }
  return map;
}
