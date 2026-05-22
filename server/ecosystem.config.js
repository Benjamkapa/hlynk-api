module.exports = {
  apps: [{
    name: 'hlynk-server',
    script: 'index.js',
    cwd: '/var/www/html/hlynk/actions-runner/hlynk/hlynk-api/hlynk-api/server',
    interpreter: 'node',
    env: {
      NODE_ENV: 'production'
    }
  }]
}