import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'https://localhost:5005'; // adjust to your server port

class SocketTester {
    private socket: Socket;

    constructor() {
        this.socket = io(SERVER_URL, {
            reconnection: true,
            timeout: 10000,
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
}

// Run tests
async function runTests() {
    console.log('Starting socket tests...');
    
    // Create multiple clients to test concurrent connections
    const clients: SocketTester[] = [];
    
    try {
        // Test 1: Connect multiple clients
        for (let i = 0; i < 3; i++) {
            clients.push(new SocketTester());
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between connections
        }

        // Test 2: Get total sockets after 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        clients[0].getTotalSockets();

        // Test 3: Test logout for one client
        await new Promise(resolve => setTimeout(resolve, 1000));
        clients[1].logout();

        // Test 4: Disconnect one client directly
        await new Promise(resolve => setTimeout(resolve, 1000));
        clients[2].disconnect();

        // Keep the process running to see the results
        await new Promise(resolve => setTimeout(resolve, 5000));
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        // Cleanup: Disconnect remaining clients
        clients.forEach(client => client.disconnect());
    }
}

// Run the tests
runTests().catch(console.error);