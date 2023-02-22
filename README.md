# pcm-player
PCM Player with TypeScript support


```ts
import { PCMPlayer } from "https://deno.land/x/pcm_player";

const player = new PCMPlayer({
  encoding: Int16Array,
  channels: 1,
  sampleRate: 8000,
  flushingTime: 2000,
});

const wss = new WebSocketStream("wss://...");

for await (const chunk of (await wss.connection).readable) {
  player.feed(new Uint8Array(chunk));
}
```
