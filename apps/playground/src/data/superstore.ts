export interface SuperstoreRecord {
  province: string
  city: string
  type: string
  sub_type: string
  number: number
}

const provinces = [
  ['浙江', ['杭州', '舟山', '宁波']],
  ['吉林', ['长春', '吉林市', '延边']],
  ['广东', ['广州', '深圳', '珠海']],
  ['四川', ['成都', '绵阳', '乐山']],
] as const

const types = [
  ['办公用品', ['笔', '纸张', '文件夹']],
  ['家具', ['桌子', '沙发', '书架']],
  ['技术', ['手机', '电脑', '显示器']],
] as const

export function createSuperstoreData(scale = 1): SuperstoreRecord[] {
  const data: SuperstoreRecord[] = []
  for (let s = 0; s < scale; s++) {
    for (const [province, cities] of provinces) {
      for (const city of cities) {
        for (const [type, subs] of types) {
          for (const sub of subs) {
            data.push({
              province,
              city,
              type,
              sub_type: sub,
              number: Math.round(Math.random() * 1000) + 1,
            })
          }
        }
      }
    }
  }
  return data
}
