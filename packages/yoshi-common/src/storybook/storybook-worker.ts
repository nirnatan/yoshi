import storybook from './storybook-process';

(async () => {
  process.stdin.resume();

  const storybookProcess = storybook.create({ port: 9009 });
  process.send && process.send({ type: 'compiling' });
  storybookProcess.on('compiling', () => {
    process.send && process.send({ type: 'compiling' });
  });
  storybookProcess.on('finished-log', ({ stats, port }) => {
    process.send &&
      process.send({
        type: 'finished-log',
        port,
        stats: stats.toJson({}, true),
      });
  });
  storybookProcess.on('listening', (port: number) => {
    process.send && process.send({ type: 'listening', port });
  });
  try {
    await storybookProcess.start();
  } catch (e) {
    process.send && process.send({ type: 'error', error: e.message });
  }
})();
