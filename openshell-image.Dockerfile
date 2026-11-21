FROM nvcr.io/nvidia/base/ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://opencode.ai/update/api/latest/cli/opencode/opencode-linux-x64-baseline.tar.gz -o /tmp/opencode.tar.gz \
 && tar -xzf /tmp/opencode.tar.gz -C /usr/local/bin opencode \
 && rm -f /tmp/opencode.tar.gz \
 && chmod 0755 /usr/local/bin/opencode \
 && opencode --version

RUN apt-get update \
 && apt-get install -y --no-install-recommends nodejs npm \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g pnpm@12.22.0 \
 && pnpm --version \
 && pnx --version \
 && pnpx --version
