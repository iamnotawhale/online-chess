#!/bin/bash
echo "Stopping frontend..."
lsof -ti:5173 | xargs -r kill 2>/dev/null
echo "Frontend stopped"
