FROM golang:1.20.0 AS builder
ENV GO111MODULE=on \
    GOPROXY=https://goproxy.cn
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o justmysocks .

FROM alpine:3.19
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk update && \
    apk --no-cache add ca-certificates tzdata
WORKDIR /app/
COPY --from=builder /app/justmysocks .

# Expose port 8080 to the outside world
EXPOSE 8080

# Command to run the executable
# CMD ["./justmysocks"]
CMD ["./justmysocks", "-service-id 123456", "-token 12345678-1234-1234-1234-123456789012"]