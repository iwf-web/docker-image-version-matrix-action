import * as core from '@actions/core'
import { loadConfig, mergeConfigWithVersionRange } from './config.js'
import {
  fetchDockerTags,
  filterSemanticVersionTags,
  getLatestTag
} from './docker-registry.js'
import type { BuildConfig, MatrixEntry } from './types.js'
import { filterVersions, parsePipeDelimitedRange } from './version-filter.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Get action inputs
    const baseImage = core.getInput('base-image', { required: true })
    const configPath =
      core.getInput('config-path', { required: false }) ||
      '.github/base-image-versioner.yml'
    const versionRangeInput = core.getInput('version-range', {
      required: false
    })

    core.info(`Base image: ${baseImage}`)
    core.info(`Config path: ${configPath}`)
    if (versionRangeInput) {
      core.info(`Version range: ${versionRangeInput}`)
    }

    // Load configuration
    let config = await loadConfig(configPath)

    // Apply version range override if provided
    if (versionRangeInput) {
      config = mergeConfigWithVersionRange(config, versionRangeInput)
    }

    // Fetch available Docker tags
    const allTags = await fetchDockerTags(baseImage)

    if (allTags.length === 0) {
      throw new Error(`No tags found for Docker image: ${baseImage}`)
    }

    // Filter to only semantic version tags
    const semverTags = filterSemanticVersionTags(allTags)

    if (semverTags.length === 0) {
      core.warning(
        'No semantic version tags found. Falling back to latest tag.'
      )
      const latest = getLatestTag(allTags)
      if (!latest) {
        throw new Error('No tags available')
      }
      const matrix = buildMatrix([latest.name], config, baseImage)
      core.setOutput('matrix', JSON.stringify({ include: matrix }))
      return
    }

    // Filter versions based on strategy
    let semverRange = config.semverRange
    if (config.strategy === 'semver' && semverRange) {
      semverRange = parsePipeDelimitedRange(semverRange)
    }

    const selectedVersions = filterVersions(
      semverTags,
      config.strategy!,
      semverRange,
      config.maxVersions
    )

    if (selectedVersions.length === 0) {
      throw new Error('No versions matched the specified criteria')
    }

    // Build matrix
    const matrix = buildMatrix(selectedVersions, config, baseImage)

    // Output matrix as JSON
    const matrixOutput = { include: matrix }
    core.setOutput('matrix', JSON.stringify(matrixOutput))

    core.info(`Generated matrix with ${matrix.length} configuration(s)`)
    core.info(`Matrix: ${JSON.stringify(matrixOutput, null, 2)}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

/**
 * Build the matrix from versions and configuration
 *
 * @param versions - Array of version strings
 * @param config - Configuration object
 * @param baseImage - Base image name
 * @returns Array of matrix entries
 */
function buildMatrix(
  versions: string[],
  config: { builds?: BuildConfig[] },
  baseImage: string
): MatrixEntry[] {
  const matrix: MatrixEntry[] = []

  for (const version of versions) {
    for (const build of config.builds || []) {
      const entry: MatrixEntry = {
        version,
        name: build.name || 'default',
        dockerfilePath: build.dockerfilePath || 'Dockerfile',
        contextPath: build.contextPath || '.',
        buildArgs: {
          BASE_IMAGE_VERSION: version,
          BASE_IMAGE: baseImage,
          ...(build.buildArgs || {})
        },
        tags: (build.tags || ['{version}']).map((tag: string) =>
          tag.replace('{version}', version)
        )
      }

      matrix.push(entry)
    }
  }

  return matrix
}
