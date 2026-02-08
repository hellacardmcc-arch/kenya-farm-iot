# Kenya Farm IoT - Setup Script (Windows)
Write-Host "Setting up Kenya Farm IoT project..." -ForegroundColor Green

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

Write-Host "Setup complete! Activate with: .\venv\Scripts\Activate.ps1" -ForegroundColor Green
