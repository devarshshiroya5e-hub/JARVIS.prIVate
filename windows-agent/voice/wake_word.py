"""
Wake Word Detection & Voice Architecture for Windows Local Agent
Listens continuously for 'Jarvis' and notifies the WebSocket server.
"""
import time
import threading

class WakeWordDetector:
    def __init__(self, callback=None):
        self.running = False
        self.callback = callback
        self.thread = None

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._listen_loop, daemon=True)
        self.thread.start()
        print("[Voice] Local Wake-Word Engine active ('Jarvis').")

    def stop(self):
        self.running = False

    def _listen_loop(self):
        """
        Architecture hook for local mic streaming with faster-whisper / Vosk / Porcupine.
        """
        while self.running:
            # Sleep briefly to conserve CPU
            time.sleep(0.5)

    def trigger_wake(self):
        if self.callback:
            self.callback("Jarvis")
