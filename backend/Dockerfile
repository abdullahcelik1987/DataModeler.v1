ARG BUILD_DATE=unknown
ARG VCS_REF=unknown
ARG VERSION=1.0.0

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS builder

WORKDIR /src

# Set build arguments
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown
ARG VERSION=1.0.0

# Copy project files
COPY ["backend/DataModeler.API.csproj", "backend/"]
COPY ["backend/", "backend/"]

# Restore dependencies
RUN dotnet restore "backend/DataModeler.API.csproj" \
    && dotnet build "backend/DataModeler.API.csproj" -c Release -o /app/build --no-restore

# Publish
RUN dotnet publish "backend/DataModeler.API.csproj" \
    -c Release \
    -o /app/publish \
    -p:PublishReadyToRun=false \
    -p:PublishSingleFile=false \
    -p:PublishTrimmed=false \
    -p:DebugType=embedded

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

# Re-declare build args for this stage (required for LABEL expansion)
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown
ARG VERSION=1.0.0

# Install additional dependencies for production
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

# Copy published application from builder
COPY --from=builder /app/publish .
COPY --chown=appuser:appgroup . .

# Set environment variables
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:8080 \
    DOTNET_EnableDiagnostics=0 \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
    DOTNET_TieredCompilation=1 \
    DOTNET_TieredCompilationQuickJit=1 \
    COMPlus_EnableDiagnostics=0

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Change to non-root user
USER appuser

# Run the application
CMD ["dotnet", "DataModeler.API.dll"]

# Add metadata labels
LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.title="DataModeler Backend" \
      org.opencontainers.image.description="Production-grade data modeling platform backend" \
      org.opencontainers.image.vendor="DataModeler"
