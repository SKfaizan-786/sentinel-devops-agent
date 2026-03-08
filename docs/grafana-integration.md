# Grafana Integration Guide

Sentinel now includes a complete Prometheus + Grafana monitoring stack for enterprise-grade observability.

## 🚀 Quick Start

To spin up the monitoring stack:

```bash
cd grafana
docker-compose -f docker-compose.monitoring.yaml up -d
```

Access the **Grafana Dashboard** at: **[http://localhost:3030](http://localhost:3030)**
- **Username:** `admin`
- **Password:** `sentinel`

## 📊 Available Dashboards

1. **Sentinel Overview** (`sentinel-overview`)
   - High-level service health
   - Active incidents by severity
   - Healing success rates
   - Key performance indicators

2. **Incidents** (`incidents`)
   - Detailed incident timeline
   - Incident rates per service
   - Severity breakdown

3. **Services** (`services`)
   - API request rates
   - Latency heatmaps (response time distribution)
   - Service-specific health status

## 🔧 Architecture

The monitoring stack consists of:

- **Prometheus**: Scrapes metrics from Sentinel Backend (`/metrics` endpoint).
- **Grafana**: Visualizes metrics with pre-configured dashboards.
- **Sentinel Exporter**: Custom Node.js exporter using `prom-client`.

### Data Flow

```mermaid
graph LR
    Backend[Sentinel Backend] -- /metrics --> Prometheus
    Prometheus -- Query --> Grafana
    Grafana -- Visuals --> User
```

## 🛠️ Configuration

### Prometheus
Configuration is located in `grafana/prometheus.yml`. By default, it scrapes:
- `host.docker.internal:4000` (Sentinel Backend running on host)

### Grafana Provisioning
Dashboards and Datasources are automatically provisioned from:
- `grafana/provisioning/datasources/`
- `grafana/provisioning/dashboards/`
- `grafana/dashboards/` (JSON definitions)

## 📈 Custom Metrics

Sentinel exports the following custom metrics:

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `sentinel_service_health` | Gauge | Service health status (1=Up, 0=Down) | `service` |
| `sentinel_active_incidents` | Gauge | Number of active incidents | `severity`, `service` |
| `sentinel_incidents_total` | Counter | Total incidents detected | `severity`, `service`, `type` |
| `sentinel_healing_actions_total` | Counter | Total healing actions performed | `action`, `outcome` |
| `sentinel_service_response_seconds` | Histogram | Service response time latency | `service`, `endpoint` |
| `sentinel_http_requests_total` | Counter | API request count | `method`, `path`, `status` |
