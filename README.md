# Docker Base Image Version CI Matrix Action

[![GitHub Super-Linter](https://github.com/iwf-web/docker-image-version-matrix-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/iwf-web/docker-image-version-matrix-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/iwf-web/docker-image-version-matrix-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/iwf-web/docker-image-version-matrix-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/iwf-web/docker-image-version-matrix-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/iwf-web/docker-image-version-matrix-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

A GitHub Action that automatically generates a build matrix based on Docker base
image versions. Perfect for maintaining Docker images that need to support
multiple versions of a base image.

## Features

- 🔍 **Automatic Version Discovery**: Fetches available versions from Docker Hub
- 🎯 **Flexible Version Selection**: Support for latest, all, or semantic
  version ranges
- 🔧 **Configurable Builds**: Define multiple build configurations with
  different Dockerfiles and build arguments
- 📦 **Matrix Output**: Generates GitHub Actions matrix for parallel builds
- 🚀 **Easy Integration**: Simple YAML configuration

## Quick Start

### Basic Usage

```yaml
name: Build Docker Images

on:
  push:
    branches:
      - main

jobs:
  generate-matrix:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.generate.outputs.matrix }}
    steps:
      - uses: actions/checkout@v6
      - name: Generate build matrix
        id: generate
        uses: iwf-web/docker-image-version-matrix-action@v1
        with:
          base-image: 'verdaccio/verdaccio'

  build:
    needs: generate-matrix
    runs-on: ubuntu-latest
    strategy:
      matrix: ${{ fromJson(needs.generate-matrix.outputs.matrix) }}
    steps:
      - uses: actions/checkout@v6
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v5
        with:
          context: ${{ matrix.contextPath }}
          file: ${{ matrix.dockerfilePath }}
          tags: ${{ join(matrix.tags, ',') }}
```

## Configuration

### Action Inputs

| Input           | Description                                                             | Required | Default                            |
| --------------- | ----------------------------------------------------------------------- | -------- | ---------------------------------- |
| `base-image`    | The base Docker image (e.g., `verdaccio/verdaccio`)                     | Yes      | -                                  |
| `config-path`   | Path to the configuration YAML file                                     | No       | `.github/base-image-versioner.yml` |
| `version-range` | Version range override (e.g., `"latest"`, `"all"`, `"^1"`, `"^1\|^2"`). | No       | -                                  |

### Action Outputs

| Output   | Description                                                   |
| -------- | ------------------------------------------------------------- |
| `matrix` | JSON string containing the build matrix with all combinations |

### Configuration File

Create a `.github/base-image-versioner.yml` file in your repository:

```yaml
# Strategy: 'latest', 'all', or 'semver'
strategy: latest

# Semver range (when strategy is 'semver')
semverRange: '^1.0.0'

# Maximum number of versions to build
maxVersions: 5

# Build configurations
builds:
  - name: default
    dockerfilePath: Dockerfile
    contextPath: .
    buildArgs:
      NODE_ENV: production
    tags:
      - '{version}'
      - 'latest'

  - name: alpine
    dockerfilePath: Dockerfile.alpine
    contextPath: .
    buildArgs:
      VARIANT: alpine
    tags:
      - '{version}-alpine'
      - 'alpine'
```

### Version Selection Strategies

#### Latest (Default)

Build only the most recent version:

```yaml
strategy: latest
```

#### All Versions

Build all available versions:

```yaml
strategy: all
maxVersions: 10 # Optional limit
```

#### Semantic Version Range

Build versions matching a semver range:

```yaml
strategy: semver
semverRange: '^1.0.0' # All 1.x.x versions
```

```yaml
strategy: semver
semverRange: '>=2.0.0 <3.0.0' # All 2.x.x versions
```

#### Multiple Version Ranges

Use pipe-separated ranges:

```yaml
strategy: semver
semverRange: '^1|^2' # All 1.x.x and 2.x.x versions
```

Or override via workflow input:

```yaml
with:
  base-image: 'node'
  version-range: '^18|^20|^22'
```

## Examples

### Example 1: Building Latest Version Only

```yaml
# .github/base-image-versioner.yml
strategy: latest
builds:
  - name: default
    dockerfilePath: Dockerfile
    tags:
      - '{version}'
      - 'latest'
```

### Example 2: Multiple Variants

```yaml
# .github/base-image-versioner.yml
strategy: semver
semverRange: '^6'
builds:
  - name: default
    dockerfilePath: Dockerfile
    tags:
      - '{version}'

  - name: alpine
    dockerfilePath: Dockerfile.alpine
    buildArgs:
      VARIANT: alpine
    tags:
      - '{version}-alpine'

  - name: slim
    dockerfilePath: Dockerfile.slim
    buildArgs:
      VARIANT: slim
    tags:
      - '{version}-slim'
```

### Example 3: Manual Workflow Trigger

```yaml
name: Build Docker Images

on:
  workflow_dispatch:
    inputs:
      version-range:
        description: 'Version range (e.g., "latest", "all", "^1|^2")'
        required: false
        default: 'latest'

jobs:
  generate-matrix:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.generate.outputs.matrix }}
    steps:
      - uses: actions/checkout@v6
      - uses: iwf-web/docker-image-version-matrix-action@v1
        id: generate
        with:
          base-image: 'verdaccio/verdaccio'
          version-range: ${{ github.event.inputs.version-range }}
```

## Matrix Output Format

The action outputs a JSON matrix in this format:

```json
{
  "include": [
    {
      "version": "1.2.3",
      "name": "default",
      "dockerfilePath": "Dockerfile",
      "contextPath": ".",
      "buildArgs": {
        "BASE_IMAGE_VERSION": "1.2.3",
        "BASE_IMAGE": "verdaccio/verdaccio",
        "NODE_ENV": "production"
      },
      "tags": ["1.2.3", "latest"]
    }
  ]
}
```

## Development

### Initial Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Bundle the TypeScript:

   ```bash
   pnpm run bundle
   ```

3. Run tests:

   ```bash
   pnpm test
   ```

### Making Changes

1. Edit TypeScript files in `src/`
2. Run `pnpm run bundle` to compile
3. Run `pnpm test` to ensure tests pass
4. Commit both `src/` and `dist/` changes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt)
file for details.
