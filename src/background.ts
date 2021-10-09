/* global chrome */
import _ from 'lodash'

let savedOpenSeaHeaders: Record<string, string> = {}
const HEADERS_OF_INTEREST = [
  'Authorization',
  'X-API-KEY',
  'X-VIEWER-ADDRESS',
  'X-BUILD-ID',
]

// Capture API key headers from OpenSea for more favorable rate limits
// when performing custom graphql requests
chrome.webRequest.onBeforeSendHeaders.addListener(
  ({ requestHeaders, tabId }) => {
    if (requestHeaders && tabId) {
      const keyedHeaders = _.keyBy(requestHeaders, 'name')
      if (keyedHeaders['x-signed-query']?.value === 'SuperSea') {
        return {
          requestHeaders: requestHeaders.filter(
            ({ name }) => name !== 'x-signed-query',
          ),
        }
      }
      savedOpenSeaHeaders = HEADERS_OF_INTEREST.reduce<Record<string, string>>(
        (acc, header) => {
          acc[header] =
            keyedHeaders[header]?.value || savedOpenSeaHeaders[header]
          return acc
        },
        {},
      )
      chrome.storage.local.set({ openSeaHeaders: savedOpenSeaHeaders })
    }
  },
  { urls: ['https://api.opensea.io/*'] },
  ['requestHeaders'],
)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.method === 'fetch') {
    fetch(request.params.url)
      .then((res) => res.json())
      .then((res) => {
        sendResponse(res)
      })
  } else if (request.method === 'ping') {
    sendResponse('pong')
  }
  return true
})

chrome.webRequest.onResponseStarted.addListener(
  ({ responseHeaders }) => {
    const rateLimitHeader =
      responseHeaders &&
      responseHeaders.find(({ name }) => name === 'x-ratelimit-remaining')
    if (rateLimitHeader) {
      chrome.storage.local.set({
        openSeaRateLimitRemaining: +(rateLimitHeader.value || 0),
      })
    }
  },
  { urls: ['https://api.opensea.io/*'] },
  ['responseHeaders'],
)

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'https://nonfungible.tools/supersea' })
})
