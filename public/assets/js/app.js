import { createApp } from './ui.js';

function main() {
  const app = createApp({ document, navigator, url: URL, Blob });
  app.bind();
}

main();
