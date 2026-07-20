export interface SuperstoreRecord {
  [key: string]: unknown
  province: string
  city: string
  type: string
  sub_type: string
  channel: string
  segment: string
  ship_mode: string
  year: number
  quarter: string
  month: string
  number: number
  sales: number
  profit: number
  discount: number
  quantity: number
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

const channels = ['线上', '门店', '经销商'] as const
const segments = ['企业', '个人', '小型企业'] as const
const shipModes = ['标准', '快速', '当日达'] as const
const years = [2024, 2025] as const
const quarters = [
  ['Q1', ['1月', '2月', '3月']],
  ['Q2', ['4月', '5月', '6月']],
  ['Q3', ['7月', '8月', '9月']],
  ['Q4', ['10月', '11月', '12月']],
] as const

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]!
}

export function createSuperstoreData(scale = 1): SuperstoreRecord[] {
  const data: SuperstoreRecord[] = []
  let i = 0
  for (let s = 0; s < scale; s++) {
    for (const [province, cities] of provinces) {
      for (const city of cities) {
        for (const [type, subs] of types) {
          for (const sub of subs) {
            const channel = pick(channels, i)
            const segment = pick(segments, i + 1)
            const ship_mode = pick(shipModes, i + 2)
            const year = pick(years, i)
            const [quarter, months] = pick(quarters, i + 3)
            const month = pick(months, i)
            const quantity = (i % 12) + 1
            const unit = 20 + (i % 80)
            const discount = ((i % 5) * 5) / 100
            const sales = Math.round(quantity * unit * (1 - discount))
            const profit = Math.round(sales * (0.08 + (i % 7) * 0.02))
            data.push({
              province,
              city,
              type,
              sub_type: sub,
              channel,
              segment,
              ship_mode,
              year,
              quarter,
              month,
              number: Math.round(Math.random() * 1000) + 1,
              sales,
              profit,
              discount,
              quantity,
            })
            i += 1
          }
        }
      }
    }
  }
  return data
}
