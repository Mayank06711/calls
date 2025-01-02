import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'https://localhost:5005'; // adjust to your server port

class SocketTester {
    private socket: Socket;

    constructor() {
        this.socket = io(SERVER_URL, {
            reconnection: true,
            timeout: 10000,
            // Add these options to handle self-signed certificates
            rejectUnauthorized: false,
            secure: true
        });

        // Basic event listeners
        this.socket.on('connect', () => {
            console.log('Connected to server!', this.socket.id);
        });

        this.socket.on('connection_error', (error) => {
            console.error('Connection error:', error);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected:', reason);
        });

        this.socket.on('forced_disconnect', (message) => {
            console.log('Forced disconnect:', message);
        });
    }

    // Test methods
    async getTotalSockets(): Promise<void> {
        this.socket.emit('total:sockets', (response: { total: number }) => {
            console.log('Total active sockets:', response.total);
        });
    }

    disconnect(): void {
        this.socket.disconnect();
    }

    logout(): void {
        this.socket.emit('logout');
    }
    public waitForConnect(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.socket.once('connect', () => resolve());
        });
    }
}

// Run tests
async function runTests() {
    console.log('Starting socket tests...');
    
    const NUM_CLIENTS = 100;  // Increased to 100 clients
    const clients: SocketTester[] = [];
    
    try {
        // Test 1: Connect multiple clients in parallel
        const connectionPromises = Array(NUM_CLIENTS).fill(null).map(() => {
            const client = new SocketTester();
            clients.push(client);
            return client.waitForConnect();  // Use the new method
        });

        // Wait for all connections to complete
        await Promise.all(connectionPromises);
        console.log(`All ${NUM_CLIENTS} clients connected!`);

        // Test 2: Get total sockets
        clients[0].getTotalSockets();

        // Keep the process running briefly to see the results
        await new Promise(resolve => setTimeout(resolve, 1000));
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        // Cleanup: Disconnect all clients
        clients.forEach(client => client.disconnect());
    }
}

// Run the tests
runTests().catch(console.error);