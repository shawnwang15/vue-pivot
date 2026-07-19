import type { HierarchyType, TotalsAxisOptions } from '../types/options'
import type { LayoutNodeKind } from '../types/layout'
import type { PivotRecord } from '../types/data-cfg'

export interface DimNode {
  id: number
  value: string
  label: string
  field: string | null
  depth: number
  parentId: number | null
  children: number[]
  isLeaf: boolean
  kind: LayoutNodeKind
  expanded: boolean
  /** async placeholder */
  loading?: boolean
  path: string[]
}

export interface DimTree {
  rootId: number
  nodes: Map<number, DimNode>
  /** pathKey -> nodeId */
  pathIndex: Map<string, number>
  version: number
  nextId: number
}

export function pathKey(path: string[]): string {
  return path.map(encodeURIComponent).join('\u0001')
}

export function createDimTree(): DimTree {
  const root: DimNode = {
    id: 0,
    value: '',
    label: 'ROOT',
    field: null,
    depth: -1,
    parentId: null,
    children: [],
    isLeaf: false,
    kind: 'dimension',
    expanded: true,
    path: [],
  }
  return {
    rootId: 0,
    nodes: new Map([[0, root]]),
    pathIndex: new Map([['', 0]]),
    version: 1,
    nextId: 1,
  }
}

function ensureChild(
  tree: DimTree,
  parentId: number,
  field: string,
  value: string,
  label: string,
  kind: LayoutNodeKind = 'dimension',
): DimNode {
  const parent = tree.nodes.get(parentId)!
  const nextPath = [...parent.path, value]
  const key = pathKey(nextPath)
  const existing = tree.pathIndex.get(key)
  if (existing != null) return tree.nodes.get(existing)!

  const id = tree.nextId++
  const node: DimNode = {
    id,
    value,
    label,
    field,
    depth: parent.depth + 1,
    parentId,
    children: [],
    isLeaf: true,
    kind,
    expanded: false,
    path: nextPath,
  }
  parent.children.push(id)
  parent.isLeaf = false
  tree.nodes.set(id, node)
  tree.pathIndex.set(key, id)
  return node
}

export function buildDimTreeFromRecords(options: {
  records: PivotRecord[]
  fields: string[]
  hierarchyType: HierarchyType
  expandDepth: number
  expandedPaths: string[][]
  totals?: TotalsAxisOptions
  grandTotalLabel?: string
}): DimTree {
  const tree = createDimTree()
  const { records, fields, expandDepth, expandedPaths, totals } = options

  for (const record of records) {
    let parentId = tree.rootId
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]!
      const raw = record[field]
      const value = raw == null ? '(null)' : String(raw)
      const node = ensureChild(tree, parentId, field, value, value)
      parentId = node.id
    }
  }

  // Apply expand depth
  for (const node of tree.nodes.values()) {
    if (node.id === tree.rootId) {
      node.expanded = true
      continue
    }
    node.expanded = node.depth < expandDepth
  }

  for (const path of expandedPaths) {
    const id = tree.pathIndex.get(pathKey(path))
    if (id == null) continue
    let cur: DimNode | undefined = tree.nodes.get(id)
    while (cur) {
      cur.expanded = true
      cur = cur.parentId == null ? undefined : tree.nodes.get(cur.parentId)
    }
  }

  if (totals?.showSubTotals && totals.subTotalsDimensions?.length) {
    insertSubTotals(tree, fields, totals)
  }
  if (totals?.showGrandTotals) {
    const label = totals.label ?? options.grandTotalLabel ?? 'Total'
    ensureChild(tree, tree.rootId, '__grand_total__', '__grand_total__', label, 'grandTotal')
  }

  tree.version++
  return tree
}

function insertSubTotals(tree: DimTree, fields: string[], totals: TotalsAxisOptions): void {
  const dims = new Set(totals.subTotalsDimensions ?? [])
  const nodes = [...tree.nodes.values()]
  for (const node of nodes) {
    if (node.kind !== 'dimension' || node.field == null) continue
    if (!dims.has(node.field)) continue
    if (node.children.length === 0) continue
    // Avoid duplicate
    const subPath = [...node.path, '__sub_total__']
    if (tree.pathIndex.has(pathKey(subPath))) continue
    ensureChild(tree, node.id, node.field, '__sub_total__', totals.subLabel ?? 'Subtotal', 'subTotal')
  }
  void fields
}

export function getVisibleLeaves(
  tree: DimTree,
  hierarchyType: HierarchyType,
): DimNode[] {
  const out: DimNode[] = []
  const root = tree.nodes.get(tree.rootId)!

  const walk = (node: DimNode) => {
    if (node.id !== tree.rootId && node.kind !== 'dimension' && node.kind !== 'grandTotal' && node.kind !== 'subTotal') {
      // still include totals
    }
    const isVisibleNode = node.id !== tree.rootId
    if (hierarchyType === 'grid') {
      if (node.isLeaf || node.kind === 'grandTotal' || node.kind === 'subTotal') {
        if (isVisibleNode) out.push(node)
      } else {
        for (const cid of node.children) walk(tree.nodes.get(cid)!)
      }
      return
    }

    // tree / grid-tree: show expanded parents as rows too for tree; grid-tree shows leaves + expanded branches
    if (hierarchyType === 'tree') {
      if (isVisibleNode) out.push(node)
      if (node.expanded) {
        for (const cid of node.children) walk(tree.nodes.get(cid)!)
      }
      return
    }

    // grid-tree
    if (node.isLeaf || node.kind === 'grandTotal' || node.kind === 'subTotal') {
      if (isVisibleNode) out.push(node)
    } else if (node.expanded) {
      for (const cid of node.children) walk(tree.nodes.get(cid)!)
    } else if (isVisibleNode) {
      out.push(node)
    }
  }

  walk(root)
  return out
}

export function setExpanded(tree: DimTree, path: string[], expanded: boolean): DimTree {
  const id = tree.pathIndex.get(pathKey(path))
  if (id == null) return tree
  const node = tree.nodes.get(id)
  if (!node) return tree
  node.expanded = expanded
  tree.version++
  return tree
}

export function getAncestors(tree: DimTree, nodeId: number): number[] {
  const ids: number[] = []
  let cur = tree.nodes.get(nodeId)
  while (cur && cur.parentId != null) {
    ids.push(cur.parentId)
    cur = tree.nodes.get(cur.parentId)
  }
  return ids
}
