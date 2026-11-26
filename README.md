# Tiny Stack VM

A small stack-based virtual machine in one TypeScript file (`main.ts`, about
5.5 KB, Node 22, standard library only, no dependencies). It reads compiled
programs as bytes and runs them: a 256-word data stack, a 64-deep call stack,
256 words of memory, and up to 64 KB of output. Everything is exact 32-bit
arithmetic — multiplication uses `Math.imul`, division and remainder truncate
toward zero, unsigned operations go through `>>> 0`, shifts are masked to 5
bits — so the same program always gives the same result.

## What it does

The VM executes a bytecode of stack operations: push (8-bit and 32-bit),
drop, duplicate, swap, over, rotate, arithmetic (`+ - * / %`, signed and
unsigned), logic (`& | ^ ~`, shifts, comparisons), jumps (unconditional and
conditional, relative), calls and returns, memory load/store, and I/O
(print a number, print a byte, read a byte, exit with a code). Bad programs
are stopped cleanly instead of crashing: there are ten trap codes with their
own exit codes — stack underflow (2), stack overflow (3), division by zero
(4), bad opcode (5), bad memory address (6), call-stack overflow (7),
return with an empty call stack (8), program counter out of range (9), step
limit of 1,000,000 (10), and output limit (11).

## How to run it

Node 22 or later (type stripping is on by default in recent Node 22
releases; on an older one, run with `--experimental-strip-types`).

The VM takes an input folder of test cases. Each case is a folder holding
`program.bin` (the bytecode) and `input.bin` (the bytes the program reads).
It writes `stdout.bin` and `exit.txt` for each case into the output folder:

```sh
mkdir -p input/hello
printf '\x01\x48\x51\x01\x69\x51\x01\x00\x53' > input/hello/program.bin
: > input/hello/input.bin
node main.ts --input input --output out
cat out/hello/stdout.bin   # Hi
cat out/hello/exit.txt     # 0
```

That seven-byte program pushes `H`, prints it, pushes `i`, prints it, then
exits with code 0. The opcodes are documented in the comments at the top of
`run()` in `main.ts`: `0x01` push 8-bit, `0x51` print one byte, `0x53` exit
with the top of the stack as the code.

## What it achieved

Entered in the make.fun tiny-stack-vm-01 bounty (40 test programs, 1,000
points each: 800 for exact output, 200 for the exact exit code). Practice
score: **1,000,000 — 40 out of 40 perfect**, beating the house baseline
(plain-vm 1.0.0, 670,000) by 330,000. Final result due 16 December 2026.

## License

MIT. See `LICENSE`.
