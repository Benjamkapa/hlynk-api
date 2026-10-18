module.exports = {
  apps: [{
    name: 'hlynk-server',
    script: 'index.js',
    cwd: __dirname,
    interpreter: 'node',
    wait_ready: true,
    listen_timeout: 30000,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 50,
    restart_delay: 2000,
    exp_backoff_restart_delay: 200,

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