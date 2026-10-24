import { app } from './app.mjs';

const port = Number(process.env.PORT) || 8787;

const server = app.listen(port, () => {
  console.log(`Model Atlas API listening on http://localhost:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
