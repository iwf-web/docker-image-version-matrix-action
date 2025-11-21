import * as core from '@actions/core'
import * as httpClient from '@actions/http-client'
import type { DockerTag } from './types.js'

/**
 * Docker Hub API response for tags
 */
interface DockerHubTagsResponse {
  count: number
  next: string | null
  previous: string | null
  results: Array<{
    name: string
    last_updated: string
    tag_status: string
    digest: string
  }>
}

/**
 * Fetch available tags for a Docker image from Docker Hub
 *
 * @param imageName - The Docker image name (e.g., 'verdaccio/verdaccio' or 'library/node')
 * @returns Array of available tags
 */
export async function fetchDockerTags(imageName: string): Promise<DockerTag[]> {
  core.info(`Fetching tags for Docker image: ${imageName}`)

  const client = new httpClient.HttpClient('docker-image-version-action', [], {
    allowRetries: true,
    maxRetries: 3
  })

  const tags: DockerTag[] = []
  let url = buildDockerHubUrl(imageName)
  let page = 0

  try {
    // Fetch all pages of tags
    while (url && page < 100) {
      // Safety limit of 100 pages
      page++
      core.debug(`Fetching page ${page}: ${url}`)

      const response = await client.getJson<DockerHubTagsResponse>(url)

      if (!response.result) {
        throw new Error(`Failed to fetch tags: No result returned`)
      }

      const { results, next } = response.result

      for (const tag of results) {
        // Only include active tags
        if (tag.tag_status === 'active') {
          tags.push({
            name: tag.name,
            lastUpdated: tag.last_updated
          })
        }
      }

      url = next || ''
    }

    core.info(`Found ${tags.length} tags for ${imageName}`)
    return tags
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to fetch Docker tags for ${imageName}: ${error.message}`
      )
    }
    throw error
  }
}

/**
 * Build the Docker Hub API URL for fetching tags
 *
 * @param imageName - The Docker image name
 * @returns Docker Hub API URL
 */
function buildDockerHubUrl(imageName: string): string {
  // Handle official images (e.g., 'node', 'alpine')
  const parts = imageName.split('/')
  const repository = parts.length === 1 ? `library/${parts[0]}` : imageName

  return `https://hub.docker.com/v2/repositories/${repository}/tags?page_size=100`
}

/**
 * Filter tags to only include semantic version tags
 * Excludes tags like 'latest', 'alpine', etc.
 *
 * @param tags - Array of Docker tags
 * @returns Filtered array of semantic version tags
 */
export function filterSemanticVersionTags(tags: DockerTag[]): DockerTag[] {
  // Regex to match semantic versions (with optional prefixes and suffixes)
  // Matches: 1.0.0, v1.0.0, 1.0, 1.0.0-alpha, 1.0.0-alpine, etc.
  const semverRegex = /^v?\d+(\.\d+)?(\.\d+)?(-[\w.]+)?$/

  return tags.filter((tag) => {
    const cleaned = tag.name.split('-')[0] // Take only the version part before first dash
    return semverRegex.test(cleaned) || semverRegex.test(tag.name)
  })
}

/**
 * Get the latest tag from a list of tags
 *
 * @param tags - Array of Docker tags
 * @returns The latest tag, or undefined if no tags
 */
export function getLatestTag(tags: DockerTag[]): DockerTag | undefined {
  if (tags.length === 0) {
    return undefined
  }

  // Sort by last updated date (most recent first)
  const sorted = [...tags].sort((a, b) => {
    if (!a.lastUpdated || !b.lastUpdated) return 0
    return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  })

  return sorted[0]
}
