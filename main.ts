import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function run(p: Uint8Array, d: Uint8Array): { o: Uint8Array; l: number; c: number } {
  const S = new Int32Array(256);
  const K = new Int32Array(64);
  const M = new Int32Array(256);
  const O = new Uint8Array(65536);
  let sp = 0, cp = 0, pc = 0, st = 0, ol = 0, ip = 0;
  const n = p.length;
  const trap = (c: number) => ({ o: O, l: ol, c });
  for (;;) {
    if (st === 1000000) return trap(10);
    if (pc < 0 || pc >= n) return trap(9);
    const op = p[pc];
    if (!(op <= 0x07 || (op >= 0x10 && op <= 0x22 && op !== 0x1f) || (op >= 0x30 && op <= 0x34) || (op >= 0x40 && op <= 0x41) || (op >= 0x50 && op <= 0x53))) return trap(5);
    const im = op === 0x01 ? 1 : op === 0x02 ? 4 : op >= 0x30 && op <= 0x33 ? 2 : 0;
    if (pc + im >= n) return trap(9);
    st++;
    const nx = pc + 1 + im;
    pc = nx;
    switch (op) {
      case 0x00:
        return { o: O, l: ol, c: 0 };
      case 0x01:
        if (sp > 255) return trap(3);
        S[sp++] = (p[nx - 1] << 24) >> 24;
        break;
      case 0x02:
        if (sp > 255) return trap(3);
        S[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24);
        break;
      case 0x03:
        if (sp < 1) return trap(2);
        sp--;
        break;
      case 0x04:
        if (sp < 1) return trap(2);
        if (sp > 255) return trap(3);
        S[sp] = S[sp - 1];
        sp++;
        break;
      case 0x05: {
        if (sp < 2) return trap(2);
        const t = S[sp - 1];
        S[sp - 1] = S[sp - 2];
        S[sp - 2] = t;
        break;
      }
      case 0x06:
        if (sp < 2) return trap(2);
        if (sp > 255) return trap(3);
        S[sp] = S[sp - 2];
        sp++;
        break;
      case 0x07: {
        if (sp < 3) return trap(2);
        const a = S[sp - 3];
        S[sp - 3] = S[sp - 2];
        S[sp - 2] = S[sp - 1];
        S[sp - 1] = a;
        break;
      }
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e: case 0x20:
      case 0x21: case 0x22: {
        if (sp < 2) return trap(2);
        const b = S[sp - 1];
        const a = S[sp - 2];
        let r = 0;
        switch (op) {
          case 0x10: r = (a + b) | 0; break;
          case 0x11: r = (a - b) | 0; break;
          case 0x12: r = Math.imul(a, b); break;
          case 0x13: if (b === 0) return trap(4); r = (a / b) | 0; break;
          case 0x14: if (b === 0) return trap(4); r = (a % b) | 0; break;
          case 0x15: if (b === 0) return trap(4); r = ((a >>> 0) / (b >>> 0)) | 0; break;
          case 0x16: if (b === 0) return trap(4); r = ((a >>> 0) % (b >>> 0)) | 0; break;
          case 0x18: r = a & b; break;
          case 0x19: r = a | b; break;
          case 0x1a: r = a ^ b; break;
          case 0x1c: r = a << (b & 31); break;
          case 0x1d: r = a >> (b & 31); break;
          case 0x1e: r = (a >>> (b & 31)) | 0; break;
          case 0x20: r = a === b ? 1 : 0; break;
          case 0x21: r = a < b ? 1 : 0; break;
          default: r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        }
        sp -= 2;
        S[sp++] = r;
        break;
      }
      case 0x17:
        if (sp < 1) return trap(2);
        S[sp - 1] = -S[sp - 1] | 0;
        break;
      case 0x1b:
        if (sp < 1) return trap(2);
        S[sp - 1] = ~S[sp - 1];
        break;
      case 0x30: case 0x31: case 0x32: {
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 0x30) {
          if (sp < 1) return trap(2);
          const v = S[--sp];
          take = op === 0x31 ? v === 0 : v !== 0;
        }
        if (take) pc = nx + rel;
        break;
      }
      case 0x33:
        if (cp === 64) return trap(7);
        K[cp++] = nx;
        pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 0x34:
        if (cp === 0) return trap(8);
        pc = K[--cp];
        break;
      case 0x40: {
        if (sp < 1) return trap(2);
        const addr = S[sp - 1];
        if (addr < 0 || addr >= 256) return trap(6);
        S[sp - 1] = M[addr];
        break;
      }
      case 0x41: {
        if (sp < 2) return trap(2);
        const addr = S[sp - 1];
        if (addr < 0 || addr >= 256) return trap(6);
        M[addr] = S[sp - 2];
        sp -= 2;
        break;
      }
      case 0x50: {
        if (sp < 1) return trap(2);
        const s = String(S[sp - 1]);
        if (ol + s.length > 65536) return trap(11);
        sp--;
        for (let i = 0; i < s.length; i++) O[ol++] = s.charCodeAt(i);
        break;
      }
      case 0x51:
        if (sp < 1) return trap(2);
        if (ol + 1 > 65536) return trap(11);
        O[ol++] = S[--sp] & 255;
        break;
      case 0x52:
        if (sp > 255) return trap(3);
        S[sp++] = ip < d.length ? d[ip++] : -1;
        break;
      case 0x53:
        if (sp < 1) return trap(2);
        return { o: O, l: ol, c: S[--sp] & 255 };
      default:
        return trap(5);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))), new Uint8Array(readFileSync(join(I, id, 'input.bin'))));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.o.subarray(0, r.l));
  writeFileSync(join(O, id, 'exit.txt'), `${r.c}\n`);
}
