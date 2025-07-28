// faceBridge.js
let ports = [];
let iframePort = null;

onconnect = function (e) {
  const port = e.ports[0];
  ports.push(port);

  port.onmessage = (event) => {
    const { type, data } = event.data;

    if (type === "registerIframe") {
      iframePort = port;
    } else if (type === "frame" && iframePort) {
      iframePort.postMessage({ type: "frame", ...data });
    } else if (type === "result") {
      ports.forEach((p) => {
        if (p !== iframePort) {
          p.postMessage({ type: "result", data });
        }
      });
    }
  };
};
