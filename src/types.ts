/**
 * Configuration structure for the base image versioner
 */
export interface BaseImageVersionerConfig {
  /**
   * Strategy to use for selecting versions
   * - 'latest': Only build the latest version
   * - 'all': Build all versions
   * - 'semver': Use semver range to filter versions
   */
  strategy?: 'latest' | 'all' | 'semver'

  /**
   * Semver range when strategy is 'semver' (e.g., '^1.0.0', '>=2.0.0 <3.0.0')
   */
  semverRange?: string

  /**
   * Maximum number of versions to build (optional limit)
   */
  maxVersions?: number

  /**
   * Additional build configurations for each version
   */
  builds?: BuildConfig[]
}

/**
 * Build configuration for a specific version
 */
export interface BuildConfig {
  /**
   * Name/identifier for this build configuration
   */
  name?: string

  /**
   * Path to the Dockerfile (relative to repository root)
   */
  dockerfilePath?: string

  /**
   * Docker build context path
   */
  contextPath?: string

  /**
   * Additional build arguments
   */
  buildArgs?: Record<string, string>

  /**
   * Tags to apply to the built image (can use {version} placeholder)
   */
  tags?: string[]
}

/**
 * Matrix entry for GitHub Actions
 */
export interface MatrixEntry {
  /**
   * Version of the base image
   */
  version: string

  /**
   * Name/identifier for this build
   */
  name: string

  /**
   * Path to the Dockerfile
   */
  dockerfilePath: string

  /**
   * Docker build context path
   */
  contextPath: string

  /**
   * Build arguments as key=value pairs
   */
  buildArgs: Record<string, string>

  /**
   * Tags for the image
   */
  tags: string[]
}

/**
 * Docker registry tag information
 */
export interface DockerTag {
  /**
   * Tag name
   */
  name: string

  /**
   * Last updated timestamp
   */
  lastUpdated?: string
}
