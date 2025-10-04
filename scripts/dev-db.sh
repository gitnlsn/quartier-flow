#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Received interrupt signal. Cleaning up...${NC}"
    echo -e "${YELLOW}Stopping and removing containers...${NC}"
    sudo docker compose down -v
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Cleanup completed successfully${NC}"
    else
        echo -e "${RED}Error during cleanup${NC}"
    fi
    exit 0
}

# Set up trap for SIGINT (Ctrl+C) and other exit signals
trap cleanup SIGINT SIGTERM EXIT

# Start Docker Compose
echo -e "${GREEN}Starting Docker Compose...${NC}"
sudo docker compose up -d

# Check if Docker Compose started successfully
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to start Docker Compose${NC}"
    exit 1
fi

# Wait for database to be ready
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
sleep 10

# Run database push
echo -e "${GREEN}Running database push...${NC}"
npm run db:setup:local

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: Database seed failed or seed command not found${NC}"
    echo -e "${YELLOW}Continuing anyway...${NC}"
fi

# Keep the script running and show logs
echo -e "${GREEN}Database setup complete!${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop and clean up${NC}"
echo -e "${YELLOW}Following container logs...${NC}\n"

# Follow logs (this will keep running until interrupted)
sudo docker compose logs -f
