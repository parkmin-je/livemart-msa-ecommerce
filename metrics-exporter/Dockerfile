# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod ./
RUN go mod download && go mod tidy

# Build binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o metrics-exporter .

# Runtime stage
FROM gcr.io/distroless/static:nonroot

WORKDIR /app
COPY --from=builder /app/metrics-exporter .

EXPOSE 9100

ENTRYPOINT ["/app/metrics-exporter"]
