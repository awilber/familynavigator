#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Import the port manager
const PortManager = require('../utils/port-manager');

async function launchApp() {
  console.log('🚀 Starting Family Navigator with smart port management...\n');

  const portManager = new PortManager({
    projectName: 'familynavigator',
    increment: 10,
    verbose: true
  });

  try {
    // Define preferred ports
    const portMap = {
      client: 3001,
      server: 6000
    };

    // Find available ports, killing existing processes if needed
    console.log('🔍 Checking for available ports...');
    const allocatedPorts = await portManager.allocatePorts(portMap, __dirname);

    // Update Vite config if client port changed
    if (allocatedPorts.client !== portMap.client) {
      console.log(`\n⚙️  Updating client configuration to use port ${allocatedPorts.client}...`);
      
      const viteConfigPath = path.join(__dirname, 'client/vite.config.ts');
      let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
      
      // Update port in Vite config
      viteConfig = viteConfig.replace(/port:\s*\d+/, `port: ${allocatedPorts.client}`);
      
      // Update proxy target if server port changed
      if (allocatedPorts.server !== portMap.server) {
        viteConfig = viteConfig.replace(
          /target:\s*['"]http:\/\/localhost:\d+['"]/,
          `target: 'http://localhost:${allocatedPorts.server}'`
        );
      }
      
      fs.writeFileSync(viteConfigPath, viteConfig);
    }

    // Update server config if port changed
    if (allocatedPorts.server !== portMap.server) {
      console.log(`\n⚙️  Updating server configuration to use port ${allocatedPorts.server}...`);
      
      const serverIndexPath = path.join(__dirname, 'server/src/index.ts');
      let serverIndex = fs.readFileSync(serverIndexPath, 'utf8');
      
      // Update port in server index
      serverIndex = serverIndex.replace(
        /const PORT = process\.env\.PORT \|\| \d+/,
        `const PORT = process.env.PORT || ${allocatedPorts.server}`
      );
      
      fs.writeFileSync(serverIndexPath, serverIndex);
    }

    // Create or update .env file in server directory
    const serverEnvPath = path.join(__dirname, 'server/.env');
    const envContent = `DATABASE_URL=postgresql://familynav:familynav123@localhost:5432/familynavigator
PORT=${allocatedPorts.server}
`;
    fs.writeFileSync(serverEnvPath, envContent);

    console.log('\n✅ Port allocation complete:');
    console.log(`   Client: http://localhost:${allocatedPorts.client}`);
    console.log(`   Server: http://localhost:${allocatedPorts.server}`);
    console.log('\n📦 Starting application...\n');

    // Launch the app with npm run dev
    const npm = spawn('npm', ['run', 'dev'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });

    npm.on('error', (err) => {
      console.error('❌ Failed to start:', err);
      process.exit(1);
    });

    npm.on('close', (code) => {
      if (code !== 0) {
        console.error(`\n❌ Application exited with code ${code}`);
      }
      process.exit(code);
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      console.log('\n\n👋 Shutting down gracefully...');
      npm.kill('SIGTERM');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the launcher
launchApp();