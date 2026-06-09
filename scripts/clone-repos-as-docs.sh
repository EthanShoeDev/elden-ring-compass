#!/usr/bin/env bash

mkdir -p docs/cloned-repos-as-docs ; cd docs/cloned-repos-as-docs

# We clone some of our deps so that coding agents can quickly
# grep for relevant docs, src code, and examples.

# Linting
gh repo clone oxc-project/oxc
gh repo clone oxc-project/oxc-project.github.io

# Build Tools
gh repo clone rolldown/tsdown
gh repo clone rolldown/rolldown
gh repo clone nitrojs/nitro
gh repo clone vitejs/vite

# Frameworks
gh repo clone TanStack/router # (this include code for tanstack start and router)
gh repo clone TanStack/tanstack.com

# Styling
gh repo clone tailwindlabs/tailwindcss
gh repo clone tailwindlabs/tailwindcss.com

# Elden Ring
gh repo clone EldenRingDatabase/erdb
gh repo clone ClayAmore/ER-Save-Editor

# Testing
gh repo clone vitest-dev/vitest