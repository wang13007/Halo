const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const cliArgs =
  process.argv[1] && /\.(?:c|m)?js$/i.test(process.argv[1])
    ? process.argv.slice(2)
    : process.argv.slice(1);
const [tool, ...args] = cliArgs;

const toolCommands = {
  concurrently: ['node', ['node_modules\\concurrently\\dist\\bin\\concurrently.js']],
  tsx: ['node', ['node_modules\\tsx\\dist\\cli.mjs']],
  vite: ['node', ['node_modules\\vite\\bin\\vite.js']],
  tsc: ['node', ['node_modules\\typescript\\bin\\tsc']],
};

if (!tool || !toolCommands[tool]) {
  if (tool === 'clean') {
    fs.rmSync(path.join(projectRoot, 'dist'), { recursive: true, force: true });
    process.exit(0);
  }

  console.error(`Unsupported tool "${tool}".`);
  process.exit(1);
}

const [command, baseArgs] = toolCommands[tool];

const spawnOptions = {
  stdio: 'inherit',
  env: process.env,
};

const isWindowsUncPath =
  process.platform === 'win32' && projectRoot.startsWith('\\\\');

const child = isWindowsUncPath
  ? spawn(
      process.env.ComSpec || 'cmd.exe',
      [
        '/d',
        '/s',
        '/c',
        `pushd ${projectRoot} && ${command} ${[...baseArgs, ...args].join(' ')}`,
      ],
      {
        ...spawnOptions,
        cwd: process.env.SystemRoot || 'C:\\',
      },
    )
  : spawn(command, [...baseArgs, ...args], {
      ...spawnOptions,
      cwd: projectRoot,
    });

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
