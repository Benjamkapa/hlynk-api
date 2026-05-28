module.exports = {
  apps: [{
    name: 'hlynk-server',
    script: 'index.js',
    cwd: './',
    interpreter: 'node',
    env: {
      NODE_ENV: 'production'
    }
  }]
}