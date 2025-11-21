import * as core from '@actions/core'
import * as semver from 'semver'
import type { DockerTag } from './types.js'

/**
 * Filter versions based on strategy
 *
 * @param tags - Array of Docker tags
 * @param strategy - Filtering strategy ('latest', 'all', or 'semver')
 * @param semverRange - Semver range (required when strategy is 'semver')
 * @param maxVersions - Maximum number of versions to return (optional)
 * @returns Filtered array of version strings
 */
export function filterVersions(
  tags: DockerTag[],
  strategy: 'latest' | 'all' | 'semver',
  semverRange?: string,
  maxVersions?: number
): string[] {
  core.info(`Filtering versions with strategy: ${strategy}`)

  let filtered: DockerTag[] = []

  switch (strategy) {
    case 'latest':
      filtered = getLatestVersions(tags, 1)
      break

    case 'all':
      filtered = tags
      break

    case 'semver':
      if (!semverRange) {
        throw new Error('semverRange is required when strategy is "semver"')
      }
      filtered = filterBySemverRange(tags, semverRange)
      break

    default:
      throw new Error(`Invalid strategy: ${strategy}`)
  }

  // Apply maxVersions limit if specified
  if (maxVersions !== undefined && maxVersions > 0) {
    core.info(`Limiting to maximum of ${maxVersions} versions`)
    filtered = filtered.slice(0, maxVersions)
  }

  const versions = filtered.map((tag) => tag.name)
  core.info(`Filtered to ${versions.length} version(s): ${versions.join(', ')}`)

  return versions
}

/**
 * Get the latest N versions based on last updated date
 *
 * @param tags - Array of Docker tags
 * @param count - Number of latest versions to return
 * @returns Array of latest tags
 */
function getLatestVersions(tags: DockerTag[], count: number): DockerTag[] {
  // Sort by last updated date (most recent first)
  const sorted = [...tags].sort((a, b) => {
    if (!a.lastUpdated || !b.lastUpdated) return 0
    return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  })

  return sorted.slice(0, count)
}

/**
 * Filter versions by semver range
 *
 * @param tags - Array of Docker tags
 * @param range - Semver range (e.g., '^1.0.0', '>=2.0.0 <3.0.0')
 * @returns Filtered array of tags matching the range
 */
function filterBySemverRange(tags: DockerTag[], range: string): DockerTag[] {
  core.info(`Filtering by semver range: ${range}`)

  const filtered = tags.filter((tag) => {
    // Try to parse the tag as a semver version
    const version = cleanVersionString(tag.name)

    // Check if the version is valid semver
    if (!semver.valid(version)) {
      core.debug(`Skipping invalid semver: ${tag.name}`)
      return false
    }

    // Check if the version satisfies the range
    try {
      return semver.satisfies(version, range)
    } catch (error) {
      core.warning(`Failed to check semver range for ${tag.name}: ${error}`)
      return false
    }
  })

  return filtered
}

/**
 * Clean version string to make it semver compatible
 * Removes 'v' prefix and handles other common formats
 *
 * @param version - Raw version string
 * @returns Cleaned version string
 */
function cleanVersionString(version: string): string {
  // Remove 'v' prefix if present
  const cleaned = version.startsWith('v') ? version.slice(1) : version

  // Try to coerce to valid semver
  const coerced = semver.coerce(cleaned)
  if (coerced) {
    return coerced.version
  }

  return cleaned
}

/**
 * Parse multiple semver ranges separated by pipe (|)
 * Example: "^1|^2" means "^1.0.0 || ^2.0.0"
 *
 * @param rangeString - Range string with pipe separators
 * @returns Normalized semver range
 */
export function parsePipeDelimitedRange(rangeString: string): string {
  if (!rangeString.includes('|')) {
    return rangeString
  }

  // Split by pipe and join with semver OR operator
  const ranges = rangeString.split('|').map((r) => r.trim())
  return ranges.join(' || ')
}
