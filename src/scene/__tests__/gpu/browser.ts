/**
 * A headless Chrome (or Edge, or Chromium) driven over the DevTools protocol, with
 * no dependency: node:child_process starts it, the WebSocket client that Node has
 * had built in since version 22 speaks the protocol. The GPU tests run the shaders
 * of the scene on its WebGL 2 implementation.
 *
 * By default the browser is told to use SwiftShader, the software rasteriser that
 * ships with it, so that every machine and the CI runner execute the same GL
 * implementation and the same arithmetic. GPU_TEST_ANGLE selects another ANGLE
 * backend (d3d11, gl, vulkan, metal …) to run the same tests on a real graphics
 * processor.
 *
 * Environment:
 *   CHROME_PATH      the browser executable; otherwise the usual places are searched
 *   GPU_TESTS        "off" skips the GPU tests; "require" (or CI set) makes a missing
 *                    browser or a missing WebGL 2 context a failure instead of a skip
 *   GPU_TEST_ANGLE   ANGLE backend, "swiftshader" by default
 */

import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type GpuTestMode = 'off' | 'optional' | 'require';

export function gpuTestMode(env: NodeJS.ProcessEnv = process.env): GpuTestMode {
  const value = (env.GPU_TESTS ?? '').trim().toLowerCase();
  if (value === 'off' || value === '0' || value === 'false') return 'off';
  if (value === 'require' || value === 'required') return 'require';
  // a CI run must never pass by skipping the only test of the shaders
  if (env.CI && env.CI !== 'false' && env.CI !== '0') return 'require';
  return 'optional';
}

export function angleBackend(env: NodeJS.ProcessEnv = process.env): string {
  return (env.GPU_TEST_ANGLE ?? '').trim().toLowerCase() || 'swiftshader';
}

function onPath(names: readonly string[]): string | null {
  const directories = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  for (const name of names) {
    for (const directory of directories) {
      const candidate = path.join(directory, name);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch {
        // not here
      }
    }
  }
  return null;
}

