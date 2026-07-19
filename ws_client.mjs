import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:3000/live");

ws.on("open", () => {
  console.log("Connected to local server");
  setTimeout(() => {
    ws.send(JSON.stringify({ type: "text", text: "Respond with a 20 word long sentence about dogs." }));
    console.log("Sent chat message");
  }, 1000);
});

ws.on("message", (data, isBinary) => {
  if (isBinary) {
    console.log("Received audio chunk:", data.length, "bytes");
  } else {
    try {
      const msg = JSON.parse(data.toString());
      console.log("Received JSON message:", JSON.stringify(msg));
      if (msg.type === "transcription") console.log("Transcription:", msg.text);
    } catch (e) {
      console.log("Received text message:", data.toString());
    }
  }
});

ws.on("error", console.error);

setTimeout(() => {
  ws.close();
  process.exit(0);
}, 15000);
