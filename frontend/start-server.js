import { execSync } from 'child_process';
import { spawn } from 'child_process';
import os from 'os';

function getCurrentIP() {
  try {
    // Get network interfaces
    const interfaces = os.networkInterfaces();
    
    // Find the first non-internal IPv4 address (usually your WiFi/Ethernet IP)
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Skip internal (loopback) and non-IPv4 addresses
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    
    // Fallback to localhost if no external IP found
    return 'localhost';
  } catch (error) {
    console.error('Error getting IP address:', error);
    return 'localhost';
  }
}

function startServer() {
  const currentIP = getCurrentIP();
  console.log(`🌐 Starting server on IP: ${currentIP}`);
  console.log(`📱 Access from other devices: http://${currentIP}:3000`);
  console.log(`💻 Local access: http://localhost:3000`);
  console.log('');
  
  // Start Next.js dev server with 0.0.0.0 to bind to all interfaces
  // but we'll detect and display the correct IPs
  const nextProcess = spawn('npx', ['next', 'dev', '-H', '0.0.0.0'], {
    stdio: 'pipe',
    shell: true
  });
  
  // Custom output handling to show correct URLs
  nextProcess.stdout.on('data', (data) => {
    const output = data.toString();
    
    // Replace Next.js default output with our custom URLs
    if (output.includes('Local:') && output.includes('Network:')) {
      console.log('  ▲ Next.js 14.2.5');
      console.log(`  - Local:        http://localhost:3000`);
      console.log(`  - Network:      http://${currentIP}:3000`);
      console.log('  - Environments: .env.local');
    } else if (!output.includes('- Local:') && !output.includes('- Network:')) {
      // Pass through other output
      process.stdout.write(output);
    }
  });
  
  nextProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    nextProcess.kill('SIGINT');
    process.exit(0);
  });
  
  nextProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
  });
  
  nextProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

startServer();