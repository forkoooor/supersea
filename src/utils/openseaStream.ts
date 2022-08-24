import {
  EventType,
  ItemListedEvent,
  ItemSoldEvent,
  OpenSeaStreamClient,
  // @ts-ignore
} from '@opensea/stream-js'
import { Event } from '../components/Activity/ActivityEvent'
import { Chain, fetchRemoteConfig } from './api'

class OpenSeaStream extends EventTarget {
  client: OpenSeaStreamClient | null = null
  events: Event[] = []
  saleEvents: Event[] = []
  listingEvents: Event[] = []
  activeStreams: Record<string, () => void> = {}

  handleEvent(event: ItemSoldEvent | ItemListedEvent) {
    const [chain, contractAddress, tokenId] = event.payload.item.nft_id.split(
      '/',
    )

    const formattedEvent: Event = {
      listingId: `${event.event_type}:${event.payload.item.nft_id}:${event.sent_at}`,
      tokenId,
      contractAddress,
      sellerAddress: event.payload.maker.address,
      blockExplorerLink: event.payload.transaction
        ? `https://etherscan.io/tx/${event.payload.transaction.hash}`
        : undefined,
      chain: chain as Chain,
      name: event.payload.item.metadata.name || `#${tokenId}`,
      image: event.payload.item.metadata.image_url,
      price:
        event.event_type === 'item_sold'
          ? (event as ItemSoldEvent).payload.sale_price
          : (event as ItemListedEvent).payload.base_price,
      currency: event.payload.payment_token.symbol,
      timestamp: event.payload.event_timestamp.split('+')[0],
      eventType: event.event_type === 'item_sold' ? 'SUCCESSFUL' : 'CREATED',
    }

    this.events = [formattedEvent, ...this.events].slice(0, 50)
    if (formattedEvent.eventType === 'SUCCESSFUL') {
      this.saleEvents = [formattedEvent, ...this.saleEvents].slice(0, 50)
    } else {
      this.listingEvents = [formattedEvent, ...this.listingEvents].slice(0, 50)
    }

    this.dispatchEvent(
      new CustomEvent('eventAdded', { detail: formattedEvent }),
    )
  }

  async subscribe(collectionSlug: string) {
    if (!this.client) {
      const config = await fetchRemoteConfig()
      this.client = new OpenSeaStreamClient({
        token: config.queryHeaders['x-api-key'],
      })
    }
    this.activeStreams[collectionSlug] = this.client.onEvents(
      collectionSlug,
      [EventType.ITEM_LISTED, EventType.ITEM_SOLD],
      // @ts-ignore
      this.handleEvent.bind(this),
    )
  }

  unsubscribe(collectionSlug: string) {
    this.activeStreams[collectionSlug]()
    delete this.activeStreams[collectionSlug]
  }

  syncActiveStreams(collectionSlugs: string[]) {
    const streamsToAdd = collectionSlugs.filter(
      (slug) => !this.activeStreams[slug],
    )
    const streamsToRemove = Object.keys(this.activeStreams).filter(
      (slug) => !collectionSlugs.includes(slug),
    )
    streamsToAdd.forEach((slug) => this.subscribe(slug))
    streamsToRemove.forEach((slug) => this.unsubscribe(slug))
  }

  getEvents(type: 'ALL' | 'CREATED' | 'SUCCESSFUL') {
    if (type === 'CREATED') return this.listingEvents
    if (type === 'SUCCESSFUL') return this.saleEvents

    return this.events
  }
}

export default new OpenSeaStream()
