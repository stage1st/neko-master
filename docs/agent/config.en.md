# Agent Configuration

[中文](./config.md) | **English**

## Required flags

- `--server-url`: panel server URL (without `/api` suffix is fine)
- `--backend-id`: backend numeric id
- `--backend-token`: backend auth token
- `--gateway-type`: `clash` or `surge`
- `--gateway-url`: gateway API URL

## Optional flags

- `--gateway-token`: gateway auth token (`Authorization` for Clash, `x-key` for Surge)
- `--agent-id`: custom agent ID (default: auto-generated from SHA256 of backend token, stable across restarts)
- `--report-interval`: report loop interval (default `2s`)
- `--heartbeat-interval`: heartbeat interval (default `30s`)
- `--gateway-poll-interval`: gateway pull interval (default `2s`)
- `--request-timeout`: HTTP timeout (default `15s`)
- `--report-batch-size`: max updates per report (default `1000`)
- `--max-pending-updates`: memory queue cap (default `50000`)
- `--stale-flow-timeout`: stale flow eviction timeout (default `5m`)
- `--log`: enable logs, set `--log=false` to quiet mode
- `--version`: print version

## Example: Clash

```bash
./neko-agent \
  --server-url 'http://10.0.0.2:3000' \
  --backend-id 8 \
  --backend-token 'ag_xxx' \
  --gateway-type 'clash' \
  --gateway-url 'http://127.0.0.1:9090' \
  --gateway-token 'clash-secret'
```

## Example: PassWall (Mihomo)

PassWall is not a separate `gateway-type`. When OpenWrt PassWall is running a Mihomo/Clash kernel with `external-controller` enabled, keep using `clash`:

```bash
./neko-agent \
  --server-url 'http://10.0.0.2:3000' \
  --backend-id 10 \
  --backend-token 'ag_xxx' \
  --gateway-type 'clash' \
  --gateway-url 'http://192.168.1.1:9090' \
  --gateway-token 'mihomo-secret'
```

If PassWall is using `sing-box` or `xray-core`, the current version is not compatible.

## Example: Surge

```bash
./neko-agent \
  --server-url 'http://10.0.0.2:3000' \
  --backend-id 9 \
  --backend-token 'ag_xxx' \
  --gateway-type 'surge' \
  --gateway-url 'http://127.0.0.1:9091' \
  --gateway-token 'surge-key'
```

## Best-practice defaults for remote LAN

- `--gateway-poll-interval=2s`
- `--report-interval=2s`
- `--heartbeat-interval=10s` (faster offline detection)
