#!/bin/bash

set -o errexit
set -o errtrace
set -o nounset
set -o pipefail

rm -rf src/rpc/*
bun proto-loader-gen-types --grpcLib=@grpc/grpc-js --outDir=src/rpc/ src/proto/*.proto