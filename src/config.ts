import * as fs from 'fs'
import * as yaml from 'yaml'
import * as core from '@actions/core'
import type { BaseImageVersionerConfig } from './types.js'

/**
 * Load and parse the configuration file
 *
 * @param configPath - Path to the configuration file
 * @returns Parsed configuration object
 */
export async function loadConfig(
  configPath: string
): Promise<BaseImageVersionerConfig> {
  core.info(`Loading configuration from: ${configPath}`)

  try {
    // Check if file exists
    if (!fs.existsSync(configPath)) {
      core.warning(
        `Configuration file not found at ${configPath}, using defaults`
      )
      return getDefaultConfig()
    }

    // Read and parse YAML file
    const fileContent = fs.readFileSync(configPath, 'utf8')
    const config = yaml.parse(fileContent) as BaseImageVersionerConfig

    // Validate and apply defaults
    return validateAndNormalizeConfig(config)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to load configuration from ${configPath}: ${error.message}`
      )
    }
    throw error
  }
}

/**
 * Get default configuration
 *
 * @returns Default configuration object
 */
export function getDefaultConfig(): BaseImageVersionerConfig {
  return {
    strategy: 'latest',
    builds: [
      {
        name: 'default',
        dockerfilePath: 'Dockerfile',
        contextPath: '.',
        buildArgs: {},
        tags: ['{version}', 'latest']
      }
    ]
  }
}

/**
 * Validate and normalize the configuration
 *
 * @param config - Configuration object to validate
 * @returns Validated and normalized configuration
 */
function validateAndNormalizeConfig(
  config: BaseImageVersionerConfig
): BaseImageVersionerConfig {
  const normalized: BaseImageVersionerConfig = {
    strategy: config.strategy || 'latest',
    semverRange: config.semverRange,
    maxVersions: config.maxVersions,
    builds: config.builds || []
  }

  // Validate strategy
  if (!['latest', 'all', 'semver'].includes(normalized.strategy!)) {
    throw new Error(
      `Invalid strategy: ${normalized.strategy}. Must be one of: latest, all, semver`
    )
  }

  // Validate semver range if strategy is semver
  if (normalized.strategy === 'semver' && !normalized.semverRange) {
    throw new Error('semverRange is required when strategy is "semver"')
  }

  // Validate maxVersions if provided
  if (normalized.maxVersions !== undefined && normalized.maxVersions < 1) {
    throw new Error('maxVersions must be greater than 0')
  }

  // If no builds are specified, use default
  if (!normalized.builds || normalized.builds.length === 0) {
    normalized.builds = getDefaultConfig().builds!
  }

  // Normalize each build configuration
  normalized.builds = normalized.builds.map((build, index) => ({
    name: build.name || `build-${index}`,
    dockerfilePath: build.dockerfilePath || 'Dockerfile',
    contextPath: build.contextPath || '.',
    buildArgs: build.buildArgs || {},
    tags: build.tags || ['{version}']
  }))

  return normalized
}

/**
 * Merge configuration with version range override
 *
 * @param config - Base configuration
 * @param versionRange - Version range override from action input
 * @returns Merged configuration
 */
export function mergeConfigWithVersionRange(
  config: BaseImageVersionerConfig,
  versionRange: string
): BaseImageVersionerConfig {
  if (!versionRange) {
    return config
  }

  const merged = { ...config }

  // Parse version range input
  if (versionRange === 'latest') {
    merged.strategy = 'latest'
    merged.semverRange = undefined
  } else if (versionRange === 'all') {
    merged.strategy = 'all'
    merged.semverRange = undefined
  } else {
    // Assume it's a semver range
    merged.strategy = 'semver'
    merged.semverRange = versionRange
  }

  core.info(
    `Version range override applied: ${versionRange} (strategy: ${merged.strategy})`
  )

  return merged
}
