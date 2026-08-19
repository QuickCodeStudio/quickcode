#!/bin/bash

echo "🧽 Cleaning old report..."
rm -rf coverage-report

echo "🧪 Running tests with coverage..."

dotnet test ./src/QuickCode.Quickcode.sln \
  /p:CollectCoverage=true \
  /p:Exclude="[*.Dtos]*" \
  /p:CoverletOutputFormat=cobertura \
  /p:CoverletOutput=./TestResults/

echo "📊 Generating coverage report..."

reportgenerator \
  -reports:**/TestResults/**/coverage.cobertura.xml \
  -targetdir:coverage-report \
  -reporttypes:Html \
  "-assemblyfilters:-QuickCode.Quickcode.Domain.Shared.Abstractions*;-QuickCode.Quickcode.Portal*;-QuickCode.Quickcode.Gateway*;"

echo "✅ Report generated in ./coverage-report/index.html"