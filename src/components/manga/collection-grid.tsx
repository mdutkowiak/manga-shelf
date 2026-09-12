'use client'

import { useState } from 'react'
import { MangaCover } from './manga-cover'
import { VolumeDetailModal, VolumeDetailData } from './volume-detail-modal'
import { toggleVolumeInCollection } from '@/lib/actions/manga'

export interface VolumeWithManga {
  id: string
  volumeNumber: number
  coverImage: string | null
  customCoverUrl: string | null
  pricePLN: number | null
  description?: string | null
  isbn?: string | null
  manga: {
    id: string
    title: string
    defaultCover: string | null
    customCoverUrl: string | null
    publisher: {
      name: string
    } | null
  }
  collection?: {
    status: string
    purchasePrice: number | null
    userRating?: number | null
    notes?: string | null
  } | null
}

interface CollectionGridProps {
  volumes: VolumeWithManga[]
  userId: string
}

export function CollectionGrid({ volumes, userId }: CollectionGridProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedVolume, setSelectedVolume] = useState<VolumeDetailData | null>(null)

  const handleToggle = async (volumeId: string) => {
    return toggleVolumeInCollection(userId, volumeId)
  }

  const handleOpenDetail = (vol: VolumeWithManga) => {
    setSelectedVolume({
      id: vol.id,
      mangaId: vol.manga.id,
      volumeNumber: vol.volumeNumber,
      title: vol.manga.title,
      coverUrl: vol.customCoverUrl || vol.coverImage || vol.manga.customCoverUrl || vol.manga.defaultCover || '',
      publisher: vol.manga.publisher?.name || 'Waneko',
      pricePLN: vol.pricePLN || 34.99,
      isbn: vol.isbn,
      description: vol.description,
      status: vol.collection?.status || 'NONE',
      purchasePrice: vol.collection?.purchasePrice,
      userRating: vol.collection?.userRating,
      notes: vol.collection?.notes,
    })
    setModalOpen(true)
  }

  return (
    <>
      <VolumeDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        volumeData={selectedVolume}
        onSave={() => {
          if (selectedVolume?.id) {
            handleToggle(selectedVolume.id)
          }
        }}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-6">
        {volumes.map((volume) => (
          <div key={volume.id} onClick={() => handleOpenDetail(volume)} className="cursor-pointer">
            <MangaCover
              id={volume.id}
              title={volume.manga.title}
              coverUrl={volume.coverImage || volume.manga.defaultCover}
              customCoverUrl={volume.customCoverUrl || volume.manga.customCoverUrl}
              volumeNumber={volume.volumeNumber}
              isOwned={volume.collection?.status === 'OWNED' || volume.collection?.status === 'READ'}
              status={volume.collection?.status}
              purchasePrice={volume.collection?.purchasePrice}
              onToggle={handleToggle}
            />
          </div>
        ))}
      </div>
    </>
  )
}
