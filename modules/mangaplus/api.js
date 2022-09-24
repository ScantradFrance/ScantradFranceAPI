import protobuf from 'protobufjs'

const api_url = 'https://jumpg-webapi.tokyo-cdn.com/api/manga_viewer'
const api_params = 'split=no&img_quality=high'
const proto_path = './modules/mangaplus/mangaplus.proto'

export async function decrypteImage(url, key) {
  const data = await fetch(url).then(async res => { if (!res.ok) { throw new Error('Failed to fetch') } else { return Buffer.from(await res.arrayBuffer()) } })
  const k = Buffer.from(key, 'hex')
  const a = k.length
  for (let s = 0; s < data.length; s++) data[s] ^= k[s % a]
  return data
}

export async function getPages(chapter_id) {
  const buf = await fetch(api_url + `?${api_params}&chapter_id=${chapter_id}`).then(async res => { if (!res.ok) { throw new Error('Failed to fetch') } else { return Buffer.from(await res.arrayBuffer()) } })
  const root = await protobuf.load(proto_path)
  const ResponseProto = root.lookupType('Response')
  return ResponseProto.decode(buf).toJSON().success?.mangaViewer?.pages?.filter(p => p.mangaPage != null).map(p => p.mangaPage)
}
