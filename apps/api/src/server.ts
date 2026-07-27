import { initSentry } from "./core/sentry";
import { createApp } from "./app";

initSentry();

const port = Number(process.env.PORT ?? 4000);

const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on port ${port}`);
});
