module.exports = {
  apps: [{
    name: 'hlynk-server',
    script: 'index.js',
    cwd: './',
    interpreter: 'node',
    wait_ready: true,
    listen_timeout: 10000,
    env: {
      NODE_ENV: 'production'
    }
  }]
}