import { io, Socket } from "socket.io-client";

const socket: Socket = io("http://localhost:3000"); // create single socket.io instance

const resetHandlers = new Set<() => void>(); // Named listener registry (prevents duplicates)

export function useSocket(): Socket {
  // gives components access to the same socket
  return socket;
}

export function subscribeToResetApproved(handler: () => void): () => void {
  if (!resetHandlers.has(handler)) {
    resetHandlers.add(handler);
    socket.on("reset-approved", handler); // add handler if not present, add listen for reset
  }

  return () => {
    resetHandlers.delete(handler);
    socket.off("reset-approved", handler); // remove handler when calling cleanup
  };
}
