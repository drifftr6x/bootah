# Build stage
FROM golang:1.22 AS build
WORKDIR /src
COPY src/server /src
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/bootah-server .

# Runtime
FROM gcr.io/distroless/base-debian12
WORKDIR /app
COPY --from=build /out/bootah-server /app/bootah-server
COPY webui /app/webui
VOLUME ["/app/data"]
ENV BOOTAH_WEB_ROOT=/app/webui
ENV BOOTAH_DB_PATH=/app/data/bootah.db
ENV BOOTAH_IMAGES_DIR=/app/data/images
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/bootah-server"]
