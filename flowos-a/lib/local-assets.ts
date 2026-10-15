import type { AssetRecord } from '@/lib/data'

const databaseName = 'flowos-local-assets'
const storeName = 'files'

type StoredAsset = { record: AssetRecord; file: File }

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'record.id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (error: unknown) => void) => void): Promise<T> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode)
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => { database.close(); reject(transaction.error) }
    action(transaction.objectStore(storeName), resolve, reject)
  })
}

export async function saveLocalAsset(file: File): Promise<AssetRecord> {
  const type = file.type.startsWith('image/') ? '图像' : file.type.startsWith('video/') ? '视频' : file.type.startsWith('audio/') ? '音频' : file.type === 'application/pdf' ? '文档' : '设计'
  const randomId = [...crypto.getRandomValues(new Uint8Array(16))].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const record: AssetRecord = { id: `local-${randomId}`, name: file.name, type, size: `${(file.size / 1024 / 1024).toFixed(1)} MB`, source: '本地上传' }
  return transact('readwrite', (store, resolve, reject) => {
    const request = store.put({ record, file } satisfies StoredAsset)
    request.onsuccess = () => resolve(record)
    request.onerror = () => reject(request.error)
  })
}

export async function listLocalAssets(): Promise<AssetRecord[]> {
  return transact('readonly', (store, resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve((request.result as StoredAsset[]).map(({ record }) => record))
    request.onerror = () => reject(request.error)
  })
}

export async function getLocalAsset(id: string): Promise<StoredAsset | undefined> {
  return transact('readonly', (store, resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result as StoredAsset | undefined)
    request.onerror = () => reject(request.error)
  })
}
