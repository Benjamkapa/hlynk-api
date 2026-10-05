module.exports = {
  apps: [{
    name: 'hlynk-server',
    script: 'index.js',
    cwd: './',
    interpreter: 'node',
    wait_ready: true,
    listen_timeout: 10000,

    // ── Logging ──────────────────────────────────────────────────
    out_file: '/var/log/hlynk/hlynk-out.log',    // stdout only
    error_file: '/var/log/hlynk/hlynk-err.log',  // stderr only
    merge_logs: true,                             // don't split logs by restart
    log_date_format: 'DD/MM/YYYY, HH:mm:ss',     // matches your existing log format

    env: {
      NODE_ENV: 'production'
    }
  }]
}