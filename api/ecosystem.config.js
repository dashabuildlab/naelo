module.exports = {
  apps: [{
    name:        "naelo-api",
    script:      "index.js",
    cwd:         "/root/luma/api",   // шлях на сервері — зміни якщо інший
    instances:   1,
    autorestart: true,
    watch:       false,
    max_restarts: 10,
    restart_delay: 3000,
    env: {
      NODE_ENV: "production",
    },
    error_file: "/root/luma/api/logs/err.log",
    out_file:   "/root/luma/api/logs/out.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss",
  }],
};