/** The browser executable, or null with the reason. */
export function findBrowser(env: NodeJS.ProcessEnv = process.env): { path: string | null; reason: string } {
  if (env.CHROME_PATH) {
    return fs.existsSync(env.CHROME_PATH)
      ? { path: env.CHROME_PATH, reason: 'CHROME_PATH' }
      : { path: null, reason: `CHROME_PATH is set to ${env.CHROME_PATH}, which does not exist` };
  }
  const candidates: string[] = [];
  if (process.platform === 'win32') {
    const roots = [env.ProgramFiles ?? 'C:\\Program Files', env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)'];
    for (const root of roots) candidates.push(path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    for (const root of roots) candidates.push(path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  } else {
    const found = onPath(['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']);
    if (found) return { path: found, reason: 'PATH' };
  }
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  return found ? { path: found, reason: 'default location' } : { path: null, reason: 'no Chrome, Edge or Chromium found' };
}

/** Rejects after `ms` with a message that says what was being waited for. */
function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`GPU test harness: timed out after ${ms} ms waiting for ${what}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface Pending {
  resolve: (value: Record<string, unknown>) => void;
  reject: (error: Error) => void;
}

export class Browser {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  /** Console errors and uncaught exceptions of the page, appended to failure messages. */
  readonly pageErrors: string[] = [];

  private constructor(
    private readonly child: ChildProcess,
    private readonly profile: string,
    private readonly socket: WebSocket,
    private readonly exitSafety: () => void
  ) {
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as {
        id?: number;
        error?: { message: string };
        result?: Record<string, unknown>;
        method?: string;
        params?: Record<string, unknown>;
      };
      if (message.id !== undefined) {
        const waiting = this.pending.get(message.id);
        if (!waiting) return;
        this.pending.delete(message.id);
        if (message.error) waiting.reject(new Error(message.error.message));
        else waiting.resolve(message.result ?? {});
      } else if (message.method === 'Runtime.exceptionThrown') {
        const details = message.params?.exceptionDetails as { text?: string; exception?: { description?: string } };
        this.pageErrors.push(details.exception?.description ?? details.text ?? 'exception');
      } else if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') {
        const args = (message.params.args as Array<{ value?: unknown; description?: string }>) ?? [];
        this.pageErrors.push(args.map((arg) => String(arg.value ?? arg.description ?? '')).join(' '));
      }
    });
    socket.addEventListener('close', () => {
      for (const waiting of this.pending.values())
        waiting.reject(new Error('GPU test harness: the browser closed the connection'));
      this.pending.clear();
    });
  }

  /** Starts the browser with a fresh profile and connects to its blank page. */
  static async launch(executable: string, angle: string, timeoutMs = 30_000): Promise<Browser> {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'photon-gpu-'));
    const args = [
      '--headless=new',
      `--user-data-dir=${profile}`,
      // the browser picks a free port and writes it to DevToolsActivePort: parallel runs cannot clash
      '--remote-debugging-port=0',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-sync',
      '--disable-background-networking',
      '--disable-component-update',
      '--mute-audio',
      `--use-angle=${angle}`,
      ...(angle === 'swiftshader' ? ['--enable-unsafe-swiftshader'] : ['--ignore-gpu-blocklist', '--enable-gpu']),
      // the hosted CI runner cannot use the sandbox, and its /dev/shm is small
      ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
      'about:blank',
    ];
    const child = spawn(executable, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
      // its own process group, so that the whole tree can be killed at once (Windows: taskkill /T)
      detached: process.platform !== 'win32',
    });
    let stderr = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString('utf8')).slice(-4000);
    });
    let exited = false;
    child.on('exit', () => {
      exited = true;
    });
    const exitSafety = (): void => killTree(child);
    process.once('exit', exitSafety);

    try {
      const portFile = path.join(profile, 'DevToolsActivePort');
      const deadline = Date.now() + timeoutMs;
      let port = 0;
      while (!port) {
        if (exited) throw new Error(`the browser exited during start-up:\n${stderr}`);
        if (Date.now() > deadline)
          throw new Error(`the browser did not report its DevTools port within ${timeoutMs} ms:\n${stderr}`);
        try {
          port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
        } catch {
          await pause(50);
        }
      }
      const listing = await withTimeout(
        fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json() as Promise<Array<Record<string, string>>>),
        timeoutMs,
        'the list of DevTools targets'
      );
      const page = listing.find((target) => target.type === 'page');
      if (!page) throw new Error('the browser opened no page');
      const socket = new WebSocket(page.webSocketDebuggerUrl);
      await withTimeout(
        new Promise<void>((resolve, reject) => {
          socket.addEventListener('open', () => resolve());
          socket.addEventListener('error', () => reject(new Error('the DevTools connection failed')));
        }),
        timeoutMs,
        'the DevTools connection'
      );
      const browser = new Browser(child, profile, socket, exitSafety);
      await browser.send('Runtime.enable', {}, timeoutMs);
      return browser;
    } catch (error) {
      killTree(child);
      process.removeListener('exit', exitSafety);
      await waitForExit(child, 10_000);
      removeProfile(profile);
      throw error;
    }
  }

  send(method: string, params: Record<string, unknown>, timeoutMs: number): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    const reply = new Promise<Record<string, unknown>>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return withTimeout(reply, timeoutMs, method).finally(() => this.pending.delete(id));
  }

  /** Evaluates an expression in the page, awaits it, and returns its value as JSON. */
  async evaluate<T>(expression: string, timeoutMs: number, what: string): Promise<T> {
    const result = await withTimeout(
      this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, timeoutMs),
      timeoutMs,
      what
    );
    const exception = result.exceptionDetails as { text?: string; exception?: { description?: string } } | undefined;
    if (exception) throw new Error(`${what} failed in the page: ${exception.exception?.description ?? exception.text}`);
    return (result.result as { value: T }).value;
  }

  /** Kills the whole process tree and removes the temporary profile. */
  async close(): Promise<void> {
    try {
      this.socket.close();
    } catch {
      // already closed
    }
    killTree(this.child);
    process.removeListener('exit', this.exitSafety);
    await waitForExit(this.child, 10_000);
    removeProfile(this.profile);
  }
}

function killTree(child: ChildProcess): void {
  if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-child.pid, 'SIGKILL');
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      // gone
    }
  }
}

function waitForExit(child: ChildProcess, ms: number): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return withTimeout(new Promise<void>((resolve) => child.once('exit', () => resolve())), ms, 'the browser to exit').catch(() => {
    // the profile removal below retries; a process that outlives this is reported by its own error
  });
}

function removeProfile(profile: string): void {
  // the browser's helper processes release their files a moment after the main one has gone
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
}
