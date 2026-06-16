import { io } from "socket.io-client";

// In development, the vite server proxies to the express server.
// If using the same host, "/" works.
export const socket = io("/", {
    autoConnect: true,
});
