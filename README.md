# Kenya Farm IoT

IoT project for smart farming and agricultural monitoring in Kenya.

## Project Structure

```
kenya-farm-iot/
├── src/              # Main application code
│   ├── sensors/      # Sensor integrations (soil, humidity, temperature)
│   ├── api/          # API and data endpoints
│   └── utils/        # Shared utilities
├── config/           # Configuration files
├── scripts/          # Deployment and utility scripts
├── tests/            # Test suite
└── docs/             # Documentation
```

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Getting Started

Run the main application:
```bash
python -m src.main
```

## License

MIT
